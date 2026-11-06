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
var import_react = require("react");

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
  footer: "Changes apply immediately, no dsh restart. macOS only."
};

// src/client/index.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var name = "dsh-small-toolkit-client";
var inject = ["slots", "locale"];
var NS = "dshSmallToolkit";
var ROW_KEY = "dsh-small-toolkit#small-toolkit";
var styles = {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: sub ? styles.sub : styles.head, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.grow, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: sub ? void 0 : styles.title, children: title }),
      hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.hint, children: hint }) : null
    ] }),
    children
  ] });
}
function NumberField({ value, min, max, disabled, onCommit, label }) {
  const [draft, setDraft] = (0, import_react.useState)(String(value));
  (0, import_react.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "input",
    {
      type: "number",
      "aria-label": label,
      value: draft,
      min,
      max,
      disabled,
      style: styles.number,
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
  const [pending, setPending] = (0, import_react.useState)({});
  const revision = form?.state?.revision;
  (0, import_react.useEffect)(() => {
    setPending({});
  }, [revision]);
  if (view === "summary") return t("summary");
  const state = form?.state;
  if (form === void 0 || state === void 0 || state.status === "loading" || state.value === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.note, children: t("unavailable") });
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.page, "data-small-toolkit-config": "", children: [
    writable ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.note, children: t("readOnly") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.group, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: t("keepAwake.title"), hint: t("keepAwake.hint"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.group, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: t("taskNotify.title"), hint: t("taskNotify.hint"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { sub: true, title: t("taskNotify.sound"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { sub: true, title: t("taskNotify.aborted"), hint: t("taskNotify.abortedHint"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { sub: true, title: t("taskNotify.click"), hint: t("taskNotify.clickHint"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { sub: true, title: t("taskNotify.minDuration"), hint: t("taskNotify.minDurationHint"), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.note, children: t("footer") })
  ] });
}
function apply(ctx) {
  try {
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
  } catch (error) {
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

