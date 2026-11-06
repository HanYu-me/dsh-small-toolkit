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
import { zh } from '../src/client/locale.js'

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
await page.setContent('<!doctype html><html lang="zh"><body style="margin:0;padding:24px;background:#1c1d21;color:#f5f6f7;font:14px -apple-system,system-ui,sans-serif"><div id="root"></div></body></html>')
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
  // Fake shell services: two workspaces (one with 12 conversations, to trigger the search box)
  // and a fake host rules endpoint backed by `window.__serverRules`.
  const sessionIds = ['a1', 'a2', 'a3', ...Array.from({ length: 12 }, (_, i) => `b${i + 1}`)]
  const byId = {}
  for (const id of sessionIds) byId[id] = { displayTitle: `对话 ${id}`, blank: false, updatedAt: 1000 - sessionIds.indexOf(id) }
  byId.sub1 = { displayTitle: 'sub', blank: false, origin: 'subagent', updatedAt: 1 }
  const fakeList = (snapshot) => ({ getSnapshot: () => snapshot, subscribe: () => () => {} })
  window.__serverRules = { workspaces: {} }
  window.__posts = []
  window.__failRules = false
  window.fetch = (url, init) => {
    if (window.__failRules) return Promise.reject(new Error('down'))
    if (init?.method === 'POST' && !String(url).includes('client-boot')) {
      const body = JSON.parse(init.body)
      window.__posts.push(body)
      window.__serverRules = body
    }
    return Promise.resolve(new Response(JSON.stringify({ rules: window.__serverRules }), { headers: { 'content-type': 'application/json' } }))
  }
  const ctx = {
    sessions: { list: fakeList({ ids: sessionIds, byId }) },
    workspaces: { list: fakeList({
      items: [
        { workspaceId: 'w1', title: '工作区一', sessionIds: ['a1', 'a2', 'a3'] },
        { workspaceId: 'w2', title: '工作区二', sessionIds: [...sessionIds.slice(3), 'sub1'] },
      ],
      archivedSessionIds: ['a3'],
    }) },
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
check('the bundle loads and exports name/inject/apply', info.name === 'dsh-small-toolkit-client' && info.inject.includes('slots') && info.inject.includes('workspaces'), JSON.stringify(info))
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
  const t = (key, params) => {
    const text = window.__dict?.[key] ?? key
    return params === undefined ? text : text.replace(/\{(\w+)\}/g, (_m, name) => params[name])
  }
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


// ---- notification rules: workspaces as the big unit, conversations as the small one ----
await mount(state(full))
await page.waitForSelector('[data-small-toolkit-rules]')
await page.waitForTimeout(200)
const wsRow = id => `[data-small-toolkit-workspace="${id}"]`
const counts = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-small-toolkit-workspace]')].map(el => [
  el.getAttribute('data-small-toolkit-workspace'), el.querySelector('span:last-of-type').textContent.replace(/\s/g, ''),
])))
let c = await counts()
check('both workspaces are listed with on/total counts (subagents and nothing else hidden)', c.w1 === '3/3' && c.w2 === '12/12', JSON.stringify(c))

// Workspace off as a whole.
await page.click(`${wsRow('w1')} input[type="checkbox"]`)
await page.waitForTimeout(200)
let posts = await page.evaluate(() => window.__posts)
check('switching a workspace off posts { on: false } for it', JSON.stringify(posts.at(-1)) === JSON.stringify({ workspaces: { w1: { on: false } } }), JSON.stringify(posts.at(-1)))
c = await counts()
check('its count drops to 0 of 3', c.w1 === '0/3', JSON.stringify(c))

// ...then pick one conversation back on.
await page.click(`${wsRow('w1')} button[aria-expanded]`)
await page.waitForTimeout(100)
await page.click('[data-small-toolkit-session="a2"] input')
await page.waitForTimeout(200)
posts = await page.evaluate(() => window.__posts)
check('ticking one conversation of an off workspace stores it as an exception',
  JSON.stringify(posts.at(-1)) === JSON.stringify({ workspaces: { w1: { on: false, sessions: { a2: true } } } }), JSON.stringify(posts.at(-1)))
const mixed = await page.evaluate((sel) => document.querySelector(sel).indeterminate, `${wsRow('w1')} input[type="checkbox"]`)
check('the workspace checkbox shows the in-between state', mixed === true)
check('archived conversations carry a tag',
  (await page.textContent('[data-small-toolkit-session="a3"]')).includes('rules.archived'))

