/**
 * macOS notification helper.
 *
 * `osascript ... display notification` is fire-and-forget and is attributed to
 * Script Editor, so clicking it opens Script Editor. To make a click land on
 * DeepSeek Harness, the notification has to come from an app bundle we own:
 * this module builds a small helper app (`TaskNotify.app`) from
 * `notifier.swift` on first use, and posts through it. macOS then launches the
 * helper when the notification is clicked, and the helper activates DSH.
 *
 * Building needs the Swift toolchain (`xcrun -f swiftc`, i.e. the Command Line
 * Tools). Without it — or if the build fails — the plugin falls back to the
 * osascript notification, which is still delivered but opens Script Editor.
 * @module dsh-small-toolkit/features/notifier
 */

import { execFile, spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SOURCE = join(HERE, 'notifier.swift')

/** App icon shipped next to the source (the DeepSeek Harness whale). */
const ICON = join(HERE, 'TaskNotify.icns')

/** Bundle identifier of the helper app (stable, so macOS keeps the permission). */
export const HELPER_BUNDLE_ID = 'com.hanyu.dsh-notifier'

/** Default macOS bundle identifier of the DeepSeek Harness desktop app. */
export const DSH_BUNDLE_ID = 'com.deepseek.dsh'

/**
 * Where the helper app and its log live.
 *
 * The app must sit in a real application folder: macOS refuses to deliver
 * notifications for a bundle under ~/Library (it answers "Notifications are not
 * allowed for this application"), while the same bundle in ~/Applications is
 * accepted and gets the permission prompt.
 * @param options - { baseDir (log folder), app (bundle path) } or a log folder string.
 * @returns the resolved paths.
 */
export function paths(options = {}) {
  const settings = typeof options === 'string' ? { baseDir: options } : options
  const baseDir = settings.baseDir ?? join(homedir(), 'Library', 'Application Support', 'dsh-small-toolkit')
  const app = settings.app ?? join(homedir(), 'Applications', 'DSHNotifier.app')
  return {
    base: baseDir,
    app,
    binary: join(app, 'Contents', 'MacOS', 'TaskNotify'),
    info: join(app, 'Contents', 'Info.plist'),
    log: join(baseDir, 'notifier.log'),
  }
}

/** The Info.plist of the helper app. */
export function infoPlist(version, bundleId = HELPER_BUNDLE_ID) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key><string>${bundleId}</string>
  <key>CFBundleName</key><string>DSH 提醒</string>
  <key>CFBundleDisplayName</key><string>DSH 提醒</string>
  <key>CFBundleExecutable</key><string>TaskNotify</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleIconFile</key><string>TaskNotify.icns</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`
}

/**
 * Find the Swift compiler.
 * @param deps - injectable lookup for tests.
 * @returns the compiler path, or undefined when no toolchain is installed.
 */
export function findSwiftc(deps = {}) {
  const candidates = deps.candidates ?? [
    '/usr/bin/xcrun',
    '/Library/Developer/CommandLineTools/usr/bin/swiftc',
  ]
  const which = deps.which ?? ((file) => ['/usr/local/bin', '/opt/homebrew/bin', '/usr/bin'].map((dir) => join(dir, file)).find((path) => existsSync(path)))
  for (const candidate of candidates) {
    if (candidate.endsWith('xcrun') && existsSync(candidate)) return { xcrun: candidate }
    if (existsSync(candidate) && candidate.endsWith('swiftc')) return { swiftc: candidate }
    if (!candidate.startsWith('/') && which(candidate) !== undefined) return { swiftc: which(candidate) }
  }
  return undefined
}

/**
 * Whether the built helper carries the icon shipped with this plugin.
 * @param location - paths() result.
 * @returns true when the bundle has its icns.
 */
export function helperHasIcon(location) {
  return existsSync(join(location.app, 'Contents', 'Resources', 'TaskNotify.icns'))
}

/**
 * Whether the built helper is present and newer than its source.
 * @param location - paths() result.
 * @param sourceMtime - mtime of notifier.swift in ms.
 * @returns true when a rebuild is unnecessary.
 */
export function helperIsFresh(location, sourceMtime) {
  if (!existsSync(location.binary) || !existsSync(location.info)) return false
  if (existsSync(ICON) && !helperHasIcon(location)) return false
  try {
    return statSync(location.binary).mtimeMs >= sourceMtime
  } catch {
    return false
  }
}

/**
 * Build (or rebuild) the helper app.
 * @param options - { baseDir, version, run, toolchain }.
 * @returns the app path.
 * @throws when no Swift toolchain is available or compilation fails.
 */
export async function buildHelper(options = {}) {
  const location = paths({ baseDir: options.baseDir, ...(options.app !== undefined ? { app: options.app } : {}) })
  const run = options.run ?? runCommand
  mkdirSync(join(location.app, 'Contents', 'MacOS'), { recursive: true })
  writeFileSync(location.info, infoPlist(options.version ?? '1', options.bundleId ?? HELPER_BUNDLE_ID), 'utf8')
  // The icon is what macOS shows beside the notification; without it the banner
  // falls back to a generic placeholder.
  const resources = join(location.app, 'Contents', 'Resources')
  mkdirSync(resources, { recursive: true })
  const icon = options.icon ?? ICON
  if (existsSync(icon)) copyFileSync(icon, join(resources, 'TaskNotify.icns'))
  const toolchain = options.toolchain ?? findSwiftc()
  if (toolchain === undefined) throw new Error('no Swift toolchain (xcrun -f swiftc) available')
  // Compile THROUGH xcrun when we have it: the swiftc that `xcrun -f` prints
  // (the Xcode toolchain's own binary) does not know where the SDK is when it is
  // run directly and fails with "unable to load standard library"; xcrun sets
  // up the SDK environment first. Command Line Tools-only machines never hit
  // that, and a bare swiftc path (no xcrun) is still used as it is.
  const swiftArgs = ['-Onone', SOURCE, '-o', location.binary]
  let compile
  if (toolchain.xcrun !== undefined) {
    const found = await run(toolchain.xcrun, ['-f', 'swiftc'], { timeoutMs: 20000 })
    if (found.code !== 0) throw new Error(`xcrun -f swiftc failed: ${found.stderr}`)
    compile = await run(toolchain.xcrun, ['swiftc', ...swiftArgs], { timeoutMs: 180000 })
  } else {
    // A bare swiftc (no xcrun on this machine): run it as found.
    compile = await run(toolchain.swiftc, swiftArgs, { timeoutMs: 180000 })
  }
  if (compile.code !== 0) throw new Error(`swiftc failed: ${compile.stderr || compile.stdout}`)
  // Ad-hoc signature: gives the app a stable identity, which is what the
  // notification permission is keyed on. /usr/bin explicitly: a Homebrew or
  // conda "codesign" on PATH is a different tool and crashes on app bundles.
  const sign = await run('/usr/bin/codesign', ['--force', '--sign', '-', location.app], { timeoutMs: 60000 })
  if (sign.code !== 0) throw new Error(`codesign failed: ${sign.stderr || sign.stdout}`)
  return location.app
}

/**
 * Run a command, resolving `{ code, stdout, stderr }`.
 * @param file - executable.
 * @param args - argv.
 * @param options - { timeoutMs }.
 * @returns the result.
 */
export function runCommand(file, args, options = {}) {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: options.timeoutMs ?? 60000, maxBuffer: 1 << 20 }, (error, stdout, stderr) => {
      const code = error === null ? 0 : (typeof error.code === 'number' ? error.code : 1)
      resolve({ code, stdout: String(stdout ?? ''), stderr: String(stderr ?? error?.message ?? '') })
    })
  })
}

/**
 * Build the helper in the background, at most once per process.
 * @param logger - optional `{ warn }`.
 * @param deps - injectable { baseDir, version, build }.
 * @returns whether a usable helper exists afterwards.
 */
export function ensureHelper(logger, deps = {}) {
  const location = paths(deps)
  let sourceMtime = 0
  try {
    sourceMtime = statSync(SOURCE).mtimeMs
  } catch {
    // Packaged without the source: only an already-built helper can be used.
  }
  if (helperIsFresh(location, sourceMtime)) return Promise.resolve(true)
  const build = deps.build ?? buildHelper
  return build(deps).then(
    () => true,
    (error) => {
      logger?.warn?.(`small-toolkit: could not build the notification helper (${error?.message ?? error}); notifications open Script Editor on click until it is fixed.`)
      return false
    },
  )
}

/**
 * argv for posting through the helper app.
 * @param note - { title, subtitle, message, sound, appBundleId, log }.
 * @returns the argv after `--args`.
 */
export function helperArgs(note) {
  const args = ['--post', '--title', note.title, '--subtitle', note.subtitle ?? '', '--message', note.message ?? '']
  if (note.sound === false) args.push('--silent')
  args.push('--bundle', note.appBundleId ?? DSH_BUNDLE_ID)
  if (note.log !== undefined) args.push('--log', note.log)
  if (note.id !== undefined) args.push('--id', note.id)
  return args
}

/** How long to wait for the helper's verdict before assuming it was posted. */
const VERDICT_TIMEOUT_MS = 4000

/**
 * Wait for this request's verdict in the helper log.
 * @param logPath - the helper log.
 * @param id - this request's id.
 * @param timeoutMs - give up after this long.
 * @returns 'ok' | 'denied' | 'unknown'.
 */
export async function waitForVerdict(logPath, id, timeoutMs = VERDICT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs
  const needle = `[${id}]`
  for (;;) {
    let text = ''
    try {
      text = readFileSync(logPath, 'utf8')
    } catch {
      // Not written yet.
    }
    const line = text.split('\n').filter((entry) => entry.includes(needle)).pop()
    if (line !== undefined) {
      if (line.includes('authorization granted=false')) return 'denied'
      if (line.includes('add error=') && !line.includes('add error=none')) return 'denied'
      if (line.includes('authorization granted=true') || line.includes('delivered=')) return 'ok'
    }
    if (Date.now() >= deadline) return 'unknown'
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
}

/**
 * Post through the helper and report whether macOS accepted it.
 * @param note - { title, subtitle, message, sound, appBundleId }.
 * @param options - { baseDir, launch, wait } (tests).
 * @returns 'ok' | 'denied' | 'unavailable'.
 */
export async function postClickable(note, options = {}) {
  let location = paths(options)
  // The helper can be missing although the plugin is running (a fresh checkout,
  // a deleted app, a failed first build): build it once instead of silently
  // degrading every notification to the non-clickable fallback.
  if (!existsSync(location.binary) && options.build !== false) {
    try {
      await (options.buildHelper ?? buildHelper)(options)
      location = paths(options)
    } catch {
      // Fall through to 'unavailable'; the caller uses the AppleScript fallback.
    }
  }
  const id = options.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  if (!postWithHelper({ ...note, id, log: location.log }, options)) return 'unavailable'
  const wait = options.wait ?? waitForVerdict
  const verdict = await wait(location.log, id)
  return verdict === 'denied' ? 'denied' : 'ok'
}

/**
 * Post through the helper app: `open -n -a TaskNotify.app --args …`. The helper
 * shows the notification and exits; macOS relaunches it without arguments when
 * the notification is clicked, and it then activates DSH.
 * @param note - see {@link helperArgs}.
 * @param options - { baseDir, launch }.
 * @returns whether the launch command was started.
 */
export function postWithHelper(note, options = {}) {
  const location = paths(options)
  if (!existsSync(location.binary)) return false
  const launch = options.launch ?? ((file, args) => {
    const child = spawn(file, args, { stdio: 'ignore', detached: true })
    child.on('error', () => {})
    child.unref()
  })
  try {
    launch('/usr/bin/open', ['-n', '-a', location.app, '--args', ...helperArgs({ ...note, log: note.log ?? location.log })])
    return true
  } catch {
    return false
  }
}

/**
 * Fallback: the fire-and-forget AppleScript notification (delivered, but a
 * click opens Script Editor).
 * @param note - { title, subtitle, message, sound }.
 * @param exec - execFile, injectable.
 * @returns a promise settling when osascript exits.
 */
export function postWithOsascript(note, exec = execFile) {
  const script = [
    'on run argv',
    'set msg to item 1 of argv',
    'set ttl to item 2 of argv',
    'set sub to item 3 of argv',
    'set snd to item 4 of argv',
    'if snd is "" then',
    'display notification msg with title ttl subtitle sub',
    'else',
    'display notification msg with title ttl subtitle sub sound name snd',
    'end if',
    'end run',
  ]
  const args = script.flatMap((line) => ['-e', line])
  args.push('--', note.message ?? '', note.title, note.subtitle ?? '', note.sound === false ? '' : (typeof note.sound === 'string' ? note.sound : 'Glass'))
  return new Promise((resolve) => {
    exec('/usr/bin/osascript', args, { timeout: 10000 }, (error) => resolve(error ?? undefined))
  })
}

/**
 * The last few lines of the helper log, for diagnostics.
 * @param baseDir - helper base directory.
 * @param lines - how many lines to return.
 * @returns the tail, or ''.
 */
export function helperLogTail(options, lines = 5) {
  try {
    return readFileSync(paths(options).log, 'utf8').trim().split('\n').slice(-lines).join('\n')
  } catch {
    return ''
  }
}
