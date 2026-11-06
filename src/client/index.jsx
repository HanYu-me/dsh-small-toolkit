/**
 * dsh-small-toolkit, browser half: the settings page for the plugin's row on the
 * Plugins page (slot `plugins.row.config`, key `dsh-small-toolkit#small-toolkit`).
 * It draws one switch per feature and the few options next to them; every change
 * goes through the entry's form (`form.mutate`) into the profile's config and
 * reaches the running plugin at once, because the matching Config fields are
 * volatile (see lib/config.js).
 *
 * Failure policy: apply() must never throw — the shell treats a plugin that
 * fails to activate as fatal.
 */
import { useEffect, useState } from 'react'
import { en, zh } from './locale.js'

export const name = 'dsh-small-toolkit-client'
export const inject = ['slots', 'locale']

const NS = 'dshSmallToolkit'
const ROW_KEY = 'dsh-small-toolkit#small-toolkit'

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 640 },
  group: { padding: '6px 0', borderTop: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25))' },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' },
  title: { fontWeight: 600, color: 'var(--dsw-alias-label-primary, inherit)' },
  hint: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #888)', marginTop: 2 },
  sub: { display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0 6px 16px' },
  grow: { flex: 1, minWidth: 0 },
  note: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #888)', padding: '8px 0' },
  number: {
    width: 76, padding: '4px 8px', font: 'inherit', textAlign: 'right',
    color: 'var(--dsw-alias-label-primary, inherit)',
    background: 'var(--dsw-alias-bg-layer-2, rgba(128,128,128,.12))',
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35))', borderRadius: 6,
  },
}

/** A switch: a button with role=switch, so it is keyboard- and screen-reader-friendly. */
function Switch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => { onChange(!checked) }}
      style={{
        flex: 'none', width: 40, height: 22, padding: 2, borderRadius: 999, border: 0,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        background: checked ? 'var(--dsw-alias-accent, #3e63dd)' : 'var(--dsw-alias-border-l3, rgba(128,128,128,.45))',
        transition: 'background 120ms',
      }}
    >
      <span style={{
        display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transform: checked ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 120ms',
      }}
      />
    </button>
  )
}

function Row({ title, hint, sub, children }) {
  return (
    <div style={sub ? styles.sub : styles.head}>
      <div style={styles.grow}>
        <div style={sub ? undefined : styles.title}>{title}</div>
        {hint ? <div style={styles.hint}>{hint}</div> : null}
      </div>
      {children}
    </div>
  )
}

/** One number field that commits on blur or Enter (not on every keystroke). */
function NumberField({ value, min, max, disabled, onCommit, label }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => { setDraft(String(value)) }, [value])
  const commit = () => {
    const n = Math.round(Number(draft))
    if (!Number.isFinite(n) || draft.trim() === '') { setDraft(String(value)); return }
    const clamped = Math.min(max, Math.max(min, n))
    setDraft(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }
  return (
    <input
      type="number"
      aria-label={label}
      value={draft}
      min={min}
      max={max}
      disabled={disabled}
      style={styles.number}
      onChange={(event) => { setDraft(event.target.value) }}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
    />
  )
}

/**
 * The page. `form` is `{ state, mutate }` from the Plugins page: `state.value` is
 * the live config, `state.writable` says whether writes are accepted, and
 * `mutate(ops, revision)` saves atomically.
 */
export function ToolkitConfig({ t, view, form }) {
  const [pending, setPending] = useState({})
  const revision = form?.state?.revision
  // A new revision means the host confirmed (or refused) the writes: drop the optimistic copies.
  useEffect(() => { setPending({}) }, [revision])
  if (view === 'summary') return t('summary')
  const state = form?.state
  if (form === undefined || state === undefined || state.status === 'loading' || state.value === undefined) {
    return <div style={styles.note}>{t('unavailable')}</div>
  }
  const writable = state.writable !== false
  const read = (group, key, fallback) => {
    const id = `${group}.${key}`
    if (id in pending) return pending[id]
    const value = state.value?.[group]?.[key]
    return value === undefined ? fallback : value
  }
  const write = async (group, key, value) => {
    const id = `${group}.${key}`
    setPending((previous) => ({ ...previous, [id]: value }))
    const ok = await form.mutate([{ op: 'set', path: [group, key], value }], state.revision)
    if (!ok) setPending((previous) => { const next = { ...previous }; delete next[id]; return next })
  }
  const notifyOn = read('taskNotify', 'enabled', true) !== false
  return (
    <div style={styles.page} data-small-toolkit-config="">
      {writable ? null : <div style={styles.note}>{t('readOnly')}</div>}
      <div style={styles.group}>
        <Row title={t('keepAwake.title')} hint={t('keepAwake.hint')}>
          <Switch
            label={t('keepAwake.title')}
            checked={read('keepAwake', 'enabled', true) !== false}
            disabled={!writable}
            onChange={(value) => { void write('keepAwake', 'enabled', value) }}
          />
        </Row>
      </div>
      <div style={styles.group}>
        <Row title={t('taskNotify.title')} hint={t('taskNotify.hint')}>
          <Switch
            label={t('taskNotify.title')}
            checked={notifyOn}
            disabled={!writable}
            onChange={(value) => { void write('taskNotify', 'enabled', value) }}
          />
        </Row>
        <Row sub title={t('taskNotify.sound')}>
          <Switch
            label={t('taskNotify.sound')}
            checked={read('taskNotify', 'sound', true) !== false}
            disabled={!writable || !notifyOn}
            onChange={(value) => { void write('taskNotify', 'sound', value) }}
          />
        </Row>
        <Row sub title={t('taskNotify.aborted')} hint={t('taskNotify.abortedHint')}>
          <Switch
            label={t('taskNotify.aborted')}
            checked={read('taskNotify', 'notifyOnAborted', false) === true}
            disabled={!writable || !notifyOn}
            onChange={(value) => { void write('taskNotify', 'notifyOnAborted', value) }}
          />
        </Row>
        <Row sub title={t('taskNotify.click')} hint={t('taskNotify.clickHint')}>
          <Switch
            label={t('taskNotify.click')}
            checked={read('taskNotify', 'clickOpensApp', true) !== false}
            disabled={!writable || !notifyOn}
            onChange={(value) => { void write('taskNotify', 'clickOpensApp', value) }}
          />
        </Row>
        <Row sub title={t('taskNotify.minDuration')} hint={t('taskNotify.minDurationHint')}>
          <NumberField
            label={t('taskNotify.minDuration')}
            value={Number(read('taskNotify', 'minDurationSec', 0)) || 0}
            min={0}
            max={3600}
            disabled={!writable || !notifyOn}
            onCommit={(value) => { void write('taskNotify', 'minDurationSec', value) }}
          />
        </Row>
      </div>
      <div style={styles.note}>{t('footer')}</div>
    </div>
  )
}

/**
 * Register the page. Wrapped so a duplicate registration (the shell may import
 * this bundle twice on one page load) can never throw out of apply().
 * @param {object} ctx - the browser plugin context.
 */
export function apply(ctx) {
  try {
    try {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-small-toolkit: dictionaries')
    } catch (error) {
      console.error('[dsh-small-toolkit] dictionary registration skipped:', error)
    }
    ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
      name: 'plugins.row.config',
      key: ROW_KEY,
      locale: NS,
    }, ToolkitConfig))
  } catch (error) {
    console.error('[dsh-small-toolkit] settings page registration skipped:', error)
  }
}
