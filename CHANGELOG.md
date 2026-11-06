# Changelog

## 0.4.0 — 2026-11-06

- A settings page on dsh's Plugins page (row `dsh-small-toolkit#small-toolkit`): a switch per feature plus sound, "also notify when I stop a task", click-to-open and a minimum duration. Changes apply immediately and are saved in the profile config.
- The plugin now ships a browser half (`client/client.js`, built from `src/client/`) and exports a `Config` schema whose switches are `volatile`, so the loader updates the running plugin in place.
- All features always load; their `enabled` switch is read live (`enabled: false` no longer skips loading, it just silences the feature).
- Removed the 0.3.0 `settings.json` switch file; the settings page replaces it.
- New option `notifyOnAborted` (same as adding `aborted` to `notifyOn`).

## 0.3.1 — 2026-11-06

- The notification helper is now compiled through `xcrun swiftc`. Before, the plugin ran the Xcode toolchain's own `swiftc` directly, which cannot find the SDK that way ("unable to load standard library"), so on machines with full Xcode the helper never built and notifications fell back to the AppleScript banner without the whale icon.

## 0.3.0 — 2026-11-03

- Features can be switched on and off by hand: edit `~/Library/Application Support/dsh-small-toolkit/settings.json` (`{ "keepAwake": true, "taskNotify": false }`). No restart needed: `taskNotify` checks the switch on every task end, `keepAwake` re-reads it every 3 seconds and releases or retakes the sleep assertion.
- The file is created with every feature on the first time the plugin loads. A missing or broken file leaves everything on. `enabled: false` in `cordis.patch.yml` still removes a feature completely.

## 0.2.2 — 2026-11-02

- The task-finished notification now carries the DeepSeek Harness whale icon: the helper app bundles the icon and macOS is handed an explicit `CFBundleIconFile`.
- The helper app moved to `~/Applications/DSHNotifier.app` with a fresh bundle identifier, because macOS refused to deliver notifications from a bundle under `~/Library` and cached the old, icon-less identity.
- The helper is rebuilt on demand when it is missing, instead of silently falling back for every notification.
- Two notifications on one task end fixed: the running plugin kept pointing at the previous helper path and fell back to AppleScript.

## 0.2.1 — 2026-11-02

- Clicking a task-finished notification brings DeepSeek Harness forward instead of opening Script Editor, via a helper app built from `lib/features/notifier.swift`.
- Builds the helper with the Swift toolchain; falls back to the AppleScript notification when no toolchain is installed.

## 0.2.0 — 2026-11-02

- Renamed from `dsh-keep-awake` to `dsh-small-toolkit`: one file per feature under `lib/features/`, each switchable, one failing feature never stops the others.
- New feature `taskNotify`: a macOS notification when a conversation finishes its task (outcome and duration, top-level conversations only).

## 0.1.0 — 2026-10-27

- `keepAwake`: keep the Mac display and system awake while DSH runs (`caffeinate -di -w <host pid>`).
