window.__ModuleLoader__.load({ id: "dsh-small-toolkit", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	try {
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  ToolkitConfig: () => ToolkitConfig,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react2 = require("react");

// src/client/NotifyRules.jsx
var import_react = require("react");

// lib/rules-core.js
function shouldNotify(rules, workspaceId, sessionId) {
  const entry = workspaceId === void 0 ? void 0 : rules.workspaces[workspaceId];
  for (const [id, value] of Object.entries(rules.workspaces)) {
    if (id !== workspaceId && value.sessions?.[sessionId] !== void 0) return value.sessions[sessionId];
  }
  const own = entry?.sessions?.[sessionId];
  if (own !== void 0) return own;
  return entry?.on !== false;
}

// src/client/NotifyRules.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var ENDPOINT = "/small-toolkit/notify-rules";
var MAX_ROWS = 200;
var styles = {
  box: { display: "flex", flexDirection: "column", gap: 2 },
  bar: { display: "flex", alignItems: "center", gap: 12, padding: "4px 0 8px" },
  link: {
    border: 0,
    background: "transparent",
    padding: 0,
    font: "inherit",
    cursor: "pointer",
    color: "var(--dsw-alias-label-secondary, #888)",
    textDecoration: "underline"
  },
  ws: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0" },
  caret: {
    flex: "none",
    width: 20,
    height: 20,
    border: 0,
    background: "transparent",
    cursor: "pointer",
    color: "var(--dsw-alias-label-secondary, #888)",
    font: "inherit",
    padding: 0
  },
  name: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 },
  count: { flex: "none", fontSize: 12, color: "var(--dsw-alias-label-secondary, #888)" },
  session: { display: "flex", alignItems: "center", gap: 8, padding: "3px 0 3px 30px" },
  sessionName: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  tag: {
    flex: "none",
    fontSize: 11,
    padding: "0 6px",
    borderRadius: 999,
    border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35))",
    color: "var(--dsw-alias-label-secondary, #888)"
  },
  filter: {
    margin: "2px 0 4px 30px",
    padding: "4px 8px",
    font: "inherit",
    width: 220,
    color: "var(--dsw-alias-label-primary, inherit)",
    background: "var(--dsw-alias-bg-layer-2, rgba(128,128,128,.12))",
    border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35))",
    borderRadius: 6
  },
  note: { fontSize: 12, color: "var(--dsw-alias-label-secondary, #888)", padding: "4px 0" }
};
function useList(list) {
  const subscribe = (listener) => typeof list?.subscribe === "function" ? list.subscribe(listener) : () => {
  };
  const get = () => typeof list?.getSnapshot === "function" ? list.getSnapshot() : void 0;
  return (0, import_react.useSyncExternalStore)(subscribe, get, get);
}
function Check({ state, onChange, label, disabled }) {
  const ref = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (ref.current !== null) ref.current.indeterminate = state === "mixed";
  }, [state]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "input",
    {
      ref,
      type: "checkbox",
      "aria-label": label,
      checked: state === "on",
      disabled,
      onChange: () => {
        onChange(state !== "on");
      }
    }
  );
}
function withWorkspace(rules, workspaceId, on) {
  return { workspaces: { ...rules.workspaces, [workspaceId]: { on } } };
}
function withSession(rules, workspaceId, sessionId, on) {
  const entry = rules.workspaces[workspaceId] ?? {};
  const sessions = { ...entry.sessions };
  if (on === (entry.on !== false)) delete sessions[sessionId];
  else sessions[sessionId] = on;
  const next = { ...entry };
  if (Object.keys(sessions).length > 0) next.sessions = sessions;
  else delete next.sessions;
  const workspaces = { ...rules.workspaces };
  if (Object.keys(next).length > 0) workspaces[workspaceId] = next;
  else delete workspaces[workspaceId];
  return { workspaces };
}
function NotifyRules({ t, services: services2, disabled }) {
  const workspaceList = useList(services2?.workspaces?.list);
  const sessionList = useList(services2?.sessions?.list);
  const [rules, setRules] = (0, import_react.useState)(null);
  const [failed, setFailed] = (0, import_react.useState)(false);
  const [open, setOpen] = (0, import_react.useState)({});
  const [filters, setFilters] = (0, import_react.useState)({});
  const load = () => {
    fetch(ENDPOINT).then((response) => response.json()).then((body) => {
      setRules(body.rules ?? { workspaces: {} });
      setFailed(false);
    }).catch(() => {
      setFailed(true);
    });
  };
  (0, import_react.useEffect)(load, []);
  const save = (next) => {
    setRules(next);
    fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(next) }).then((response) => response.json()).then((body) => {
      if (body.rules !== void 0) setRules(body.rules);
    }).catch(() => {
      load();
    });
  };
  if (failed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.note, children: t("rules.failed") });
  if (rules === null) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.note, children: t("rules.loading") });
  if (workspaceList === void 0 || sessionList === void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.note, children: t("rules.noServices") });
  const archived = new Set(workspaceList.archivedSessionIds ?? []);
  const workspaces = (workspaceList.items ?? []).map((workspace) => {
    const sessions = (workspace.sessionIds ?? []).map((id) => ({ id, summary: sessionList.byId?.[id] })).filter(({ summary }) => summary !== void 0 && summary.blank !== true && summary.origin !== "subagent").sort((a, b) => (b.summary.updatedAt ?? 0) - (a.summary.updatedAt ?? 0));
    const onCount = sessions.filter(({ id }) => shouldNotify(rules, workspace.workspaceId, id)).length;
    return { workspace, sessions, onCount };
  });
  const setAll = (on) => {
    save({ workspaces: Object.fromEntries(workspaces.map(({ workspace }) => [workspace.workspaceId, { on }])) });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.box, "data-small-toolkit-rules": "", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.bar, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.link, disabled, onClick: () => {
        setAll(true);
      }, children: t("rules.allOn") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.link, disabled, onClick: () => {
        setAll(false);
      }, children: t("rules.allOff") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.note, children: t("rules.default") })
    ] }),
    workspaces.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.note, children: t("rules.empty") }) : null,
    workspaces.map(({ workspace, sessions, onCount }) => {
      const id = workspace.workspaceId;
      const state = onCount === 0 ? "off" : onCount === sessions.length ? "on" : "mixed";
      const expanded = open[id] === true;
      const needle = (filters[id] ?? "").trim().toLowerCase();
      const shown = sessions.filter(({ summary }) => needle === "" || String(summary.displayTitle ?? "").toLowerCase().includes(needle));
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { "data-small-toolkit-workspace": id, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.ws, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              style: styles.caret,
              "aria-expanded": expanded,
              "aria-label": t(expanded ? "rules.collapse" : "rules.expand"),
              onClick: () => {
                setOpen((previous) => ({ ...previous, [id]: !expanded }));
              },
              children: expanded ? "▾" : "▸"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            Check,
            {
              state,
              disabled,
              label: workspace.title,
              onChange: (on) => {
                save(withWorkspace(rules, id, on));
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.name, title: workspace.title, children: workspace.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: styles.count, children: [
            onCount,
            " / ",
            sessions.length
          ] })
        ] }),
        expanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          sessions.length > 10 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              style: styles.filter,
              placeholder: t("rules.filter"),
              value: filters[id] ?? "",
              onChange: (event) => {
                setFilters((previous) => ({ ...previous, [id]: event.target.value }));
              }
            }
          ) : null,
          shown.slice(0, MAX_ROWS).map(({ id: sessionId, summary }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: styles.session, "data-small-toolkit-session": sessionId, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Check,
              {
                state: shouldNotify(rules, id, sessionId) ? "on" : "off",
                disabled,
                label: summary.displayTitle ?? sessionId,
                onChange: (on) => {
                  save(withSession(rules, id, sessionId, on));
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.sessionName, title: summary.displayTitle, children: summary.displayTitle ?? sessionId }),
            archived.has(sessionId) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.tag, children: t("rules.archived") }) : null
          ] }, sessionId)),
          shown.length > MAX_ROWS ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.note, children: t("rules.more", { n: String(shown.length - MAX_ROWS) }) }) : null,
          shown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...styles.note, paddingLeft: 30 }, children: t("rules.none") }) : null
        ] }) : null
      ] }, id);
    })
  ] });
}

