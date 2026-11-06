/**
 * Settings page, in a real browser: load the built client bundle the way the
 * shell does (`window.__ModuleLoader__`), let apply() register its slot against a
 * fake slot registry, render the registered component with a fake form and click
 * through it.
 *
 *   node scripts/build-client.mjs && node test/ui.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
  .find(candidate => fs.existsSync(candidate))
if (CHROME === undefined) { console.error('ui test: no Chrome found'); process.exit(1) }

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8')
const react = read('node_modules/react/umd/react.production.min.js')
const reactDom = read('node_modules/react-dom/umd/react-dom.production.min.js')
const bundle = read('client/client.js')

const results = []
const check = (name, passed, detail) => {
  results.push({ name, passed })
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${passed || detail === undefined ? '' : `  — ${detail}`}`)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
const errors = []
page.on('pageerror', error => errors.push(String(error)))
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
await page.setContent('<!doctype html><html lang="zh"><body><div id="root"></div></body></html>')
await page.addScriptTag({ content: react })
await page.addScriptTag({ content: reactDom })

await page.evaluate((code) => {
  const React = window.React
  const jsx = (type, props, key) => React.createElement(type, key === undefined ? props : { ...props, key })
  window.__registry = {}
  window.__ModuleLoader__ = { load(entry) { window.__registry[entry.id] = entry } }
  const require = (name) => {
    if (name === 'react') return React
    if (name === 'react-dom' || name === 'react-dom/client') return window.ReactDOM
    if (name === 'react/jsx-runtime' || name === 'react/jsx-dev-runtime') return { jsx, jsxs: jsx, Fragment: React.Fragment }
    throw new Error(`unexpected require(${name})`)
  }
  // eslint-disable-next-line no-eval
  (0, eval)(code)
  const mod = window.__registry['dsh-small-toolkit'].factory(require)
  window.__mod = mod
  window.__registered = []
  window.__dicts = []
  const ctx = {
    effect: (fn) => fn(),
    locale: { register: (ns, dict) => { window.__dicts.push({ ns, zh: Object.keys(dict.zh).length, en: Object.keys(dict.en).length }); return () => {} } },
    slots: {
      inject: (name, factory) => { factory() },
      register: (options, component) => { window.__registered.push({ options, component }); return () => {} },
    },
  }
  mod.apply(ctx)
}, bundle)

const info = await page.evaluate(() => ({
  inject: window.__mod.inject,
  name: window.__mod.name,
  registered: window.__registered.map(entry => entry.options),
  dicts: window.__dicts,
}))
check('the bundle loads and exports name/inject/apply', info.name === 'dsh-small-toolkit-client' && info.inject.includes('slots'), JSON.stringify(info))
check('it registers the row config slot under the right key',
  info.registered.length === 1 && info.registered[0].name === 'plugins.row.config'
    && info.registered[0].key === 'dsh-small-toolkit#small-toolkit', JSON.stringify(info.registered))
check('it registers zh and en dictionaries with the same keys', info.dicts.length === 1 && info.dicts[0].zh === info.dicts[0].en, JSON.stringify(info.dicts))

/** Render the page component with a fake form; `calls` records every mutate. */
const mount = (stateInit) => page.evaluate((init) => {
  const React = window.React
  const root = document.getElementById('root')
  window.ReactDOM.unmountComponentAtNode?.(root)
  window.__calls = []
  const entry = window.__registered[0]
  const t = (key) => key
  const form = {
    state: init,
    mutate: (ops, revision) => { window.__calls.push({ ops, revision }); return Promise.resolve(true) },
  }
  window.__render = (nextState, view = 'page') => {
    window.ReactDOM.render(React.createElement(entry.component, { t, view, form: nextState === null ? undefined : { ...form, state: nextState } }), root)
  }
  window.__render(init)
}, stateInit)

