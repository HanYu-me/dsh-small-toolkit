/**
 * The pure half of the notification rules (no Node imports), shared by the host
 * (lib/rules.js) and the settings page bundle. The model is described in
 * lib/rules.js.
 */

/**
 * Normalise untrusted input into the stored shape.
 * @param input - parsed JSON (or anything).
 * @returns clean rules; unknown keys and non-boolean values are dropped.
 */
export function sanitizeRules(input) {
  const out = { workspaces: {} }
  const workspaces = input && typeof input === 'object' ? input.workspaces : undefined
  if (workspaces === null || typeof workspaces !== 'object' || Array.isArray(workspaces)) return out
  for (const [workspaceId, entry] of Object.entries(workspaces)) {
    if (workspaceId === '' || entry === null || typeof entry !== 'object') continue
    const clean = {}
    if (typeof entry.on === 'boolean') clean.on = entry.on
    const sessions = {}
    if (entry.sessions !== null && typeof entry.sessions === 'object' && !Array.isArray(entry.sessions)) {
      for (const [sessionId, value] of Object.entries(entry.sessions)) {
        if (sessionId !== '' && typeof value === 'boolean') sessions[sessionId] = value
      }
    }
    if (Object.keys(sessions).length > 0) clean.sessions = sessions
    if (Object.keys(clean).length > 0) out.workspaces[workspaceId] = clean
  }
  return out
}

/**
 * Whether a conversation should notify under the given rules.
 * @param rules - sanitised rules.
 * @param workspaceId - the conversation's workspace, when known.
 * @param sessionId - the conversation.
 * @returns true to notify.
 */
export function shouldNotify(rules, workspaceId, sessionId) {
  const entry = workspaceId === undefined ? undefined : rules.workspaces[workspaceId]
  for (const [id, value] of Object.entries(rules.workspaces)) {
    // The conversation's own entry wins, wherever it is filed (a moved
    // conversation keeps its choice).
    if (id !== workspaceId && value.sessions?.[sessionId] !== undefined) return value.sessions[sessionId]
  }
  const own = entry?.sessions?.[sessionId]
  if (own !== undefined) return own
  return entry?.on !== false
}
