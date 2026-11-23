import { spawn } from 'node:child_process'
import { plain } from '../live.js'

/** How often the switches are re-read. */
const POLL_MS = 3000

/** Keep the Mac awake while DSH runs (the display too, unless allowed to sleep). */
export const id = 'keepAwake'
export const defaults = { enabled: true, allowDisplaySleep: false }

/**
 * The caffeinate flags for a setting.
 * -i: no idle system sleep, so running tasks keep going (also behind a locked screen);
 * -d: no display sleep either, which also holds off the screensaver and the lock that
 *     follows; left out when the display may sleep and the screen lock normally;
 * -w: exit when the host exits, so a crash never leaves the assertion behind.
 * @param allowDisplaySleep - whether the display may sleep (and the screen lock).
 * @returns the arguments before `-w`.
 */
export function flags(allowDisplaySleep) {
  return allowDisplaySleep ? ['-i'] : ['-di']
}

export function apply(ctx, config, deps = {}) {
  const platform = deps.platform ?? process.platform
  if (platform !== 'darwin') return
  const run = deps.spawn ?? spawn
  const enabled = deps.enabled ?? (() => true)
  const allowDisplaySleep = deps.allowDisplaySleep ?? (() => plain(config ?? {}).allowDisplaySleep === true)
  const pollMs = deps.pollMs ?? POLL_MS
  ctx.effect(() => {
    let child
    let mode
    const stop = () => {
      child?.kill('SIGTERM')
      child = undefined
      mode = undefined
    }
    // The switches are re-read on a timer: turning keepAwake off releases the
    // assertion, turning it on takes it again, and changing whether the display
    // may sleep restarts caffeinate with the other flags.
    const sync = () => {
      const want = enabled()
      const wanted = want ? flags(allowDisplaySleep()).join(' ') : undefined
      if (wanted === mode) return
      stop()
      if (wanted === undefined) return
      child = run('/usr/bin/caffeinate', [...flags(allowDisplaySleep()), '-w', String(process.pid)], { stdio: 'ignore' })
      child.on('error', () => {})
      mode = wanted
    }
    sync()
    const timer = setInterval(sync, pollMs)
    timer.unref?.()
    return () => {
      clearInterval(timer)
      stop()
    }
  })
}
