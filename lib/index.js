import { Config } from './config.js'
import * as keepAwake from './features/keep-awake.js'
import * as taskNotify from './features/task-notify.js'
import { plain } from './live.js'
import { mountRoutes } from './routes.js'
import { createRulesReader, shouldNotify } from './rules.js'

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

/**
 * Which conversations notify: the settings page's per-workspace / per-conversation
 * rules (lib/rules.js). The workspace of a conversation comes from the host's
 * workspace registry; without it only per-conversation choices and the default apply.
 */
function createNotifyGate(ctx) {
  const registry = { current: undefined }
  ctx.inject?.(['workspaceRegistry'], (injected) => {
    injected.effect?.(() => {
      registry.current = injected.workspaceRegistry
      return () => { if (registry.current === injected.workspaceRegistry) registry.current = undefined }
    }, 'small-toolkit: workspace registry')
  })
  const readRules = createRulesReader()
  const workspaceOf = (sessionId) => {
    try {
      return registry.current?.list?.().find((workspace) => workspace.sessionIds.includes(sessionId))?.id
    } catch {
      return undefined
    }
  }
  return (sessionId) => shouldNotify(readRules(), workspaceOf(sessionId), sessionId)
}

export function apply(ctx, config) {
  try {
    mountRoutes(ctx)
  } catch (error) {
    ctx.logger?.warn?.(`small-toolkit: settings routes failed to mount: ${error?.message ?? error}`)
  }
  const allow = createNotifyGate(ctx)
  for (const feature of features) {
    const effective = featureConfig(feature, config)
    try {
      // Every feature always loads; its `enabled` switch is read live, so it can
      // be turned on and off on the Plugins page without a restart.
      feature.apply(ctx, effective, { enabled: () => plain(effective).enabled !== false, allow })
    } catch (error) {
      // One broken feature must never take the others (or the host) down.
      ctx.logger?.warn?.(`small-toolkit: feature ${feature.id} failed to start: ${error?.message ?? error}`)
    }
  }
}
