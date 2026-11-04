# DSH Turn Notifier · 完成与提问提醒

给 [DeepSeek Harness](https://github.com/deepseek-ai) 加一层 ChatGPT 式的提醒：

- **任务跑完** → 右下角弹一张卡片 + 一声提示音
- **Agent 需要你回答** → 换一声"疑问音"，弹一张琥珀色卡片，标题就是它问你的问题

纯 **Client 半**插件：不碰 Host、不发起任何网络请求、不上报任何数据。

---

## 功能

| 场景 | 表现 |
|---|---|
| 会话回合结束 | 右下角卡片（标题 / 已完成 · 用时 X） + 提示音 |
| 你正在看这个会话且窗口有焦点 | 不弹（不打扰），只记一次"专注静默" |
| Agent 提问、等你回答 | 疑问音 + 琥珀色 `?` 卡片（问题原文 + 来源会话） |
| 一次问多个问题 | 合并成一张卡，标注"共 N 个问题" |
| 子代理完成 / 提问 | 忽略 |
| DSH 不在前台 | 追加一条 Windows 系统通知，点击跳回该会话 |
| 点击卡片 | 跳回对应会话 |

## 可调项（插件页 → 完成提醒 → 提醒设置）

- 卡片宽度 320–560px、字号 85%–150%
- 提示音六选一（经典双音 / 清脆 / 木琴 / 琶音 / 钟声 / 水滴），选中即试听
- 音量 0–100%、一键静音
- 系统通知开关（DSH 不在前台时用 Windows 通知）
- 预览卡片 / 预览提问 / 试听 / 恢复默认

## 安装

插件是标准的 Harness bundle（`dsh.bundle.patch` + 可选的 `dsh.client`），没有任何 npm 依赖、没有构建步骤。

### 把这段话直接发给朋友的 DSH Agent

> 把这个仓库装成 DeepSeek Harness 插件：先 `git clone https://github.com/lilliquidbird/dsh-turn-notifier` 到本地任意目录，然后用 `plugin_manager` 的 `install_bundle`，target 传那个目录的**绝对路径**；装完告诉我刷新页面。这个包没有 npm 依赖、没有构建步骤，不需要批准任何 build script。

Agent 需要知道的四点：

1. 这是标准 Harness bundle：`dsh.bundle.patch` 指向 `cordis.patch.yml`，Client 半由 `dsh.client` 声明
2. `install_bundle` 的 target 必须是**绝对目录路径**，不是 git URL
3. 装完必须刷新一次页面（`Ctrl+R`），客户端代码才会加载
4. 刷新后右下角会出现一张"完成提醒已就绪"的卡片，看到它就算装好了

**方式一：让 Agent 装（推荐）**

把目录放到任意位置，然后在 DSH 里让 Agent 执行：

```
plugin_manager install_bundle  target = <这个目录的绝对路径>
```

**方式二：手动**

1. 把本目录放到一个固定位置
2. 在 profile 的 `package.json` 里加入依赖：
   ```json
   "@local/dsh-turn-notifier": "link:E:/path/to/dsh-turn-notifier"
   ```
3. 在同一个 `package.json` 的 `dsh.profile.bundles` 数组里加入 `"@local/dsh-turn-notifier"`
4. 在该 profile 目录执行 `pnpm install`
5. 刷新 DSH 页面（Ctrl+R）

> 装完刷新一次页面，右下角会出现"完成提醒已就绪"的欢迎卡片。

## 兼容性

- `engines.dsh`: `>=0.2.0-rc.2 <0.3.0-0`
- 在 DeepSeek Harness 桌面版 `0.2.1-rc.2` 上实际验证
- 依赖的扩展点：`shell.overlay`、`plugins.bundle.config`、客户端 `sessions` 服务、`userQuestions` 会话投影

## 隐私与数据

这个插件**不联网**。代码里没有任何 `fetch` / `XMLHttpRequest` / `WebSocket`。

运行时会读取（全部只在本机内存/界面上使用）：

- 会话列表的标题与运行状态 —— 用来判断"哪个会话完成了"
- `userQuestions` 投影里的问题文本 —— 用来生成提醒卡片的标题
- 你自己的偏好设置 —— 存在本机 cookie 与 localStorage 里

数据不会离开这台机器。唯一的"外部"去处是 Windows 通知中心（`Notification` API）——它同样在本机。

注意：系统通知的正文带着**会话标题和提问原文**，它会被 Windows 写进通知中心的历史记录并长期留存
（`%LOCALAPPDATA%\Microsoft\Windows\Notifications\wpndatabase.db`）。共享屏幕、录屏或别人用这台机器时会看到；
在意的话可以关掉「系统通知」开关，或在 Windows 设置 → 系统 → 通知里关闭通知历史。

## 已知限制

- 设置存在 cookie 而不是 localStorage：DSH 桌面版每次启动端口随机，localStorage 按 origin 隔离会丢设置，cookie 不区分端口。
- 检测在页面侧完成；如果页面被浏览器完全冻结（而非仅隐藏），可能漏一次提醒。
- 提问提示音是固定音色，不跟随"提示音"下拉。

## License

MIT
