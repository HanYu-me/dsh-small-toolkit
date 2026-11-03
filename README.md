# dsh-small-toolkit

DeepSeek Harness（dsh）的小功能合集。每个功能是 `lib/features/` 下的一个文件，可以分别开关。

## 功能

| 功能 | 配置键 | 作用 |
|---|---|---|
| 保持亮屏 | `keepAwake` | dsh 运行期间阻止 Mac 息屏和休眠（`caffeinate -di -w <dsh 进程>`），dsh 退出后自动解除 |
| 任务完成提醒 | `taskNotify` | 主对话的一轮任务结束时，弹出 macOS 系统通知：对话标题、结果（完成 / 出错 / 被拦截 / 输出达到上限）和用时。**点击通知会切回 DeepSeek Harness 窗口**。子智能体、Agent Teams 成员不提醒；你手动停止的任务默认不提醒 |

两项功能都只在 macOS 上生效。

## 安装

```bash
dsh plugin --profile web add github:HanYu-me/dsh-small-toolkit
# 桌面版：dsh plugin --profile desktop add github:HanYu-me/dsh-small-toolkit
```

装好后重启 dsh。也可以从 [Releases](https://github.com/HanYu-me/dsh-small-toolkit/releases) 下载预构建的 `dsh-small-toolkit.tgz` 安装。

卸载：`dsh plugin --profile web remove dsh-small-toolkit`，然后重启 dsh。

## 手动开关

每个功能都可以随时手动开关，**不用重启 dsh**。编辑（首次加载插件时自动生成）：

`~/Library/Application Support/dsh-small-toolkit/settings.json`

```json
{
  "keepAwake": true,
  "taskNotify": false
}
```

- `taskNotify`：每次任务结束时读取开关，关掉后不再弹通知。
- `keepAwake`：每 3 秒读取一次，关掉会立刻释放防休眠，重新打开则再次接管。
- 文件缺失、不是合法 JSON、或没写某个功能时，该功能保持开启。
- 想让某个功能彻底不加载，仍然用下面 `cordis.patch.yml` 里的 `enabled: false`。

## 配置

在 profile 的 `cordis.patch.yml` 里给 `small-toolkit` 这一行加 `config:`，改完重启 dsh：

```yaml
- id: small-toolkit
  config:
    keepAwake:
      enabled: true
    taskNotify:
      enabled: true
      notifyOn: [completed, error, blocked, max-tokens]   # 加上 aborted 则手动停止也提醒
      minDurationSec: 0                                    # 例如 30：只提醒用时 30 秒以上的任务
      sound: true                                          # false 为静音
      clickOpensApp: true                                  # 关掉后改回普通通知（点击会打开脚本编辑器）
      appBundleId: com.deepseek.dsh                         # 点击通知时切到的应用
```

## 关于通知

- 通知通过一个随插件自动构建的小助手 App 发出，名字叫「DSH 提醒」、图标是 DeepSeek Harness 的鲸鱼，安装在 `~/Applications/DSHNotifier.app`。**点击通知会把 DeepSeek Harness 切到前台**；如果 DSH 已经退出，则会重新打开它。
- 第一次发通知时，macOS 会问一次「"DSH 提醒"想要发送通知」，点「允许」即可；之后不会再问。也可以在「系统设置 → 通知 → DSH 提醒」里调整样式或关闭。
- 构建助手需要 Swift 工具链（安装 Xcode Command Line Tools 即可，`xcrun -f swiftc` 能用就行）。没有工具链时插件会自动退回普通通知：仍然会提醒，但点击它会打开「脚本编辑器」，而不是 DSH。日志在 `~/Library/Application Support/dsh-small-toolkit/notifier.log`。
- 开启「专注模式」时通知会被静默。

## 添加新功能

1. 在 `lib/features/` 新建一个文件，导出 `id`、`defaults`（至少 `{ enabled: true }`）和 `apply(ctx, config)`。
2. 在 `lib/index.js` 的 `features` 列表里加上它。
3. `npm test`，然后在 dsh 里关闭再打开这个插件（或重启 dsh）。

## 许可

[MIT](./LICENSE) © Yu Han