// src/client/locale.js
var zh = {
  summary: "保持亮屏和任务完成提醒两个小功能，可以分别开关。",
  unavailable: "设置暂时不可用（插件还没有加载，或当前配置不可编辑）。",
  readOnly: "当前配置只读，开关不可修改。",
  "keepAwake.title": "保持亮屏",
  "keepAwake.hint": "dsh 运行期间不让屏幕和系统休眠，dsh 退出后自动解除。",
  "taskNotify.title": "任务完成提醒",
  "taskNotify.hint": "主对话一轮任务结束时弹出系统通知，写明结果和用时。子智能体和 Agent Teams 成员不提醒。",
  "taskNotify.sound": "提示音",
  "taskNotify.aborted": "手动停止时也提醒",
  "taskNotify.abortedHint": "默认你自己按停止的任务不提醒。",
  "taskNotify.click": "点击通知切回 dsh",
  "taskNotify.clickHint": "关掉后改用普通通知（点击会打开「脚本编辑器」）。",
  "taskNotify.minDuration": "最短用时（秒）",
  "taskNotify.minDurationHint": "只提醒用时不少于这么多秒的任务；0 表示全部提醒。",
  "rules.title": "选择哪些对话提醒",
  "rules.hint": "以工作区为大单位、对话为小单位：整个工作区可以开或关，再在里面单独挑几个例外。勾上的对话结束任务时会提醒。",
  "rules.allOn": "全部开启",
  "rules.allOff": "全部关闭",
  "rules.default": "没设置过的默认都提醒。点工作区的勾选框会整个切换，展开后可以单独改某个对话。",
  "rules.expand": "展开",
  "rules.collapse": "收起",
  "rules.filter": "搜索对话…",
  "rules.archived": "已归档",
  "rules.none": "没有匹配的对话",
  "rules.more": "还有 {n} 个未显示，请用搜索缩小范围",
  "rules.empty": "还没有工作区。",
  "rules.loading": "正在读取…",
  "rules.failed": "读取提醒设置失败（插件的服务端部分还没加载？）。",
  "rules.noServices": "拿不到工作区和对话列表，当前版本的 dsh 可能不支持。",
  footer: "改动立即生效，不需要重启 dsh。仅 macOS 有效。"
};
var en = {
  summary: "Two small features — keep the Mac awake and a task-finished notification — each with its own switch.",
  unavailable: "Settings are not available yet (the plugin has not loaded, or its config is not editable).",
  readOnly: "This configuration is read-only; the switches cannot be changed.",
  "keepAwake.title": "Keep awake",
  "keepAwake.hint": "Stops the display and system from sleeping while dsh runs; released when dsh quits.",
  "taskNotify.title": "Task-finished notification",
  "taskNotify.hint": "A system notification when a top-level conversation finishes its turn, with the outcome and duration. Subagents and Agent Teams members never notify.",
  "taskNotify.sound": "Sound",
  "taskNotify.aborted": "Also notify when I stop a task",
  "taskNotify.abortedHint": "By default a task you stopped yourself stays silent.",
  "taskNotify.click": "Clicking brings dsh forward",
  "taskNotify.clickHint": "Off: a plain notification (clicking it opens Script Editor).",
  "taskNotify.minDuration": "Minimum duration (seconds)",
  "taskNotify.minDurationHint": "Only notify for tasks that took at least this long; 0 notifies for every task.",
  "rules.title": "Which conversations notify",
  "rules.hint": "Workspaces are the big unit, conversations the small one: switch a whole workspace on or off, then pick exceptions inside it. A ticked conversation notifies when its task ends.",
  "rules.allOn": "All on",
  "rules.allOff": "All off",
  "rules.default": "Anything you have not set notifies. The workspace checkbox switches the whole workspace; expand it to change single conversations.",
  "rules.expand": "Expand",
  "rules.collapse": "Collapse",
  "rules.filter": "Search conversations…",
  "rules.archived": "Archived",
  "rules.none": "No matching conversations",
  "rules.more": "{n} more not shown — narrow it with the search",
  "rules.empty": "No workspaces yet.",
  "rules.loading": "Loading…",
  "rules.failed": "Could not read the notification settings (is the host half loaded?).",
  "rules.noServices": "The workspace and conversation lists are not available; this dsh version may not support it.",
  footer: "Changes apply immediately, no dsh restart. macOS only."
};

