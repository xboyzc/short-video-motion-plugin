# Overlay JSON 契约

## 根结构

输出必须是按 `start`、`end`、`id` 升序排列的 JSON 数组。每个对象只能包含：

```json
{
  "id": "fx-0001",
  "kind": "process-chain",
  "start": 1.2,
  "end": 8.6,
  "x": 3.8,
  "y": 7.0,
  "w": 26.4,
  "fontSize": 20,
  "content": {}
}
```

## 通用字段

- `id`：从 `fx-0001` 开始连续递增。
- `kind`：只能来自 17 卡目录。
- `start`、`end`：精确命中覆盖字幕的首条开始和末条结束，最多 3 位小数。
- `x`、`y`、`w`、`fontSize`：只能使用卡片目录当前 `presets`。它们是与编辑台默认 CSS 同步的锁定设计 token；编辑台负责按文本密度自动扩展卡片，新 JSON 不得靠改小字体或任意放大组件容纳长文。
- `content`：必须且只能使用对应类型字段。
- 普通卡时长为 0.6–10 秒；`step-rail` 可到 12 秒；`process-chain`、`insight-grid`、`data-bars`、`code-window`、`module-grid` 可到 15 秒。

## 字幕覆盖数量

- `chapter-callout`、`icon-breath`：最多 2 条连续字幕。
- 普通卡：最多 3 条连续字幕。
- `process-chain`、`insight-grid`、`data-bars`、`code-window`：最多 4 条连续字幕。
- `module-grid`：最多 8 条连续字幕。

不得截断、平移或估算字幕时间。

## `content` 精确结构

### 01–07

```json
{"kind":"metric-focus","content":{"label":"转化效率","value":73,"suffix":"%","detail":"转化率达到73%"}}
```

`label`、`detail` ≤42；`suffix` ≤6；`value` 为字幕中真实出现的有限数字。

```json
{"kind":"compare-split","content":{"title":"工作方式变化","leftLabel":"过去","leftValue":"7天","rightLabel":"现在","rightValue":"2小时"}}
```

五项均必填；`title` ≤18，左右标签各 ≤10，左右内容各 ≤18。超限时必须改用 `signal-card` 或 `insight-grid`，不得截断原意。

```json
{"kind":"quote-lockup","content":{"kicker":"核心观点","quote":"真正的效率，是让每一步都有价值。","source":""}}
```

`kicker`、`source` ≤42；`quote` 必填、≤72，且必须是覆盖字幕原句。

```json
{"kind":"signal-card","content":{"kicker":"重点摘要","line1":"复杂信息","line2":"提炼重点","line3":"快速判断","footer":""}}
```

`kicker`、`footer` ≤24；三行各 ≤16；`line1`、`line2` 必填。

```json
{"kind":"picture-in-picture","content":{"label":"操作演示","title":"查看关键步骤","caption":"画面同步展示当前操作"}}
```

`label` ≤22；`title` ≤42；`caption` ≤72；前两项必填。

```json
{"kind":"image-feature","content":{"label":"视觉说明","title":"一张图看懂重点","caption":"图片补充口播信息"}}
```

`label` ≤22；`title` ≤42；`caption` ≤72；前两项必填。

```json
{"kind":"kinetic-text","content":{"kicker":"关键变化","line1":"重新理解","line2":"工作方式","line3":""}}
```

`kicker` ≤22；三行各 ≤12；`line1` 必填。

### 08–12

```json
{"kind":"proof-frame","content":{"kicker":"结果证据","title":"真实数据得到验证","value":"45.5万","unit":"累计触达","caption":"14天记录"}}
```

`kicker` ≤24；`title` ≤42；`value`、`unit` ≤24；`caption` ≤42；前三项必填。

```json
{"kind":"dual-proof","content":{"kicker":"双组结果","title":"两组数据同时验证","leftValue":"20万","rightValue":"21.7万","caption":"同一周期"}}
```

`kicker` ≤24；`title`、`caption` ≤42；左右值 ≤24；除 `caption` 外均必填。

