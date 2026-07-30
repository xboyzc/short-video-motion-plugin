# 短视频动效插件 / Motion Playground

完整的本地短视频动效工作台，以及配套的 Codex `$effect-generation` Skill。

GitHub：<https://github.com/xboyzc/short-video-motion-plugin>

仓库包含：

- `motion-playground/`：React + TypeScript + Vite 动效卡片编辑台。
- `effect-generation/`：SRT 自动匹配 17 种现有卡片并生成 Overlay JSON 的 Codex Skill。
- Windows 与 macOS 双击启动脚本。
- 1920 × 1080 / 25 FPS 透明 PNG 序列导出。
- FFmpeg ProRes 4444 透明 MOV 导出。
- Linux 与 Windows GitHub Actions 自动验证。

## 功能

- 导入本地视频并实时预览卡片叠加。
- 导入 SRT 作为动效内容分析源，不重复生成字幕。
- 导入、编辑和导出 Overlay JSON。
- 17 种动效卡片，全部支持文字参数编辑。
- 卡片可自由拖动、45%–220% 缩放；人物安全区只作为参考。
- 视频时间轴与动效轨道按帧同步。
- 卡片片段可添加、选择、删除和拖动。
- 图片卡支持图片缩放与位置调整。
- 透明 PNG 与透明 MOV 只包含动效层，不包含原视频。
- 本地服务只监听 `127.0.0.1`，不需要 Electron 或其他桌面框架。

## Windows 10 / 11

### 普通使用

1. 点击 GitHub 页面右上角 `Code → Download ZIP`，解压。
2. 安装 [Python 3](https://www.python.org/downloads/windows/)，安装时勾选 `Add Python to PATH`。
3. 进入 `motion-playground` 文件夹。
4. 双击 `start-windows.cmd`。
5. 浏览器会自动打开本地编辑台。
6. 完成后双击 `stop-windows.cmd`。

仓库已经包含预构建网页，因此普通使用不需要 Node.js。

### 透明 MOV

透明 PNG 不需要 FFmpeg。透明 MOV 需要安装 FFmpeg：

```powershell
winget install Gyan.FFmpeg
```

安装后重新打开启动脚本。服务会从 PATH、Winget、Chocolatey、Scoop、`C:\ffmpeg\bin` 等常见位置寻找 `ffmpeg.exe`。

## macOS

进入 `motion-playground/scripts`，双击：

- `start-local.command`：启动服务并打开浏览器。
- `stop-local.command`：停止服务。

透明 MOV 需要 FFmpeg，例如：

```bash
brew install ffmpeg
```

## 从源码开发

```bash
cd motion-playground
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

完整验证：

```bash
pnpm typecheck
pnpm test:safety
pnpm test:layout
pnpm test:catalog
pnpm test:import
python3 scripts/test_windows_compat.py
python3 skills/effect-generation/scripts/test_validator.py
python3 skills/effect-generation/scripts/test_generator.py
pnpm build
```

## 安装 Codex Skill

只需要 SRT → Overlay JSON 功能时，可以单独安装：

```bash
python3 "$HOME/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py" \
  --repo xboyzc/short-video-motion-plugin \
  --path effect-generation
```

安装后新建 Codex 任务，然后使用：

```text
使用 $effect-generation 读取这份 SRT，只用现有卡片库生成可导入 Motion Playground 的 Overlay JSON。
```

纯 SRT 可自动匹配 12 种纯文本卡。媒体条件已确认时，Skill 也可以选择画中画、图片证据卡和代码窗口，完整目录共 17 种。

## 隐私边界

公开仓库不包含用户视频、SRT、图片、导出文件、本地运行日志、账号令牌或本机绝对路径。浏览器导入的媒体不会上传到云端。

## License

MIT
