import * as keepAwake from './features/keep-awake.js'
import * as taskNotify from './features/task-notify.js'
import { ensureSettingsFile, isEnabled } from './settings.js'

export const name = 'dsh-small-toolkit'

/** Every small feature lives in lib/features/ and is listed here. */
export const features = [keepAwake, taskNotify]

/**
 * Merge one feature's config over its defaults.
 * @param feature - the feature module.
 * @param config - the plugin entry config (may be undefined).
 * @returns the effective feature config.
 */
export function featureConfig(feature, config) {
  const own = config && typeof config === 'object' ? config[feature.id] : undefined
  return { ...feature.defaults, ...(own && typeof own === 'object' ? own : {}) }
}

export function apply(ctx, config) {
  ensureSettingsFile(features.map((feature) => feature.id))
  for (const feature of features) {
    const effective = featureConfig(feature, config)
    if (effective.enabled === false) continue
    try {
      feature.apply(ctx, effective, { enabled: () => isEnabled(feature.id) })
    } catch (error) {
      // One broken feature must never take the others (or the host) down.
      ctx.logger?.warn?.(`small-toolkit: feature ${feature.id} failed to start: ${error?.message ?? error}`)
    }
  }
}
