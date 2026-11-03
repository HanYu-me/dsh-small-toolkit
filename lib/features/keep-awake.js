import { spawn } from 'node:child_process'
import { POLL_MS } from '../settings.js'

/** Keep the Mac display and system awake while DSH runs. */
export const id = 'keepAwake'
export const defaults = { enabled: true }

// caffeinate -d: no display sleep (also holds off the screensaver and the lock that
// follows); -i: no idle system sleep; -w: exit when the host exits, so a crash never
// leaves the assertion behind.
export function apply(ctx, _config, deps = {}) {
  const platform = deps.platform ?? process.platform
  if (platform !== 'darwin') return
  const run = deps.spawn ?? spawn
  const enabled = deps.enabled ?? (() => true)
  const pollMs = deps.pollMs ?? POLL_MS
  ctx.effect(() => {
    let child
    // The switch is re-read on a timer: turning keepAwake off in settings.json
    // releases the assertion, turning it back on takes it again.
    const sync = () => {
      const want = enabled()
      if (want && child === undefined) {
        child = run('/usr/bin/caffeinate', ['-di', '-w', String(process.pid)], { stdio: 'ignore' })
        child.on('error', () => {})
      } else if (!want && child !== undefined) {
        child.kill('SIGTERM')
        child = undefined
      }
    }
    sync()
    const timer = setInterval(sync, pollMs)
    timer.unref?.()
    return () => {
      clearInterval(timer)
      child?.kill('SIGTERM')
    }
  })
}
