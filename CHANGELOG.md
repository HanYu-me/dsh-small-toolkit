# Changelog

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
