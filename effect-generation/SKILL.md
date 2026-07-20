---
name: effect-generation
description: Convert an attached or local SRT subtitle file into validated Overlay Studio overlay JSON by selecting only the five existing text-driven motion cards and binding every card to exact SRT time boundaries. Use when the user asks for 特效生成, SRT自动配动效, 字幕转动效卡片, overlay JSON, or timed motion-card generation for Overlay Studio.
---

# 特效生成

把 SRT 的内容与时间轴转换为可导入 Overlay Studio 的纯 JSON。只做内容匹配与现有卡片编排，不创建组件。

## 必读契约

生成前完整读取：

- [references/card-library.md](references/card-library.md)：仅允许的 5 种卡片、选择条件和固定视觉预设。
- [references/overlay-schema.md](references/overlay-schema.md)：JSON 字段、文本字段、时间和重叠规则。

这些文件是硬约束。用户没有明确要求更新规范时，不得放宽。

## 工作流

1. 读取用户提供的 `.srt` 文件原文，不依赖转述。
2. 解析每条字幕的 `start`、`end` 和文本，保留毫秒精度。
3. 标注内容信号：数字、对比、结论、连续信息、短促关键词。
4. 按卡片库优先级选择少量高价值区间。默认不为问候、口头填充和过渡句生成卡片。
5. 单卡只覆盖 1–3 条连续字幕；`start` 必须等于第一条字幕开始，`end` 必须等于最后一条字幕结束。
6. 使用固定视觉预设填入 `x`、`y`、`w`、`fontSize`。不得自行调整视觉参数。
7. 只从该时间区间内的字幕提取或压缩文本。数字、比例、实体和因果关系必须保持原意；`quote-lockup` 必须使用原句。
8. 按 `start`、`end`、`id` 排序，生成 `fx-0001` 起的连续 ID。
9. 将候选结果写入 `<SRT文件名>.overlay.json`，然后从本 Skill 目录调用校验器：

   `python3 <skill-directory>/scripts/validate_overlay_json.py <input.srt> <output.overlay.json>`

10. 校验失败时修正 JSON 并重新运行，直到返回 `VALID`。

## 内容选择原则

- 优先级：明确数据 → 明确对比 → 可独立成立的结论 → 2–3 句信息摘要 → 短促关键词。
- 宁缺毋滥；不要求覆盖每条字幕。
- 不得把整份 SRT 或长段内容塞进一个卡片。
- 同一信息不得在多个同时出现的卡片里重复。
- 默认不重叠。只有两个信息互补、时间区间完全相同、左右几何不相交时才允许同时出现。
- 同屏最多 2 个卡片；`compare-split` 不得与其他卡片重叠。

## 输出纪律

- 成功时，最终响应只能包含原始 JSON 数组；不要 Markdown 代码围栏、解释、标题或备注。
- JSON 根节点必须是数组。每个对象只能使用规范允许的字段。
- 不得输出 React、HTML、CSS、JSX、伪代码或新的 `kind`。
- 不得忽略时间轴，不得使用推测时间，不得把 `start`/`end` 改成近似值。
- 输入缺失或 SRT 无法解析时，只输出 JSON 错误对象：`{"error":"SRT_REQUIRED_OR_INVALID"}`。

## 严格禁止

- 禁止 `picture-in-picture`、`image-feature` 以及任何未列入规范的类型。
- 禁止生成自定义 UI、卡片变体、颜色、阴影、动画曲线或任意布局。
- 禁止杜撰字幕中不存在的数字、事实、出处或结论。
- 禁止跳过 `validate_overlay_json.py` 后直接交付。
