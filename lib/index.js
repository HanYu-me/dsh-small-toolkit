import { Config } from './config.js'
import * as keepAwake from './features/keep-awake.js'
import * as taskNotify from './features/task-notify.js'
import { plain } from './live.js'

export { Config }
export const name = 'dsh-small-toolkit'

/** Every small feature lives in lib/features/ and is listed here. */
export const features = [keepAwake, taskNotify]

/**
 * Merge one feature's config over its defaults. Live references stay references
 * (the merge is shallow); read them through `plain()` at the moment of use.
 * @param feature - the feature module.
 * @param config - the plugin entry config (may be undefined).
 * @returns the effective feature config.
 */
export function featureConfig(feature, config) {
  const own = config && typeof config === 'object' ? config[feature.id] : undefined
  return { ...feature.defaults, ...(own && typeof own === 'object' ? own : {}) }
}

export function apply(ctx, config) {
  for (const feature of features) {
    const effective = featureConfig(feature, config)
    try {
      // Every feature always loads; its `enabled` switch is read live, so it can
      // be turned on and off on the Plugins page without a restart.
      feature.apply(ctx, effective, { enabled: () => plain(effective).enabled !== false })
    } catch (error) {
      // One broken feature must never take the others (or the host) down.
      ctx.logger?.warn?.(`small-toolkit: feature ${feature.id} failed to start: ${error?.message ?? error}`)
    }
  }
}
