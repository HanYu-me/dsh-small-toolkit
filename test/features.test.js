import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as taskNotify from '../lib/features/task-notify.js'
import * as keepAwake from '../lib/features/keep-awake.js'
import * as notifier from '../lib/features/notifier.js'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, featureConfig, features } from '../lib/index.js'
import { ensureSettingsFile, isEnabled, readSwitches } from '../lib/settings.js'

// Never touch the real settings file from tests.
process.env.DSH_SMALL_TOOLKIT_SETTINGS = join(mkdtempSync(join(tmpdir(), 'dsh-toolkit-')), 'settings.json')

/** A fake cordis context that records listeners and lets the test fire events. */
function fakeCtx() {
  const listeners = new Map()
  const effects = []
  return {
    on(name, fn) { (listeners.get(name) ?? listeners.set(name, []).get(name)).push(fn) },
    effect(fn) { effects.push(fn()) },
    fire(name, ...args) { for (const fn of listeners.get(name) ?? []) fn(...args) },
    get: () => undefined,
    logger: { warn() {} },
    effects,
  }
}

function agent(id, depth = 0) {
  return { id, session: { id, header: { delegationDepth: depth } }, options: {} }
}

function setup(config = {}) {
  const ctx = fakeCtx()
  const notes = []
  let clock = 1000
  taskNotify.apply(ctx, { ...taskNotify.defaults, ...config }, {
    platform: 'darwin',
    notify: (note) => { notes.push(note) },
    now: () => clock,
  })
  return { ctx, notes, tick: (ms) => { clock += ms } }
}

test('notifies once when a top-level run completes, with title and duration', () => {
  const { ctx, notes, tick } = setup()
  const a = agent('s1')
  ctx.fire('session/event', a.session, { type: 'session/title', data: { title: '压缩图片脚本' } })
  ctx.fire('agent/status', { agent: a, status: 'running' })
  tick(133_000)
  ctx.fire('session/event', a.session, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } })
  ctx.fire('agent/status', { agent: a, status: 'idle' })
  assert.equal(notes.length, 1)
  assert.equal(notes[0].title, 'DeepSeek Harness · 任务完成')
  assert.equal(notes[0].subtitle, '压缩图片脚本')
  assert.equal(notes[0].message, '用时 2 分 13 秒')
  assert.equal(notes[0].sound, true)
})

