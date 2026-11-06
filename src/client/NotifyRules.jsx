/**
 * "Which conversations notify": workspaces as the big unit, the conversations
 * inside them as the small one. A workspace checkbox switches the whole
 * workspace (and clears its per-conversation choices); a conversation checkbox
 * overrides it. The rules live on the host (/small-toolkit/notify-rules, see
 * lib/routes.js); this component only edits them.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { shouldNotify } from '../../lib/rules-core.js'

const ENDPOINT = '/small-toolkit/notify-rules'
const MAX_ROWS = 200

const styles = {
  box: { display: 'flex', flexDirection: 'column', gap: 2 },
  bar: { display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 8px' },
  link: {
    border: 0, background: 'transparent', padding: 0, font: 'inherit', cursor: 'pointer',
    color: 'var(--dsw-alias-label-secondary, #888)', textDecoration: 'underline',
  },
  ws: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' },
  caret: {
    flex: 'none', width: 20, height: 20, border: 0, background: 'transparent', cursor: 'pointer',
    color: 'var(--dsw-alias-label-secondary, #888)', font: 'inherit', padding: 0,
  },
  name: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 },
  count: { flex: 'none', fontSize: 12, color: 'var(--dsw-alias-label-secondary, #888)' },
  session: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0 3px 30px' },
  sessionName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tag: {
    flex: 'none', fontSize: 11, padding: '0 6px', borderRadius: 999,
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35))', color: 'var(--dsw-alias-label-secondary, #888)',
  },
  filter: {
    margin: '2px 0 4px 30px', padding: '4px 8px', font: 'inherit', width: 220,
    color: 'var(--dsw-alias-label-primary, inherit)', background: 'var(--dsw-alias-bg-layer-2, rgba(128,128,128,.12))',
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35))', borderRadius: 6,
  },
  note: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #888)', padding: '4px 0' },
}

/** A snapshot-store list (`{ getSnapshot, subscribe }`) as a React value; undefined when the host has none. */
function useList(list) {
  const subscribe = (listener) => (typeof list?.subscribe === 'function' ? list.subscribe(listener) : () => {})
  const get = () => (typeof list?.getSnapshot === 'function' ? list.getSnapshot() : undefined)
  return useSyncExternalStore(subscribe, get, get)
}

/** A checkbox that can show the "some of them" state. */
function Check({ state, onChange, label, disabled }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current !== null) ref.current.indeterminate = state === 'mixed' }, [state])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={state === 'on'}
      disabled={disabled}
      onChange={() => { onChange(state !== 'on') }}
    />
  )
}

/** The rules after a whole workspace is switched: its per-conversation choices are dropped. */
export function withWorkspace(rules, workspaceId, on) {
  return { workspaces: { ...rules.workspaces, [workspaceId]: { on } } }
}

/** The rules after one conversation is switched: stored only when it differs from its workspace. */
export function withSession(rules, workspaceId, sessionId, on) {
  const entry = rules.workspaces[workspaceId] ?? {}
  const sessions = { ...entry.sessions }
  if (on === (entry.on !== false)) delete sessions[sessionId]
  else sessions[sessionId] = on
  const next = { ...entry }
  if (Object.keys(sessions).length > 0) next.sessions = sessions
  else delete next.sessions
  const workspaces = { ...rules.workspaces }
  if (Object.keys(next).length > 0) workspaces[workspaceId] = next
  else delete workspaces[workspaceId]
  return { workspaces }
}

