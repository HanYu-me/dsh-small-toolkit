import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { sanitizeRules } from './rules-core.js'

export { sanitizeRules, shouldNotify } from './rules-core.js'

/**
 * Which conversations get a task-finished notification.
 *
 * Two levels, set by hand on the settings page: a WORKSPACE is on or off as a
 * whole, and single conversations inside it can differ from it —
 *
 *   { "workspaces": { "<workspaceId>": { "on": false, "sessions": { "<sessionId>": true } } } }
 *
 * A conversation notifies when its own entry says so, else when its workspace
 * is on, else (nothing set) it does. Switching a whole workspace on the page
 * clears its per-conversation entries, so "turn the workspace off, then tick a
 * few" and "turn it on, then untick a few" both work as they read.
 */

/**
 * Where the rules live.
 * @param env - environment, injectable for tests.
 * @returns the rules file path.
 */
export function rulesPath(env = process.env) {
  return env.DSH_SMALL_TOOLKIT_RULES
    || join(homedir(), 'Library', 'Application Support', 'dsh-small-toolkit', 'notify-rules.json')
}

/**
 * Read the rules; a missing or broken file means "notify everything".
 * @param file - rules file path.
 * @returns sanitised rules.
 */
export function readRules(file = rulesPath()) {
  try {
    return sanitizeRules(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return { workspaces: {} }
  }
}

/**
 * Write the rules atomically.
 * @param rules - sanitised rules.
 * @param file - rules file path.
 */
export function writeRules(rules, file = rulesPath()) {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, `${JSON.stringify(rules, null, 2)}\n`, 'utf8')
  renameSync(tmp, file)
}

/**
 * A reader that re-reads the file only when it changed (called on every task end).
 * @param file - rules file path.
 * @returns a function returning the current rules.
 */
export function createRulesReader(file = rulesPath()) {
  let stamp = -1
  let cached = { workspaces: {} }
  return () => {
    let mtime = 0
    try {
      mtime = statSync(file).mtimeMs
    } catch {
      stamp = -1
      cached = { workspaces: {} }
      return cached
    }
    if (mtime !== stamp) {
      cached = readRules(file)
      stamp = mtime
    }
    return cached
  }
}