// src/client/index.jsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var name = "dsh-small-toolkit-client";
var inject = ["slots", "locale", "sessions", "workspaces"];
function ping(phase, detail) {
  try {
    void fetch("/small-toolkit/client-boot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase, ...detail === void 0 ? {} : { detail } })
    }).catch(() => {
    });
  } catch {
  }
}
var services;
var NS = "dshSmallToolkit";
var ROW_KEY = "dsh-small-toolkit#small-toolkit";
var styles2 = {
  page: { display: "flex", flexDirection: "column", gap: 4, maxWidth: 640 },
  group: { padding: "6px 0", borderTop: "1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25))" },
  head: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0" },
  title: { fontWeight: 600, color: "var(--dsw-alias-label-primary, inherit)" },
  hint: { fontSize: 12, color: "var(--dsw-alias-label-secondary, #888)", marginTop: 2 },
  sub: { display: "flex", alignItems: "center", gap: 12, padding: "6px 0 6px 16px" },
  grow: { flex: 1, minWidth: 0 },
  note: { fontSize: 12, color: "var(--dsw-alias-label-secondary, #888)", padding: "8px 0" },
  number: {
    width: 76,
    padding: "4px 8px",
    font: "inherit",
    textAlign: "right",
    color: "var(--dsw-alias-label-primary, inherit)",
    background: "var(--dsw-alias-bg-layer-2, rgba(128,128,128,.12))",
    border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35))",
    borderRadius: 6
  }
};
function Switch({ checked, disabled, onChange, label }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": checked,
      "aria-label": label,
      disabled,
      onClick: () => {
        onChange(!checked);
      },
      style: {
        flex: "none",
        width: 40,
        height: 22,
        padding: 2,
        borderRadius: 999,
        border: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: checked ? "var(--dsw-alias-accent, #3e63dd)" : "var(--dsw-alias-border-l3, rgba(128,128,128,.45))",
        transition: "background 120ms"
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "span",
        {
          style: {
            display: "block",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transform: checked ? "translateX(18px)" : "translateX(0)",
            transition: "transform 120ms"
          }
        }
      )
    }
  );
}
function Row({ title, hint, sub, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: sub ? styles2.sub : styles2.head, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.grow, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: sub ? void 0 : styles2.title, children: title }),
      hint ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.hint, children: hint }) : null
    ] }),
    children
  ] });
}
function NumberField({ value, min, max, disabled, onCommit, label }) {
  const [draft, setDraft] = (0, import_react2.useState)(String(value));
  (0, import_react2.useEffect)(() => {
    setDraft(String(value));
  }, [value]);
  const commit = () => {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n) || draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "input",
    {
      type: "number",
      "aria-label": label,
      value: draft,
      min,
      max,
      disabled,
      style: styles2.number,
      onChange: (event) => {
        setDraft(event.target.value);
      },
      onBlur: commit,
      onKeyDown: (event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }
    }
  );
}
function ToolkitConfig({ t, view, form }) {
  const [pending, setPending] = (0, import_react2.useState)({});
  (0, import_react2.useEffect)(() => {
    ping("page-shown", { view, form: form === void 0 ? "none" : form.state?.status ?? "unknown" });
  }, [view, form === void 0]);
  const revision = form?.state?.revision;
  (0, import_react2.useEffect)(() => {
    setPending({});
  }, [revision]);
  if (view === "summary") return t("summary");
  const state = form?.state;
  if (form === void 0 || state === void 0 || state.status === "loading" || state.value === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.note, children: t("unavailable") });
  }
  const writable = state.writable !== false;
  const read = (group, key, fallback) => {
    const id = `${group}.${key}`;
    if (id in pending) return pending[id];
    const value = state.value?.[group]?.[key];
    return value === void 0 ? fallback : value;
  };
  const write = async (group, key, value) => {
    const id = `${group}.${key}`;
    setPending((previous) => ({ ...previous, [id]: value }));
    const ok = await form.mutate([{ op: "set", path: [group, key], value }], state.revision);
    if (!ok) setPending((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };
  const notifyOn = read("taskNotify", "enabled", true) !== false;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.page, "data-small-toolkit-config": "", children: [
    writable ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.note, children: t("readOnly") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.group, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { title: t("keepAwake.title"), hint: t("keepAwake.hint"), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Switch,
      {
        label: t("keepAwake.title"),
        checked: read("keepAwake", "enabled", true) !== false,
        disabled: !writable,
        onChange: (value) => {
          void write("keepAwake", "enabled", value);
        }
      }
    ) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { title: t("taskNotify.title"), hint: t("taskNotify.hint"), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        Switch,
        {
          label: t("taskNotify.title"),
          checked: notifyOn,
          disabled: !writable,
          onChange: (value) => {
            void write("taskNotify", "enabled", value);
          }
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { sub: true, title: t("taskNotify.sound"), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        Switch,
        {
          label: t("taskNotify.sound"),
          checked: read("taskNotify", "sound", true) !== false,
          disabled: !writable || !notifyOn,
          onChange: (value) => {
            void write("taskNotify", "sound", value);
          }
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { sub: true, title: t("taskNotify.aborted"), hint: t("taskNotify.abortedHint"), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        Switch,
        {
          label: t("taskNotify.aborted"),
          checked: read("taskNotify", "notifyOnAborted", false) === true,
          disabled: !writable || !notifyOn,
          onChange: (value) => {
            void write("taskNotify", "notifyOnAborted", value);
          }
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { sub: true, title: t("taskNotify.click"), hint: t("taskNotify.clickHint"), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        Switch,
        {
          label: t("taskNotify.click"),
          checked: read("taskNotify", "clickOpensApp", true) !== false,
          disabled: !writable || !notifyOn,
          onChange: (value) => {
            void write("taskNotify", "clickOpensApp", value);
          }
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { sub: true, title: t("taskNotify.minDuration"), hint: t("taskNotify.minDurationHint"), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        NumberField,
        {
          label: t("taskNotify.minDuration"),
          value: Number(read("taskNotify", "minDurationSec", 0)) || 0,
          min: 0,
          max: 3600,
          disabled: !writable || !notifyOn,
          onCommit: (value) => {
            void write("taskNotify", "minDurationSec", value);
          }
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Row, { title: t("rules.title"), hint: t("rules.hint") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(NotifyRules, { t, services, disabled: !writable || !notifyOn })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.note, children: t("footer") })
  ] });
}
function apply(ctx) {
  ping("apply");
  try {
    services = {
      sessions: (() => {
        try {
          return ctx.sessions;
        } catch {
          return void 0;
        }
      })(),
      workspaces: (() => {
        try {
          return ctx.workspaces;
        } catch {
          return void 0;
        }
      })()
    };
    try {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-small-toolkit: dictionaries");
    } catch (error) {
      console.error("[dsh-small-toolkit] dictionary registration skipped:", error);
    }
    ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
      name: "plugins.row.config",
      key: ROW_KEY,
      locale: NS
    }, ToolkitConfig));
    ping("registered");
  } catch (error) {
    ping("register-failed", String(error));
    console.error("[dsh-small-toolkit] settings page registration skipped:", error);
  }
}
	} catch (error) {
		// A plugin must never be able to kill the whole boot: degrade to an inert module.
		console.error('[dsh-small-toolkit] client bundle failed to evaluate (inert this boot):', error);
		return { name: "dsh-small-toolkit", apply() {} };
	}
	return module.exports;
}
});

