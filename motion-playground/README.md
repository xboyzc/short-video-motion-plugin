# Motion Playground

本地运行的横版短视频动效卡片编辑台。页面提供 1920 × 1080 预览画布、视频底图、17 种卡片、SRT 分析源、Overlay JSON、逐帧时间轴、自由拖动缩放，以及透明 PNG / ProRes 4444 MOV 导出。

编辑台只导出透明动效层，不会把卡片合成进原视频。

## 主要功能

- 导入本地 MP4、MOV、M4V、WebM 视频，默认完整显示，不自动裁切。
- 视频可在 25%–250% 之间缩放，并支持播放、暂停、空格控制和逐帧定位。
- SRT 只作为内容分析和时间匹配来源，不会再次显示或进入透明导出。
- 导入完整项目 JSON、Overlay JSON 数组、单卡 JSON。
- 轨道片段和视频共用同一个 `currentTime`，按 25 FPS 同步。
- 卡片可在整张画布内自由拖动，并可通过右下角或滑杆缩放到 45%–220%。
- 人物安全区只作为参考线；“一键避让人物”只执行一次，不会锁住后续编辑。
- 所有可编辑文字均支持颜色、大小和透明度调整。
- 透明 PNG 按帧写入 `exports/overlay_*/frame_00000001.png`。
- 透明 MOV 使用 FFmpeg 编码为 ProRes 4444，并在成功后清理中间帧。
- 内置 `$effect-generation` Skill，可把 SRT 转成经过校验的 Overlay JSON。

## 17 种动效卡片

| 编号 | kind | 名称 |
|---|---|---|
| 01 | `metric-focus` | 核心数字动效 |
| 02 | `compare-split` | 左右对比卡 |
| 03 | `quote-lockup` | 金句定格卡 |
| 04 | `signal-card` | 动态信息卡 |
| 05 | `picture-in-picture` | 画中画动效 |
| 06 | `image-feature` | 图片卡片动效 |
| 07 | `kinetic-text` | 文字卡片动效 |
| 08 | `proof-frame` | 单图证据卡 |
| 09 | `dual-proof` | 双图数据卡 |
| 10 | `process-chain` | 四步流程链 |
| 11 | `insight-grid` | 四点洞察卡 |
| 12 | `chapter-callout` | 章节重点卡 |
| B1 | `icon-breath` | 循环·图标聚焦 |
| B3 | `data-bars` | 循环·数据条 |
| B4 | `step-rail` | 循环·三级步骤轨 |
| B6 | `code-window` | 循环·代码窗口 |
| B7 | `module-grid` | 循环·模块矩阵 |

## Windows 双击启动

运行要求：

- Windows 10 或 Windows 11（64 位）。
- Python 3.9 或更高版本。
- 如需透明 MOV，安装带 `prores_ks` 的 FFmpeg，并把 `ffmpeg.exe` 加入 PATH。脚本也会检查 Winget、Chocolatey、Scoop 和 `C:\ffmpeg\bin` 的常见位置。

使用方法：

1. 下载或克隆仓库。
2. 进入 `motion-playground` 文件夹。
3. 双击 `start-windows.cmd`。
4. 脚本会启动本地服务并自动打开 `http://127.0.0.1:4173/`。
5. 使用完毕后双击 `stop-windows.cmd`。

仓库包含预构建的 `dist/`，普通使用不需要安装 Node.js。只有修改源代码并重新构建时才需要 Node.js 20+ 与 pnpm。

## macOS 双击启动

进入 `motion-playground/scripts`，双击 `start-local.command`。停止服务时双击 `stop-local.command`。

脚本使用相对路径，不依赖某一台 Mac 的用户名或安装目录。

## 从源码开发

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

构建与验证：

```bash
pnpm typecheck
pnpm test:safety
pnpm test:layout
pnpm test:catalog
pnpm test:import
python3 scripts/test_windows_compat.py
pnpm build
```

## 透明导出

- PNG 与 MOV 都只包含当前 overlay 轨道中的卡片。
- 原视频、SRT 字幕、人物安全线、画布背景和编辑器界面不会进入导出。
- 导出固定为 1920 × 1080、25 FPS，时长与项目时长一致。
- MOV 输出为 `transparent_overlay.mov`，编码为 Apple ProRes 4444。
- Windows 与 macOS 都依赖本机 FFmpeg；PNG 序列不依赖 FFmpeg。

## 隐私

- 视频、图片与 SRT 通过浏览器本地对象 URL 读取，不上传到云端。
- `exports/`、`.local-runtime/`、`node_modules/` 和用户媒体文件不会提交到 Git。
- 公开仓库不包含用户视频、字幕、导出文件、私人截图、令牌或本机绝对路径。

## 技术栈

- React 19
- TypeScript
- Vite
- Python 标准库本地 Server
- FFmpeg / ProRes 4444

本项目不使用 Electron、Remotion 或完整桌面剪辑框架。