const state = (value, extra = {}) => ({ status: 'ready', writable: true, revision: 1, value, ...extra })
const full = { keepAwake: { enabled: true }, taskNotify: { enabled: true, sound: true, notifyOnAborted: false, clickOpensApp: true, minDurationSec: 0 } }

await mount(state(full))
const switches = () => page.evaluate(() => [...document.querySelectorAll('[role="switch"]')].map(el => ({
  label: el.getAttribute('aria-label'), on: el.getAttribute('aria-checked') === 'true', disabled: el.disabled,
})))
let list = await switches()
check('five switches are drawn with their labels', list.length === 5 && list[0].label === 'keepAwake.title', JSON.stringify(list))
check('values come from the live config', list[0].on === true && list[1].on === true && list[3].on === false, JSON.stringify(list))

await page.click('[role="switch"][aria-label="keepAwake.title"]')
await page.waitForTimeout(150)
let calls = await page.evaluate(() => window.__calls)
check('flipping keepAwake sends one set op with the current revision',
  calls.length === 1 && calls[0].revision === 1
    && JSON.stringify(calls[0].ops) === JSON.stringify([{ op: 'set', path: ['keepAwake', 'enabled'], value: false }]), JSON.stringify(calls))
list = await switches()
check('the switch flips at once (optimistic)', list[0].on === false, JSON.stringify(list))

// A new revision from the host clears the optimistic copy and shows the truth.
await page.evaluate((v) => window.__render({ status: 'ready', writable: true, revision: 2, value: v }), { ...full, keepAwake: { enabled: false } })
list = await switches()
check('a new revision shows the confirmed value', list[0].on === false)

await page.click('[role="switch"][aria-label="taskNotify.aborted"]')
await page.waitForTimeout(100)
calls = await page.evaluate(() => window.__calls)
check('the aborted switch writes taskNotify.notifyOnAborted',
  JSON.stringify(calls.at(-1).ops) === JSON.stringify([{ op: 'set', path: ['taskNotify', 'notifyOnAborted'], value: true }]), JSON.stringify(calls.at(-1)))

await page.fill('input[type="number"]', '45')
await page.keyboard.press('Enter')
await page.waitForTimeout(150)
calls = await page.evaluate(() => window.__calls)
check('the minimum duration commits on Enter as a number',
  JSON.stringify(calls.at(-1).ops) === JSON.stringify([{ op: 'set', path: ['taskNotify', 'minDurationSec'], value: 45 }]), JSON.stringify(calls.at(-1)))
await page.fill('input[type="number"]', '99999')
await page.keyboard.press('Enter')
await page.waitForTimeout(150)
calls = await page.evaluate(() => window.__calls)
check('an out-of-range number is clamped (3600)', calls.at(-1).ops[0].value === 3600, JSON.stringify(calls.at(-1)))

// Turning the notification off dims its options.
await page.evaluate((v) => window.__render({ status: 'ready', writable: true, revision: 3, value: v }), { ...full, taskNotify: { ...full.taskNotify, enabled: false } })
list = await switches()
check('with the notification off its option switches are disabled',
  list[1].disabled === false && list.slice(2).every(item => item.disabled), JSON.stringify(list))

// Read-only and unavailable states.
await page.evaluate((v) => window.__render({ status: 'ready', writable: false, revision: 4, value: v }), full)
list = await switches()
check('a read-only configuration disables every switch', list.every(item => item.disabled), JSON.stringify(list))
await page.evaluate(() => window.__render(null))
const text = await page.evaluate(() => document.getElementById('root').textContent)
check('without a form it says the settings are unavailable', text === 'unavailable', text)
await page.evaluate(() => window.__render({ status: 'ready', writable: true, revision: 1, value: { ...{} } }, 'summary'))
const summary = await page.evaluate(() => document.getElementById('root').textContent)
check('the summary view is plain text', summary === 'summary', summary)

check('no page errors', errors.length === 0, errors.join(' | '))
await browser.close()
const failed = results.filter(result => !result.passed)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exitCode = failed.length === 0 ? 0 : 1
