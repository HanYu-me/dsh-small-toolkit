/**
 * Live configuration values.
 *
 * Fields marked `.volatile()` in the Config schema arrive in `apply(ctx, config)`
 * as frozen references (`{ get() }`) whose value the loader updates in place
 * when the person changes the setting on the Plugins page — no restart, no
 * remount. Everything below reads through them at the moment of use. On a host
 * that hands over plain values the same helpers just pass them through.
 */

/**
 * Whether a value is a live reference (`{ get }`).
 * @param value - any config node.
 * @returns true for a reference.
 */
export function isRef(value) {
  if (typeof value !== 'object' || value === null) return false
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0] === 'get' && typeof value.get === 'function'
}

/**
 * Deep-resolve a config node into plain values, reading every reference now.
 * @param value - a config node, possibly containing references.
 * @returns a detached plain copy.
 */
export function plain(value) {
  if (isRef(value)) return plain(value.get())
  if (Array.isArray(value)) return value.map(plain)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, plain(child)]))
  }
  return value
}
