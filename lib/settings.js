import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * Manual on/off switches, kept in a small JSON file that is re-read on use, so a
 * feature can be turned on or off without restarting dsh:
 *
 *   { "keepAwake": true, "taskNotify": false }
 *
 * A feature missing from the file (or an unreadable file) keeps its default.
 * `enabled: false` in the profile's cordis.patch.yml still removes a feature
 * entirely; this file only switches the features that are loaded.
 */

/** How often long-running features re-read the switches. */
export const POLL_MS = 3000

/**
 * Where the switches live.
 * @param env - environment, injectable for tests.
 * @returns the settings file path.
 */
export function settingsPath(env = process.env) {
  return env.DSH_SMALL_TOOLKIT_SETTINGS || join(homedir(), 'Library', 'Application Support', 'dsh-small-toolkit', 'settings.json')
}

/**
 * Read the switches.
 * @param file - settings file path.
 * @returns a map of feature id to boolean; empty when missing or invalid.
 */
export function readSwitches(file = settingsPath()) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'boolean'))
  } catch {
    return {}
  }
}

/**
 * Whether a feature is switched on right now.
 * @param id - feature id.
 * @param file - settings file path.
 * @returns false only when the file turns the feature off.
 */
export function isEnabled(id, file = settingsPath()) {
  return readSwitches(file)[id] !== false
}

/**
 * Create the settings file with every feature on, if it does not exist yet, so
 * there is a file to edit.
 * @param ids - feature ids.
 * @param file - settings file path.
 * @returns true when a file was written.
 */
export function ensureSettingsFile(ids, file = settingsPath()) {
  if (existsSync(file)) return false
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, `${JSON.stringify(Object.fromEntries(ids.map((id) => [id, true])), null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
    return true
  } catch {
    return false
  }
}
