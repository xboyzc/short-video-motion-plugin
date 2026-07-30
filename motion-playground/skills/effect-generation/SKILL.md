---
name: effect-generation
description: Convert an attached or local SRT subtitle file into validated Overlay Studio overlay JSON by selecting from all 17 current motion components and binding every card to exact SRT time boundaries. Use when the user asks for 特效生成, SRT自动配动效, 字幕转动效卡片, overlay JSON, new B-roll motion modules, or timed motion-card generation for Overlay Studio.
---

# 特效生成

把 SRT 的内容与时间轴转换为可导入 Overlay Studio 的纯 JSON。只做内容匹配与现有卡片编排，不创建组件。

## 必读契约

生成前完整读取：

- [references/card-library.md](references/card-library.md)：现有 17 种卡片、选择条件、媒体边界和固定视觉预设。
- [references/overlay-schema.md](references/overlay-schema.md)：JSON 字段、文本字段、时间和重叠规则。

这些文件是硬约束。用户没有明确要求更新规范时，不得放宽。
校验器以 [references/effect-catalog.json](references/effect-catalog.json) 为机器可读的卡片单一来源；不要手改 JSON 绕过校验。

## 工作流

1. 读取用户提供的 `.srt` 文件原文，不依赖转述。
2. 解析每条字幕的 `start`、`end` 和文本，保留毫秒精度。
3. 标注内容信号：数字、对比、结论、连续信息、短促关键词、流程、洞察、章节、证据、数据组和模块清单。
4. 先运行确定性基线生成器：

   `python3 scripts/generate_overlay_json.py <input.srt> [output.overlay.json] [--main-video] [--image-media] [--max-cards 12] [--min-kinds 5]`

   只有项目已确认导入主视频时才加 `--main-video`，已确认有图片素材时才加 `--image-media`。不得凭字幕里的“图片”“画面”等词推测素材存在。
   `--min-kinds` 是尽力而为的语义多样性目标；默认会按视频长度自动采用下方规则，不会把不匹配的卡片硬塞进结果。
   正常交付不得传 `output.overlay.json`：生成器会把主文件自动写到 SRT 同目录，命名为 `<SRT文件名>.overlay.json`。只有用户明确指定其他主输出位置时才传第二个路径。
5. 审核基线结果的语义匹配。按卡片库优先级保留少量高价值区间，默认不为问候、口头填充和过渡句生成卡片。
6. 统计不同 `kind`：片长 ≥30 秒且生成 ≥8 张卡时目标至少 5 种；片长 15–30 秒且生成 ≥6 张卡时目标至少 4 种。只从已经被语义规则合法识别的候选中补足，禁止随机轮换类型。
7. 单卡覆盖卡片库允许数量的连续字幕；`start` 必须等于第一条字幕开始，`end` 必须等于最后一条字幕结束。
8. 使用目录当前 `presets` 填入 `x`、`y`、`w`、`fontSize`。这些值是与编辑台当前默认 CSS 同步的锁定设计 token；不得自行调整。编辑台会按内容密度自动扩展卡片。
9. 只从该时间区间内的字幕提取或压缩文本。数字、比例、实体和因果关系必须保持原意；`quote-lockup` 必须使用原句。
10. 按 `start`、`end`、`id` 排序，生成 `fx-0001` 起的连续 ID。
11. 将候选结果首先写入 SRT 源目录的 `<SRT文件名>.overlay.json`，并在当前项目的 `exports/` 保留一份内容完全相同的备份。不得只写项目备份后声称已保存到源目录。然后针对源目录主文件运行：

   `python3 scripts/validate_overlay_json.py <input.srt> <output.overlay.json>`

12. 校验失败时修正源目录主文件并重新运行，直到返回 `VALID`；再同步覆盖项目备份并核对两份 SHA-256 一致。若系统权限阻止写入源目录，必须明确报告，不得静默降级成只写 `exports/`。

## 内容选择原则

- 优先级：明确数据 → 明确对比 → 可独立成立的结论 → 2–3 句信息摘要 → 短促关键词。
- 当字幕明确包含四步流程、四点洞察、四组数据或八个模块时，优先使用对应的 `process-chain`、`insight-grid`、`data-bars` 或 `module-grid`，不要退化为普通信息卡。
- 长 SRT 必须让候选卡分布到完整时间轴，不能只取开头若干条。优先保留不同段落中的高信号结构；在语义同样成立时避免连续超过 2 张同类通用卡，并优先保留尚未出现的合法 `kind`。
- 多样性是“保留不同的合法语义候选”，不是把同一句字幕改套不同皮肤。若整段内容只支持 1–3 种类型，允许低于目标并在交付时如实说明，绝不编造流程、数据、对比或媒体条件。
- `compare-split` 只用于左右标签简短、两侧内容都能在 18 字内完整表达的对比。任一侧过长时改用 `signal-card`（2–3 条）或 `insight-grid`（4 条），不得缩小到难读或截断原意。
- 05/06/08/09/B6 属于媒体卡：`picture-in-picture` 可复用已导入主视频；`image-feature`、`proof-frame`、`dual-proof`、`code-window` 只有在项目已确认图片素材或用户明确要求后才可自动选择。
- 宁缺毋滥；不要求覆盖每条字幕。
- 不得把整份 SRT 或长段内容塞进一个卡片。
- 同一信息不得在多个同时出现的卡片里重复。
- 默认不重叠。只有两个信息互补、时间区间完全相同、左右几何不相交时才允许同时出现。
- 同屏最多 2 个卡片；`compare-split` 不得与其他卡片重叠；媒体卡没有素材时不得为了丰富形式而生成。

## 输出纪律

- 成功时，最终响应只能包含原始 JSON 数组；不要 Markdown 代码围栏、解释、标题或备注。
- JSON 根节点必须是数组。每个对象只能使用规范允许的字段。
- 不得输出 React、HTML、CSS、JSX、伪代码或卡片目录以外的新 `kind`。
- 不得忽略时间轴，不得使用推测时间，不得把 `start`/`end` 改成近似值。
- 输入缺失或 SRT 无法解析时，只输出 JSON 错误对象：`{"error":"SRT_REQUIRED_OR_INVALID"}`。

## 严格禁止

- 禁止任何未列入 17 卡目录的类型。
- 禁止在没有相应媒体上下文时自动选择图片依赖卡片。
- `module-grid` 只生成模块文字；不得杜撰图标、颜色、形状或自定义 UI。
- 禁止生成自定义 UI、卡片变体、颜色、阴影、动画曲线或任意布局。
- 禁止把旧预设当作新输出。校验器仅为历史 JSON 兼容接受 `legacyPresets`；新生成 JSON 必须使用目录 `presets`。
- 禁止杜撰字幕中不存在的数字、事实、出处或结论。
- 禁止跳过 `validate_overlay_json.py` 后直接交付。
