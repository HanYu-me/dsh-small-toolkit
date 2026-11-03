import { DSH_BUNDLE_ID, ensureHelper, postClickable, postWithHelper, postWithOsascript } from './notifier.js'

/**
 * A macOS notification when a conversation finishes its work: the agent of a
 * top-level session goes from running to idle. Subagents and Agent Teams members
 * (delegationDepth > 0) never notify. The outcome comes from the last
 * `turn/end` the session logged during that run.
 *
 * Clicking the notification brings DeepSeek Harness forward: it is posted
 * through a small helper app built from notifier.swift (see ./notifier.js).
 * Without a Swift toolchain the AppleScript fallback still notifies, but a
 * click opens Script Editor.
 */
export const id = 'taskNotify'
export const defaults = {
  enabled: true,
  /** Which turn endings notify. `aborted` (you pressed stop) is off by default. */
  notifyOn: ['completed', 'error', 'blocked', 'max-tokens'],
  /** Skip runs shorter than this many seconds (0 = every run). */
  minDurationSec: 0,
  /** Play the notification sound. */
  sound: true,
  /** Clicking the notification brings this app forward (bundle id). */
  appBundleId: DSH_BUNDLE_ID,
  /** false = fall back to the AppleScript notification, which opens Script Editor on click. */
  clickOpensApp: true,
}

const LABELS = {
  completed: '任务完成',
  error: '任务出错',
  blocked: '任务被拦截',
  'max-tokens': '输出达到上限',
  aborted: '任务已停止',
}

/**
 * Human duration, e.g. "8 秒", "2 分 13 秒", "1 小时 5 分".
 * @param ms - milliseconds.
 * @returns the label.
 */
export function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h} 小时 ${m} 分`
  if (m > 0) return `${m} 分 ${s} 秒`
  return `${s} 秒`
}

/**
 * Cut text to at most `max` code points.
 * @param text - the text.
 * @param max - the budget.
 * @returns the clipped text.
 */
function clip(text, max) {
  const chars = Array.from(String(text ?? '').replace(/\s+/g, ' ').trim())
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('')}…`
}

/**
 * Whether an agent belongs to a top-level conversation (not a subagent).
 * @param agent - the agent.
 * @returns true for depth 0.
 */
export function isTopLevel(agent) {
  const headerDepth = agent?.session?.header?.delegationDepth ?? 0
  const runtimeDepth = agent?.options?.subagentDepth ?? 0
  return headerDepth === 0 && runtimeDepth === 0
}

/**
 * Show one macOS notification: through the clickable helper when it is built,
 * otherwise through the AppleScript fallback.
 * @param note - { title, subtitle, message, sound, appBundleId }.
 * @param options - { baseDir, launch, exec } (tests).
 * @returns undefined when posted, or a promise for the fallback's error.
 */
export async function showNotification(note, options = {}) {
  if (options.clickable !== false) {
    const outcome = await postClickable(note, options)
    if (outcome === 'ok') return undefined
  }
  return postWithOsascript(note, options.exec)
}

export function apply(ctx, config, deps = {}) {
  const platform = deps.platform ?? process.platform
  if (platform !== 'darwin') return
  const clickable = config.clickOpensApp !== false
  const appBundleId = typeof config.appBundleId === 'string' && config.appBundleId !== '' ? config.appBundleId : DSH_BUNDLE_ID
  if (clickable && deps.notify === undefined) void ensureHelper(ctx.logger, deps)
  const notify = deps.notify ?? ((note) => showNotification({ ...note, appBundleId }, { ...deps, clickable }))
  const now = deps.now ?? (() => Date.now())
  const notifyOn = new Set(Array.isArray(config.notifyOn) ? config.notifyOn : defaults.notifyOn)
  const minMs = Math.max(0, Number(config.minDurationSec) || 0) * 1000
  const sound = config.sound !== false
  const enabled = deps.enabled ?? (() => true)

  /** Per-session run state: when it started and how its last turn ended. */
  const runs = new Map()
  /** Latest title per session, folded from `session/title` events. */
  const titles = new Map()

  const titleOf = (agent) => {
    const sessionId = agent.session?.id ?? agent.id
    const known = titles.get(sessionId)
    if (known) return known
    try {
      const snapshot = ctx.get?.('sessionTitle')?.get?.(agent.session)
      if (snapshot?.title) return snapshot.title
    } catch {
      // The title service is optional; fall through to the generic label.
    }
    return '对话'
  }

  ctx.on('session/event', (session, event) => {
    if (event?.type === 'session/title' && typeof event.data?.title === 'string') {
      titles.set(session.id, event.data.title)
      return
    }
    if (event?.type !== 'turn/end') return
    const run = runs.get(session.id)
    if (run === undefined) return
    run.end = event.data?.reason ?? { kind: 'completed' }
  })

  ctx.on('agent/status', ({ agent, status }) => {
    if (!agent || !isTopLevel(agent)) return
    const sessionId = agent.session?.id ?? agent.id
    if (status === 'running') {
      if (!runs.has(sessionId)) runs.set(sessionId, { startedAt: now(), end: undefined })
      return
    }
    if (status !== 'idle') return
    const run = runs.get(sessionId)
    runs.delete(sessionId)
    // Only runs we watched start count: replays and maintenance never notify.
    if (run === undefined || run.end === undefined) return
    // Switched off in settings.json: the run is still tracked, only the banner is skipped.
    if (!enabled()) return
    const kind = run.end.kind ?? 'completed'
    if (!notifyOn.has(kind)) return
    const elapsed = now() - run.startedAt
    if (elapsed < minMs) return
    const label = LABELS[kind] ?? `任务结束（${kind}）`
    const detail = kind === 'error' && run.end.error?.message ? `：${clip(run.end.error.message, 80)}` : ''
    void Promise.resolve(notify({
      title: `DeepSeek Harness · ${label}`,
      subtitle: clip(titleOf(agent), 60),
      message: `用时 ${formatDuration(elapsed)}${detail}`,
      sound,
    })).then((error) => {
      if (error) ctx.logger?.warn?.(`small-toolkit: notification failed: ${error.message ?? error}`)
    })
  })

  ctx.on('session/disposed', (session) => {
    runs.delete(session.id)
    titles.delete(session.id)
  })
}
