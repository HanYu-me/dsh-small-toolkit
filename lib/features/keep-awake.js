import { spawn } from 'node:child_process'

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
  ctx.effect(() => {
    const child = run('/usr/bin/caffeinate', ['-di', '-w', String(process.pid)], { stdio: 'ignore' })
    child.on('error', () => {})
    return () => child.kill('SIGTERM')
  })
}
