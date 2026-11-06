#!/usr/bin/env node
/**
 * Builds client/client.js — the browser half dsh loads through
 * `window.__ModuleLoader__`. One esbuild bundle, react / react-dom / jsx-runtime
 * stay external (the shell hands them to the factory as `require`).
 *
 *   node scripts/build-client.mjs
 *
 * Safety: the output is built to a temp file, checked (loader banner, parses),
 * and only then renamed onto client/client.js, so a failed build can never leave
 * a broken file behind. Publish only while dsh is NOT running: a changed
 * client.js under a running dsh can fail the next reload.
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PLUGIN_ID = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).name
const OUT = path.join(ROOT, 'client', 'client.js')
const TMP = path.join(ROOT, 'client', '.client.build.js')

const BANNER = `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {
\tvar module = { exports: {} };
\tvar exports = module.exports;
\ttry {`
const FOOTER = `\t} catch (error) {
\t\t// A plugin must never be able to kill the whole boot: degrade to an inert module.
\t\tconsole.error('[${PLUGIN_ID}] client bundle failed to evaluate (inert this boot):', error);
\t\treturn { name: ${JSON.stringify(PLUGIN_ID)}, apply() {} };
\t}
\treturn module.exports;
}
});
`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
await esbuild.build({
  absWorkingDir: ROOT,
  entryPoints: ['src/client/index.jsx'],
  outfile: TMP,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"production"' },
  external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  banner: { js: BANNER },
  footer: { js: FOOTER },
})

const text = fs.readFileSync(TMP, 'utf8')
const problems = []
if (!text.startsWith(`${BANNER}\n`)) problems.push('loader banner is not the first line')
if (!text.includes('return module.exports;')) problems.push('factory does not return module.exports')
if (text.includes(ROOT)) problems.push('absolute build path leaked into the bundle')
try {
  new vm.Script(text, { filename: 'client.js' })
} catch (error) {
  problems.push(`bundle does not parse: ${error?.message ?? error}`)
}
if (problems.length > 0) {
  fs.rmSync(TMP, { force: true })
  console.error(`build-client: ${problems.join('; ')}`)
  process.exit(1)
}
fs.renameSync(TMP, OUT)
console.log(`build-client: client/client.js ${(fs.statSync(OUT).size / 1024).toFixed(1)} kB`)
