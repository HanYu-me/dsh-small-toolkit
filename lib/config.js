import z from '@deepseek-ai/schemastery'

/**
 * The plugin's settings, as dsh's Plugins page sees them. A field marked
 * `.volatile()` is editable live there (the page this plugin ships under
 * client/ draws the switches); a field without it is only changed in the
 * profile's cordis.patch.yml and needs a restart.
 */
export const Config = z.object({
  keepAwake: z.object({
    enabled: z.boolean().default(true)
      .description('保持亮屏：dsh 运行期间不让屏幕和系统休眠').volatile(),
  }),
  taskNotify: z.object({
    enabled: z.boolean().default(true)
      .description('任务完成提醒：主对话一轮任务结束时弹出系统通知').volatile(),
    notifyOnAborted: z.boolean().default(false)
      .description('你手动停止任务时也提醒').volatile(),
    sound: z.boolean().default(true)
      .description('通知带提示音').volatile(),
    minDurationSec: z.number().step(1).min(0).max(3600).default(0)
      .description('只提醒用时不少于这么多秒的任务（0 = 全部提醒）').volatile(),
    clickOpensApp: z.boolean().default(true)
      .description('点击通知时切回 DeepSeek Harness').volatile(),
    notifyOn: z.array(z.string()).default(['completed', 'error', 'blocked', 'max-tokens'])
      .description('哪些结束方式要提醒（completed / error / blocked / max-tokens / aborted）；改这一项需重启'),
    appBundleId: z.string().default('com.deepseek.dsh')
      .description('点击通知时切到的应用的 bundle id；改这一项需重启'),
  }),
})