export function NotifyRules({ t, services, disabled }) {
  const workspaceList = useList(services?.workspaces?.list)
  const sessionList = useList(services?.sessions?.list)
  const [rules, setRules] = useState(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState({})
  const [filters, setFilters] = useState({})

  const load = () => {
    fetch(ENDPOINT).then(response => response.json()).then((body) => {
      setRules(body.rules ?? { workspaces: {} })
      setFailed(false)
    }).catch(() => { setFailed(true) })
  }
  useEffect(load, [])

  const save = (next) => {
    setRules(next)
    fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) })
      .then(response => response.json())
      .then((body) => { if (body.rules !== undefined) setRules(body.rules) })
      .catch(() => { load() })
  }

  if (failed) return <div style={styles.note}>{t('rules.failed')}</div>
  if (rules === null) return <div style={styles.note}>{t('rules.loading')}</div>
  if (workspaceList === undefined || sessionList === undefined) return <div style={styles.note}>{t('rules.noServices')}</div>

  const archived = new Set(workspaceList.archivedSessionIds ?? [])
  const workspaces = (workspaceList.items ?? []).map((workspace) => {
    const sessions = (workspace.sessionIds ?? [])
      .map(id => ({ id, summary: sessionList.byId?.[id] }))
      .filter(({ summary }) => summary !== undefined && summary.blank !== true && summary.origin !== 'subagent')
      .sort((a, b) => (b.summary.updatedAt ?? 0) - (a.summary.updatedAt ?? 0))
    const onCount = sessions.filter(({ id }) => shouldNotify(rules, workspace.workspaceId, id)).length
    return { workspace, sessions, onCount }
  })
  const setAll = (on) => {
    save({ workspaces: Object.fromEntries(workspaces.map(({ workspace }) => [workspace.workspaceId, { on }])) })
  }

  return (
    <div style={styles.box} data-small-toolkit-rules="">
      <div style={styles.bar}>
        <button type="button" style={styles.link} disabled={disabled} onClick={() => { setAll(true) }}>{t('rules.allOn')}</button>
        <button type="button" style={styles.link} disabled={disabled} onClick={() => { setAll(false) }}>{t('rules.allOff')}</button>
        <span style={styles.note}>{t('rules.default')}</span>
      </div>
      {workspaces.length === 0 ? <div style={styles.note}>{t('rules.empty')}</div> : null}
      {workspaces.map(({ workspace, sessions, onCount }) => {
        const id = workspace.workspaceId
        const state = onCount === 0 ? 'off' : onCount === sessions.length ? 'on' : 'mixed'
        const expanded = open[id] === true
        const needle = (filters[id] ?? '').trim().toLowerCase()
        const shown = sessions.filter(({ summary }) => needle === '' || String(summary.displayTitle ?? '').toLowerCase().includes(needle))
        return (
          <div key={id} data-small-toolkit-workspace={id}>
            <div style={styles.ws}>
              <button
                type="button"
                style={styles.caret}
                aria-expanded={expanded}
                aria-label={t(expanded ? 'rules.collapse' : 'rules.expand')}
                onClick={() => { setOpen(previous => ({ ...previous, [id]: !expanded })) }}
              >
                {expanded ? '▾' : '▸'}
              </button>
              <Check
                state={state}
                disabled={disabled}
                label={workspace.title}
                onChange={(on) => { save(withWorkspace(rules, id, on)) }}
              />
              <span style={styles.name} title={workspace.title}>{workspace.title}</span>
              <span style={styles.count}>{onCount} / {sessions.length}</span>
            </div>
            {expanded
              ? (
                  <div>
                    {sessions.length > 10
                      ? (
                          <input
                            style={styles.filter}
                            placeholder={t('rules.filter')}
                            value={filters[id] ?? ''}
                            onChange={(event) => { setFilters(previous => ({ ...previous, [id]: event.target.value })) }}
                          />
                        )
                      : null}
                    {shown.slice(0, MAX_ROWS).map(({ id: sessionId, summary }) => (
                      <label key={sessionId} style={styles.session} data-small-toolkit-session={sessionId}>
                        <Check
                          state={shouldNotify(rules, id, sessionId) ? 'on' : 'off'}
                          disabled={disabled}
                          label={summary.displayTitle ?? sessionId}
                          onChange={(on) => { save(withSession(rules, id, sessionId, on)) }}
                        />
                        <span style={styles.sessionName} title={summary.displayTitle}>{summary.displayTitle ?? sessionId}</span>
                        {archived.has(sessionId) ? <span style={styles.tag}>{t('rules.archived')}</span> : null}
                      </label>
                    ))}
                    {shown.length > MAX_ROWS ? <div style={styles.note}>{t('rules.more', { n: String(shown.length - MAX_ROWS) })}</div> : null}
                    {shown.length === 0 ? <div style={{ ...styles.note, paddingLeft: 30 }}>{t('rules.none')}</div> : null}
                  </div>
                )
              : null}
          </div>
        )
      })}
    </div>
  )
}
