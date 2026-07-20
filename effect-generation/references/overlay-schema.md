# Overlay JSON 契约

## 根结构

成功输出是 JSON 数组。数组按 `start`、`end`、`id` 升序排列。

每个对象必须且只能包含：

```json
{
  "id": "fx-0001",
  "kind": "metric-focus",
  "start": 1.2,
  "end": 3.8,
  "x": 7.3,
  "y": 30.0,
  "w": 22.5,
  "fontSize": 124,
  "content": {}
}
```

## 通用字段

- `id`：从 `fx-0001` 开始连续递增，不重复。
- `kind`：只能是卡片库列出的 5 种之一。
- `start`：覆盖区间第一条 SRT 字幕的精确开始秒数，最多 3 位小数。
- `end`：覆盖区间最后一条 SRT 字幕的精确结束秒数，最多 3 位小数。
- `x`、`y`、`w`：1920×1080 画布百分比，只能使用卡片固定预设。
- `fontSize`：主信息字号像素值，只能使用卡片固定预设。
- `content`：按 `kind` 使用对应固定字段；不得添加字段。

单个卡片覆盖 1–3 条连续字幕，建议时长 0.6–10 秒。无法满足时跳过该内容，不得改动 SRT 时间。

## content 字段

### metric-focus

```json
{
  "label": "效率提升",
  "value": 73,
  "suffix": "%",
  "detail": "转化效率达到新水平"
}
```

限制：`label` ≤ 42 字；`value` 为有限数字；`suffix` ≤ 6 字；`detail` ≤ 42 字。`value` 必须出现在覆盖字幕中。

### compare-split

```json
{
  "title": "工作方式的变化",
  "leftLabel": "过去",
  "leftValue": "7天",
  "rightLabel": "现在",
  "rightValue": "2小时"
}
```

五个字段都必须是非空字符串，每项 ≤ 42 字。

### quote-lockup

```json
{
  "kicker": "核心观点",
  "quote": "真正的效率，是让每一步都有价值。",
  "source": ""
}
```

限制：`kicker` ≤ 42 字；`quote` 为覆盖字幕中的原句且 ≤ 72 字；`source` ≤ 42 字。无明确出处时保持空字符串。

### signal-card

```json
{
  "kicker": "SMART SUMMARY",
  "line1": "复杂信息",
  "line2": "提炼重点",
  "line3": "快速判断",
  "footer": "关键信息已整理"
}
```

限制：`kicker` ≤ 24 字；`line1`、`line2` 必须非空且各 ≤ 16 字；`line3` ≤ 16 字；`footer` ≤ 24 字。

### kinetic-text

```json
{
  "kicker": "KEY MESSAGE",
  "line1": "重新理解",
  "line2": "工作方式",
  "line3": ""
}
```

限制：`kicker` ≤ 22 字；`line1` 必须非空；三行各 ≤ 12 字；`line2`、`line3` 可为空。

## 时间与重叠

1. 每个 `start` 和 `end` 都必须命中 SRT 的真实边界。
2. 不得截断一条字幕，不得估算或平移时间。
3. 默认卡片之间不重叠。
4. 只有时间区间完全相同、类型不同、左右几何不相交时，才允许 2 个卡片同时出现。
5. 任意时刻最多 2 个卡片。
6. `compare-split` 不能与任何卡片重叠。
7. 同区间同类型不得重复。

## 文本真实性

- 卡片里的全部数字必须出现在其覆盖的 SRT 文本中。
- `quote` 去除空格与标点后，必须能在覆盖字幕中找到。
- 可以压缩长句，但不得新增字幕没有表达的事实、数字、实体、出处、立场或因果。
- 不用卡片重复字幕；卡片只提炼需要视觉强化的信息。