// Unticking it again clears the exception (back to the workspace default).
await page.click('[data-small-toolkit-session="a2"] input')
await page.waitForTimeout(200)
posts = await page.evaluate(() => window.__posts)
check('unticking it removes the exception again', JSON.stringify(posts.at(-1)) === JSON.stringify({ workspaces: { w1: { on: false } } }), JSON.stringify(posts.at(-1)))

// Whole workspace on, a few off.
await page.click(`${wsRow('w2')} button[aria-expanded]`)
await page.waitForTimeout(100)
check('a long workspace offers a search box', await page.isVisible(`${wsRow('w2')} input[placeholder="rules.filter"]`))
await page.click('[data-small-toolkit-session="b2"] input')
await page.click('[data-small-toolkit-session="b3"] input')
await page.waitForTimeout(200)
posts = await page.evaluate(() => window.__posts)
check('unticking two conversations of an on workspace stores them as off',
  JSON.stringify(posts.at(-1).workspaces.w2) === JSON.stringify({ sessions: { b2: false, b3: false } }), JSON.stringify(posts.at(-1)))
c = await counts()
check('the count reads 10 of 12', c.w2 === '10/12', JSON.stringify(c))
await page.fill(`${wsRow('w2')} input[placeholder="rules.filter"]`, 'b11')
await page.waitForTimeout(100)
const visible = await page.evaluate(() => [...document.querySelectorAll('[data-small-toolkit-session]')].map(el => el.getAttribute('data-small-toolkit-session')).filter(id => id.startsWith('b')))
check('the search narrows the list', JSON.stringify(visible) === JSON.stringify(['b11']), JSON.stringify(visible))

// Switching the workspace as a whole clears its exceptions.
await page.click(`${wsRow('w2')} > div input[type="checkbox"]`)
await page.waitForTimeout(200)
posts = await page.evaluate(() => window.__posts)
check('clicking a mixed workspace turns it fully on and clears the exceptions',
  JSON.stringify(posts.at(-1).workspaces.w2) === JSON.stringify({ on: true }), JSON.stringify(posts.at(-1)))

await page.click('text=rules.allOff')
await page.waitForTimeout(200)
posts = await page.evaluate(() => window.__posts)
check('"all off" switches every workspace off', JSON.stringify(posts.at(-1)) === JSON.stringify({ workspaces: { w1: { on: false }, w2: { on: false } } }), JSON.stringify(posts.at(-1)))
await page.click('text=rules.allOn')
await page.waitForTimeout(200)
posts = await page.evaluate(() => window.__posts)
check('"all on" switches them back on', JSON.stringify(posts.at(-1)) === JSON.stringify({ workspaces: { w1: { on: true }, w2: { on: true } } }))

// A screenshot for the README (docs/settings-page.png), in the state the tests just built.
await page.click('text=rules.allOn')
await page.waitForTimeout(100)
await page.click('[data-small-toolkit-session="a1"] input')
await page.click('[data-small-toolkit-session="a3"] input')
await page.fill(`${wsRow('w2')} input[placeholder="rules.filter"]`, '')
await page.waitForTimeout(200)
await page.evaluate((dict) => { window.__dict = dict; window.__render({ status: 'ready', writable: true, revision: 11, value: { keepAwake: { enabled: true }, taskNotify: { enabled: true, sound: true, notifyOnAborted: false, clickOpensApp: true, minDurationSec: 0 } } }) }, zh)
await page.waitForTimeout(300)
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true })
await page.locator('[data-small-toolkit-config]').screenshot({ path: path.join(ROOT, 'docs', 'settings-page.png') })

await page.evaluate(() => { window.__dict = undefined })
// Master switch off: the selection is disabled.
await page.evaluate((v) => window.__render({ status: 'ready', writable: true, revision: 9, value: v }), { ...full, taskNotify: { ...full.taskNotify, enabled: false } })
await page.waitForTimeout(200)
check('with the notification master switch off, the selection is disabled',
  await page.evaluate(() => [...document.querySelectorAll('[data-small-toolkit-rules] input[type="checkbox"]')].every(el => el.disabled)))

// The host half being down.
await page.evaluate(() => { window.__failRules = true })
await mount(state(full))
await page.waitForTimeout(300)
check('an unreachable host half shows a message instead of breaking the page',
  (await page.textContent('[data-small-toolkit-config]')).includes('rules.failed'))

check('no page errors', errors.length === 0, errors.join(' | '))
await browser.close()
const failed = results.filter(result => !result.passed)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exitCode = failed.length === 0 ? 0 : 1
