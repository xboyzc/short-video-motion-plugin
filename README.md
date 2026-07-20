# Overlay Studio 特效生成 Skill

把 SRT 字幕自动整理成经过校验的 Overlay Studio 动效卡片 JSON。Skill 会读取字幕内容和毫秒级时间轴，从固定的五种现有卡片中选择合适类型，不创建自定义组件，也不会把整份字幕机械地塞进卡片。

## 能做什么

- 识别数字、对比、结论、连续信息和短促关键词
- 只使用 `metric-focus`、`compare-split`、`quote-lockup`、`signal-card`、`kinetic-text`
- 严格使用 SRT 的真实开始与结束时间
- 使用 Overlay Studio 的固定画布预设
- 检查时间重叠、字段结构、文字长度、数字真实性和引用原句
- 输出 `<SRT文件名>.overlay.json`

## 安装

使用 Codex 自带安装器：

```bash
python3 "$HOME/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py" \
  --repo xboyzc/overlay-studio-effect-generation-skill \
  --path effect-generation
```

也可以手动安装：

```bash
git clone https://github.com/xboyzc/overlay-studio-effect-generation-skill.git
mkdir -p "$HOME/.codex/skills"
cp -R overlay-studio-effect-generation-skill/effect-generation "$HOME/.codex/skills/effect-generation"
```

安装后新建一个 Codex 任务，让 Skill 被重新发现。

## 使用

将 SRT 文件交给 Codex，然后输入：

```text
使用 $effect-generation 读取这份 SRT，只用现有卡片库生成可导入 Overlay Studio 的 overlay JSON。
```

也可以直接提供本地路径：

```text
使用 $effect-generation 处理 /path/to/video.srt，生成并校验同名 overlay JSON。
```

## 本地验证

```bash
python3 effect-generation/scripts/test_validator.py
python3 "$HOME/.codex/skills/.system/skill-creator/scripts/quick_validate.py" effect-generation
```

## 兼容范围

这套 JSON 结构和视觉预设针对 Overlay Studio 当前的五种文字动效卡。画中画和图片卡需要外部媒体，不能只从 SRT 推导，因此不会由本 Skill 自动生成。

## License

MIT