test('uses the last turn of a multi-turn run and includes error text', () => {
  const { ctx, notes } = setup()
  const a = agent('s1')
  ctx.fire('agent/status', { agent: a, status: 'running' })
  ctx.fire('session/event', a.session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  ctx.fire('session/event', a.session, { type: 'turn/end', data: { reason: { kind: 'error', error: { message: 'rate limited', code: 'RATE_LIMIT' } } } })
  ctx.fire('agent/status', { agent: a, status: 'idle' })
  assert.equal(notes.length, 1)
  assert.match(notes[0].title, /任务出错/)
  assert.match(notes[0].message, /rate limited/)
})

test('subagents and Agent Teams members (delegationDepth > 0) never notify', () => {
  const { ctx, notes } = setup()
  const child = agent('child', 1)
  ctx.fire('agent/status', { agent: child, status: 'running' })
  ctx.fire('session/event', child.session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  ctx.fire('agent/status', { agent: child, status: 'idle' })
  const runtimeChild = { ...agent('rt'), options: { subagentDepth: 2 } }
  ctx.fire('agent/status', { agent: runtimeChild, status: 'running' })
  ctx.fire('session/event', runtimeChild.session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  ctx.fire('agent/status', { agent: runtimeChild, status: 'idle' })
  assert.equal(notes.length, 0)
})

test('a stop you pressed (aborted) is silent unless configured', () => {
  const quiet = setup()
  const a = agent('s1')
  quiet.ctx.fire('agent/status', { agent: a, status: 'running' })
  quiet.ctx.fire('session/event', a.session, { type: 'turn/end', data: { reason: { kind: 'aborted', reason: { kind: 'user' } } } })
  quiet.ctx.fire('agent/status', { agent: a, status: 'idle' })
  assert.equal(quiet.notes.length, 0)
  const loud = setup({ notifyOn: ['aborted'] })
  loud.ctx.fire('agent/status', { agent: a, status: 'running' })
  loud.ctx.fire('session/event', a.session, { type: 'turn/end', data: { reason: { kind: 'aborted' } } })
  loud.ctx.fire('agent/status', { agent: a, status: 'idle' })
  assert.equal(loud.notes.length, 1)
})

test('idle without a watched run (replay, maintenance) does not notify', () => {
  const { ctx, notes } = setup()
  const a = agent('s1')
  ctx.fire('session/event', a.session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  ctx.fire('agent/status', { agent: a, status: 'idle' })
  ctx.fire('agent/status', { agent: a, status: 'running' })
  ctx.fire('agent/status', { agent: a, status: 'idle' })
  assert.equal(notes.length, 0)
})

test('minDurationSec skips short runs', () => {
  const { ctx, notes, tick } = setup({ minDurationSec: 30 })
  const a = agent('s1')
  for (const ms of [5_000, 31_000]) {
    ctx.fire('agent/status', { agent: a, status: 'running' })
    tick(ms)
    ctx.fire('session/event', a.session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
    ctx.fire('agent/status', { agent: a, status: 'idle' })
  }
  assert.equal(notes.length, 1)
  assert.equal(notes[0].message, '用时 31 秒')
})

test('does nothing off macOS', () => {
  const ctx = fakeCtx()
  taskNotify.apply(ctx, taskNotify.defaults, { platform: 'linux', notify: () => assert.fail('should not notify') })
  keepAwake.apply(ctx, keepAwake.defaults, { platform: 'linux', spawn: () => assert.fail('should not spawn') })
  assert.equal(ctx.effects.length, 0)
})

test('osascript gets the text as argv, never inside the script', async () => {
  let call
  await notifier.postWithOsascript(
    { title: 'T "quoted"', subtitle: 'S', message: 'M\'; do shell script "x"', sound: false },
    (file, args, _opts, cb) => { call = { file, args }; cb(null) },
  )
  assert.equal(call.file, '/usr/bin/osascript')
  const sep = call.args.indexOf('--')
  assert.deepEqual(call.args.slice(sep + 1), ['M\'; do shell script "x"', 'T "quoted"', 'S', ''])
  assert.ok(call.args.slice(0, sep).every((part) => !part.includes('quoted')))
})

test('helper argv carries the text as separate arguments', () => {
  const args = notifier.helperArgs({
    title: 'DeepSeek Harness · 任务完成',
    subtitle: '压缩图片',
    message: '用时 2 分',
    sound: true,
    appBundleId: 'com.deepseek.dsh',
  })
  assert.deepEqual(args.slice(0, 6), ['--post', '--title', 'DeepSeek Harness · 任务完成', '--subtitle', '压缩图片', '--message'])
  assert.ok(args.includes('--bundle'))
  assert.ok(!args.includes('--silent'))
  assert.ok(notifier.helperArgs({ title: 't', message: 'm', sound: false }).includes('--silent'))
})

test('posts through the helper when it is built, else falls back to osascript', async () => {
  const launched = []
  const posted = notifier.postWithHelper(
    { title: 't', subtitle: 's', message: 'm', sound: true },
    { app: '/tmp/definitely-not-there/TaskNotify.app', baseDir: '/tmp/definitely-not-there', launch: (file, args) => launched.push({ file, args }) },
  )
  // No helper in that directory: nothing is launched, so the caller falls back.
  assert.equal(posted, false)
  assert.equal(launched.length, 0)

  let osascript
  await taskNotify.showNotification(
    { title: 't', message: 'm' },
    {
      app: '/tmp/definitely-not-there/TaskNotify.app',
      baseDir: '/tmp/definitely-not-there',
      build: false,
      launch: () => assert.fail('must not launch a helper that is not built'),
      exec: (file, args, _options, callback) => { osascript = { file, args }; callback(null) },
    },
  )
  assert.equal(osascript.file, '/usr/bin/osascript')
})

test('helperIsFresh only trusts a binary built after the source', () => {
  assert.equal(notifier.helperIsFresh({ binary: '/nope', info: '/nope' }, 0), false)
})

test('infoPlist declares the helper as a background app', () => {
  const plist = notifier.infoPlist('2', 'com.example.helper')
  assert.match(plist, /<string>com\.example\.helper<\/string>/)
  assert.match(plist, /<key>LSUIElement<\/key><true\/>/)
  assert.match(plist, /<string>2<\/string>/)
})

test('formatDuration', () => {
  assert.equal(taskNotify.formatDuration(8_400), '8 秒')
  assert.equal(taskNotify.formatDuration(3_725_000), '1 小时 2 分')
})

test('features can be turned off one by one; one failing feature does not stop the rest', () => {
  assert.deepEqual(features.map((f) => f.id), ['keepAwake', 'taskNotify'])
  assert.equal(featureConfig(taskNotify, { taskNotify: { minDurationSec: 10 } }).minDurationSec, 10)
  assert.equal(featureConfig(taskNotify, undefined).enabled, true)
  const ctx = fakeCtx()
  let warned = ''
  ctx.logger.warn = (m) => { warned = m }
  ctx.on = () => { throw new Error('boom') }
  apply(ctx, { keepAwake: { enabled: false } })
  assert.match(warned, /taskNotify failed to start: boom/)
  assert.equal(ctx.effects.length, 0)
})

test('settings.json switches features; missing or broken files keep the defaults', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'dsh-toolkit-')), 'settings.json')
  assert.equal(isEnabled('keepAwake', file), true)
  assert.equal(ensureSettingsFile(['keepAwake', 'taskNotify'], file), true)
  assert.deepEqual(readSwitches(file), { keepAwake: true, taskNotify: true })
  assert.equal(ensureSettingsFile(['keepAwake'], file), false)
  writeFileSync(file, '{ "taskNotify": false, "keepAwake": "no" }')
  assert.equal(isEnabled('taskNotify', file), false)
  assert.equal(isEnabled('keepAwake', file), true)
  writeFileSync(file, 'not json')
  assert.equal(isEnabled('taskNotify', file), true)
  assert.equal(readFileSync(file, 'utf8'), 'not json')
})

test('taskNotify stays silent while switched off and notifies again when switched on', () => {
  const ctx = fakeCtx()
  const notes = []
  let on = false
  taskNotify.apply(ctx, taskNotify.defaults, { platform: 'darwin', notify: (n) => { notes.push(n) }, now: () => 1000, enabled: () => on })
  const run = () => {
    ctx.fire('agent/status', { agent: agent('s1'), status: 'running' })
    ctx.fire('session/event', { id: 's1' }, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
    ctx.fire('agent/status', { agent: agent('s1'), status: 'idle' })
  }
  run()
  assert.equal(notes.length, 0)
  on = true
  run()
  assert.equal(notes.length, 1)
})

test('keepAwake takes and releases caffeinate as the switch changes', async () => {
  const ctx = fakeCtx()
  const started = []
  let on = true
  keepAwake.apply(ctx, keepAwake.defaults, {
    platform: 'darwin',
    pollMs: 10,
    enabled: () => on,
    spawn: () => { const child = { killed: false, on() {}, kill() { this.killed = true } }; started.push(child); return child },
  })
  assert.equal(started.length, 1)
  on = false
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(started[0].killed, true)
  on = true
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(started.length, 2)
  ctx.effects[0]()
  assert.equal(started[1].killed, true)
})

test('the helper is compiled through xcrun, so the Xcode toolchain finds its SDK', async () => {
  const calls = []
  const run = async (file, args) => {
    calls.push([file, ...args])
    return { code: 0, stdout: '/Applications/Xcode.app/.../usr/bin/swiftc\n', stderr: '' }
  }
  const dir = mkdtempSync(join(tmpdir(), 'dsh-toolkit-build-'))
  await notifier.buildHelper({ baseDir: dir, app: join(dir, 'T.app'), run, toolchain: { xcrun: '/usr/bin/xcrun' } })
  const compile = calls.find(call => call.includes('-Onone'))
  assert.deepEqual(compile.slice(0, 2), ['/usr/bin/xcrun', 'swiftc'])
  const bare = []
  await notifier.buildHelper({ baseDir: dir, app: join(dir, 'T2.app'), run: async (file, args) => { bare.push([file, ...args]); return { code: 0, stdout: '', stderr: '' } }, toolchain: { swiftc: '/Library/Developer/CommandLineTools/usr/bin/swiftc' } })
  assert.equal(bare.find(call => call.includes('-Onone'))[0], '/Library/Developer/CommandLineTools/usr/bin/swiftc')
})