```json
{"kind":"process-chain","content":{"kicker":"四步方法","title":"从输入到结果","line1":"选题","line2":"文案","line3":"剪辑","line4":"复盘","caption":""}}
```

`kicker` ≤24；`title`、`caption` ≤42；四行各 ≤16，全部必填。

```json
{"kind":"insight-grid","content":{"kicker":"四点洞察","title":"有效样本怎么拆","line1":"开头抓人","line2":"中段反转","line3":"引发评论","line4":"值得收藏","caption":""}}
```

`kicker` ≤24；`title`、`caption` ≤42；四行各 ≤16，全部必填。

```json
{"kind":"chapter-callout","content":{"kicker":"步骤","index":"01","title":"先找对标","detail":"拆出有效结构"}}
```

`kicker` ≤24；`index` ≤8；`title` ≤42；`detail` ≤72；前三项必填。`index` 中的数字必须出现在字幕中。

### B1、B3、B4、B6、B7

```json
{"kind":"icon-breath","content":{"kicker":"章节聚焦","title":"关键概念","detail":"用一个图标锁定核心信息"}}
```

`kicker` ≤24；`title` ≤42；`detail` ≤72；前两项必填。

```json
{"kind":"data-bars","content":{"kicker":"四组数据","title":"能力结构","label1":"基础层","value1":"28%","label2":"执行层","value2":"45%","label3":"协同层","value3":"63%","label4":"增长层","value4":"81%"}}
```

`kicker` ≤24；`title` ≤42；四个标签各 ≤16；四个值各 ≤12；全部必填且数字必须出现在字幕中。

```json
{"kind":"step-rail","content":{"kicker":"三级步骤","title":"逐步推进","line1":"输入","line2":"处理","line3":"输出","caption":""}}
```

`kicker` ≤24；`title`、`caption` ≤42；三行各 ≤16，全部三行必填。

```json
{"kind":"code-window","content":{"kicker":"自动化流程","title":"文件自动生成","line1":"读取文件","line2":"解析内容","line3":"生成结构","line4":"运行校验","caption":""}}
```

`kicker` ≤24；`title`、`caption` ≤42；四行各 ≤16；前两行必填。

```json
{"kind":"module-grid","content":{"kicker":"系统模块","title":"八项能力","module1":"AI驱动","module2":"创作记忆","module3":"人物关系","module4":"伏笔管理","module5":"通用规范","module6":"选题策划","module7":"世界观","module8":"正文创作","caption":""}}
```

`kicker` ≤24；`title`、`caption` ≤42；八个模块各 ≤16 且全部必填。不得输出图标、形状、颜色字段。

## 时间与重叠

1. 默认卡片之间不重叠。
2. 只有时间区间完全相同、类型不同、左右几何不相交时，才允许同时出现两个卡片。
3. 任意时刻最多两个卡片。
4. `compare-split` 不得与其他卡片重叠。
5. 同区间同类型不得重复。

## 文本真实性

- 卡片里的全部数字必须出现在覆盖字幕中。
- `quote` 去除空格与标点后必须能在字幕原文中找到。
- 可以压缩长句，但不得新增字幕没有表达的事实、实体、出处、立场或因果。
- 媒体组件必须满足卡片库的素材条件。
- 不用卡片重复字幕；只提炼需要视觉强化的信息。

## 机器校验

`references/effect-catalog.json` 是字段、预设、最大字幕数和时长的机器可读单一来源。新生成结果使用 `presets`；`legacyPresets` 只供旧工程校验兼容。

先生成确定性语义基线。生成器会对较长 SRT 尽力保留 4–5 种已被语义规则合法识别的 `kind`；语义不足时不会为了达到数量而误配：

```bash
python3 scripts/generate_overlay_json.py <input.srt> <output.overlay.json> [--main-video] [--image-media] [--max-cards 12] [--min-kinds 5]
```

媒体开关只能在项目已确认存在相应素材时使用。生成后必须运行：

```bash
python3 scripts/validate_overlay_json.py <input.srt> <output.overlay.json>
```
