#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from validate_overlay_json import CATALOG, Cue, parse_srt, validate


NUMBER_WITH_UNIT_PATTERN = re.compile(
    r"\d+(?:[.,]\d+)?(?:%|万|亿|倍|小时|天|分钟|分|秒|元)?"
)
DATE_PATTERN = re.compile(
    r"(?:\d{2,4}年)?\d{1,2}月\d{1,2}日"
    r"|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}"
)
ORDINAL_PREFIX_PATTERN = re.compile(
    r"^(?:第?[一二三四五六七八九十0-9]+(?:步|项|个|周|阶段|环节|章|节)"
    r"|[一二三四五六七八九十0-9]+[、.．])[:：、.\s]*"
)
PROCESS_ORDINAL_PATTERN = re.compile(
    r"^第?[一二三四五六七八九十0-9]+(?:步|周|阶段|环节)[:：、.\s]*"
)
LIST_MARKER_PATTERN = re.compile(
    r"(?:包括|包含|分别是|依次是|分为|主要有|具体有|四点洞察(?:是|包括)?"
    r"|四组数据(?:为|是|包括)?|八项(?:能力|模块)(?:为|是|包括)?"
    r"|三个步骤(?:依次)?(?:为|是)?|四个步骤(?:依次)?(?:为|是)?"
    r"|完整流程(?:为|是|包括)?|流程(?:为|是|包括)?)[：:]?"
)
CONCLUSION_PATTERN = re.compile(
    r"真正|本质|关键在于|核心是|意味着|说明了|结论|原则"
    r"|不是.+而是|才有理由|才能|才算"
)
FOCUS_PATTERN = re.compile(r"聚焦|核心概念|关键词|重点能力|关键能力|记住")
PROCESS_PATTERN = re.compile(
    r"流程|步骤|阶段|环节|依次|先.+(?:再|然后|最后)|输入|处理|输出|复盘"
)
INSIGHT_PATTERN = re.compile(r"洞察|问题|检查点|判断|要点|为什么|方法")
MODULE_PATTERN = re.compile(r"八项|八个|模块|能力矩阵|Skill|系统组成|功能清单", re.I)
CODE_PATTERN = re.compile(
    r"代码|命令|JSON|脚本|文件|自动化|解析|生成结构|运行校验|安装", re.I
)
DATA_PATTERN = re.compile(r"四组数据|指标|比例|增长|转化|播放|结果|数据")
EVIDENCE_PATTERN = re.compile(r"证据|证明|截图|结果|数据|记录|验证")
IMAGE_PATTERN = re.compile(r"图片|截图|照片|示意图|图中|画面")
VIDEO_PATTERN = re.compile(r"画中画|演示|操作过程|屏幕|主视频|局部画面|请看")
DUAL_PATTERN = re.compile(r"两张|两组|分别|对比|左右|双")
SEQUENCE_PATTERN = re.compile(r"三个步骤|三步|依次|输入.+处理.+输出|第一步")
CHAPTER_PATTERN = re.compile(
    r"第([一二三四五六七八九十0-9]+)(章|阶段|节(?!课))"
    r"|(?:章节|阶段)[：:]?([一二三四五六七八九十0-9]+)"
)
STRUCTURED_COUNT_PATTERN = re.compile(
    r"(?:3|4|8|三|四|八)(?:个|项|组|步|周|种)?"
    r"(?:问题|步骤|阶段|数据|指标|模块|能力|任务|作业|要点|方法)"
)
STRUCTURED_GROUP_KINDS = frozenset(
    {"data-bars", "process-chain", "insight-grid", "step-rail", "module-grid"}
)


@dataclass(frozen=True)
class MediaContext:
    main_video: bool = False
    image: bool = False


@dataclass(frozen=True)
class Candidate:
    kind: str
    start_index: int
    end_index: int
    score: int
    content: dict[str, Any]


KIND_SCORES = {
    "module-grid": 100,
    "code-window": 96,
    "data-bars": 92,
    "process-chain": 88,
    "insight-grid": 84,
    "step-rail": 80,
    "dual-proof": 76,
    "proof-frame": 72,
    "picture-in-picture": 68,
    "image-feature": 66,
    "compare-split": 62,
    "metric-focus": 60,
    "chapter-callout": 58,
    "icon-breath": 54,
    "quote-lockup": 52,
    "kinetic-text": 48,
    "signal-card": 46,
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def trim_punctuation(value: str) -> str:
    return value.strip(" \t\r\n，,。！？!?；;：:、—-")


def compact_text(value: str, limit: int) -> str:
    value = trim_punctuation(normalize_text(value))
    if len(value) <= limit:
        return value
    return trim_punctuation(value[:limit])


def covered_text(cues: Iterable[Cue]) -> str:
    return normalize_text(" ".join(cue.text for cue in cues))


def split_sentences(value: str) -> list[str]:
    return [
        trim_punctuation(part)
        for part in re.split(r"[。！？!?；;\n]+", value)
        if trim_punctuation(part)
    ]


def has_structured_window_evidence(
    cues: list[Cue],
    kind: str | None = None,
) -> bool:
    if len(cues) < 2:
        return False
    first_text = normalize_text(cues[0].text)
    ordinal_count = sum(
        bool(ORDINAL_PREFIX_PATTERN.match(normalize_text(cue.text)))
        for cue in cues
    )
    process_ordinal_count = sum(
        bool(PROCESS_ORDINAL_PATTERN.match(normalize_text(cue.text)))
        for cue in cues
    )
    base_evidence = (
        ordinal_count >= 2
        or bool(LIST_MARKER_PATTERN.search(first_text))
        or bool(STRUCTURED_COUNT_PATTERN.search(first_text))
    )
    if not base_evidence or kind is None:
        return base_evidence
    if kind == "data-bars":
        return bool(DATA_PATTERN.search(first_text))
    if kind == "process-chain":
        return (
            process_ordinal_count >= 2
            or bool(PROCESS_PATTERN.search(first_text))
        )
    if kind == "insight-grid":
        return bool(INSIGHT_PATTERN.search(first_text))
    if kind == "step-rail":
        return (
            process_ordinal_count >= 2
            or bool(SEQUENCE_PATTERN.search(first_text))
        )
    if kind == "module-grid":
        return bool(MODULE_PATTERN.search(first_text))
    return False


def extract_items(cues: list[Cue]) -> list[str]:
    if len(cues) > 1:
        cue_items = [
            trim_punctuation(ORDINAL_PREFIX_PATTERN.sub("", normalize_text(cue.text)))
            for cue in cues
        ]
        if all(cue_items) and has_structured_window_evidence(cues):
            return cue_items
        return []

    text = covered_text(cues)
    marker = LIST_MARKER_PATTERN.search(text)
    source = text[marker.end() :] if marker else text
    source = re.sub(
        r"(?:第?[一二三四五六七八九十0-9]+(?:步|项|个|阶段|环节))"
        r"[：:、.\s]*",
        "|",
        source,
    )
    parts = [
        trim_punctuation(ORDINAL_PREFIX_PATTERN.sub("", part))
        for part in re.split(r"[|、，,；;。！？!?]+", source)
    ]
    return [part for part in parts if part]


def extract_lines(cues: list[Cue]) -> list[str]:
    if len(cues) > 1:
        lines = [trim_punctuation(normalize_text(cue.text)) for cue in cues]
        return [line for line in lines if line]
    text = covered_text(cues)
    sentences = split_sentences(text)
    if len(sentences) >= 2:
        return sentences
    return [
        trim_punctuation(part)
        for part in re.split(r"[，,；;]+", text)
        if trim_punctuation(part)
    ]


def extract_numbers(value: str) -> list[str]:
    return NUMBER_WITH_UNIT_PATTERN.findall(DATE_PATTERN.sub("", value))


def split_number_and_unit(token: str) -> tuple[str, str]:
    match = re.fullmatch(r"(\d+(?:[.,]\d+)?)(.*)", token)
    if not match:
        return token, ""
    return match.group(1).replace(",", "."), match.group(2)


def extract_data_pairs(items: list[str]) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for item in items:
        number_match = NUMBER_WITH_UNIT_PATTERN.search(item)
        if not number_match:
            continue
        label = trim_punctuation(item[: number_match.start()])
        label = re.sub(r"^(?:四组数据|数据|指标|其中|分别)", "", label)
        label = trim_punctuation(label)
        if label:
            pairs.append((label, number_match.group(0)))
    return pairs


def extract_compare(value: str) -> tuple[str, str, str, str] | None:
    patterns = [
        (r"过去(.+?)(?:，|,|；|;|。)?现在(.+)", "过去", "现在"),
        (r"以前(.+?)(?:，|,|；|;|。)?如今(.+)", "以前", "如今"),
        (r"原来(.+?)(?:，|,|；|;|。)?现在(.+)", "原来", "现在"),
        (r"不是(.+?)(?:，|,)?而是(.+)", "不是", "而是"),
        (r"从(.+?)到(.+)", "之前", "之后"),
    ]
    for pattern, left_label, right_label in patterns:
        match = re.search(pattern, value)
        if match:
            left_value = trim_punctuation(match.group(1))
            right_value = trim_punctuation(match.group(2))
            if left_value and right_value:
                return left_label, left_value, right_label, right_value
    return None


def exact_quote(value: str) -> str | None:
    for sentence in re.findall(r"[^。！？!?]+[。！？!?]?", value):
        sentence = normalize_text(sentence).strip()
        if sentence and len(sentence) <= 72 and CONCLUSION_PATTERN.search(sentence):
            return sentence
    value = normalize_text(value)
    return value if value and len(value) <= 72 and CONCLUSION_PATTERN.search(value) else None


def media_available(kind: str, media: MediaContext) -> bool:
    requirement = CATALOG[kind]["media"]
    return (
        requirement == "none"
        or (requirement == "main-video" and media.main_video)
        or (requirement == "image" and media.image)
    )


def select_kind(cues: list[Cue], media: MediaContext) -> str | None:
    text = covered_text(cues)
    items = extract_items(cues)
    lines = extract_lines(cues)
    numbers = extract_numbers(text)
    data_pairs = extract_data_pairs(items)

    if len(items) >= 8 and MODULE_PATTERN.search(text):
        return "module-grid"
    if media.image and len(items) >= 4 and CODE_PATTERN.search(text):
        return "code-window"
    if len(data_pairs) >= 4 and DATA_PATTERN.search(text):
        return "data-bars"
    if len(items) >= 4 and PROCESS_PATTERN.search(text):
        return "process-chain"
    if len(items) >= 4 and INSIGHT_PATTERN.search(text):
        return "insight-grid"
    if len(items) >= 3 and SEQUENCE_PATTERN.search(text):
        return "step-rail"
    if (
        media.image
        and len(numbers) >= 2
        and EVIDENCE_PATTERN.search(text)
        and DUAL_PATTERN.search(text)
    ):
        return "dual-proof"
    if media.image and numbers and EVIDENCE_PATTERN.search(text):
        return "proof-frame"
    if media.main_video and VIDEO_PATTERN.search(text):
        return "picture-in-picture"
    if media.image and IMAGE_PATTERN.search(text):
        return "image-feature"
    comparison = extract_compare(text)
    if comparison:
        compare_limits = CATALOG["compare-split"]["content"]["limits"]
        compare_values = dict(
            zip(
                ("leftLabel", "leftValue", "rightLabel", "rightValue"),
                comparison,
            )
        )
        if all(
            len(compare_values[key]) <= int(compare_limits[key])
            for key in compare_values
        ):
            return "compare-split"
    if numbers:
        return "metric-focus"
    if CHAPTER_PATTERN.search(text):
        return "chapter-callout"
    if FOCUS_PATTERN.search(text):
        return "icon-breath"
    if exact_quote(text):
        return "quote-lockup"
    if 2 <= len(lines) <= 3:
        if max(map(len, lines)) <= 12 and sum(map(len, lines)) <= 18:
            return "kinetic-text"
        return "signal-card"
    if len(text) <= 12 and re.search(r"重点|关键|记住|变化|升级|提速", text):
        return "kinetic-text"
    return None


def blank_content(kind: str) -> dict[str, Any]:
    return {key: "" for key in CATALOG[kind]["content"]["keys"]}


def build_content(kind: str, cues: list[Cue]) -> dict[str, Any] | None:
    text = covered_text(cues)
    items = extract_items(cues)
    lines = extract_lines(cues)
    numbers = extract_numbers(text)
    content = blank_content(kind)

    if kind == "metric-focus":
        if not numbers:
            return None
        token = numbers[0]
        number_text, suffix = split_number_and_unit(token)
        numeric_value = float(number_text)
        content.update(
            {
                "label": compact_text(text[: text.find(token)], 42) or "核心数据",
                "value": int(numeric_value) if numeric_value.is_integer() else numeric_value,
                "suffix": compact_text(suffix, 6),
                "detail": compact_text(text, 42),
            }
        )
    elif kind == "compare-split":
        comparison = extract_compare(text)
        if not comparison:
            return None
        left_label, left_value, right_label, right_value = comparison
        content.update(
            {
                "title": "前后对比",
                "leftLabel": compact_text(
                    left_label,
                    int(CATALOG[kind]["content"]["limits"]["leftLabel"]),
                ),
                "leftValue": compact_text(
                    left_value,
                    int(CATALOG[kind]["content"]["limits"]["leftValue"]),
                ),
                "rightLabel": compact_text(
                    right_label,
                    int(CATALOG[kind]["content"]["limits"]["rightLabel"]),
                ),
                "rightValue": compact_text(
                    right_value,
                    int(CATALOG[kind]["content"]["limits"]["rightValue"]),
                ),
            }
        )
    elif kind == "quote-lockup":
        quote = exact_quote(text)
        if not quote:
            return None
        content.update({"kicker": "核心观点", "quote": quote, "source": ""})
    elif kind == "signal-card":
        if len(lines) < 2:
            return None
        content.update(
            {
                "kicker": "重点信息",
                "line1": compact_text(lines[0], 16),
                "line2": compact_text(lines[1], 16),
                "line3": compact_text(lines[2], 16) if len(lines) > 2 else "",
                "footer": "",
            }
        )
    elif kind == "picture-in-picture":
        content.update(
            {
                "label": "操作演示",
                "title": compact_text(text, 42),
                "caption": compact_text(text, 72),
            }
        )
    elif kind == "image-feature":
        content.update(
            {
                "label": "图片说明",
                "title": compact_text(text, 42),
                "caption": compact_text(text, 72),
            }
        )
    elif kind == "kinetic-text":
        if not lines:
            return None
        content.update(
            {
                "kicker": "关键变化",
                "line1": compact_text(lines[0], 12),
                "line2": compact_text(lines[1], 12) if len(lines) > 1 else "",
                "line3": compact_text(lines[2], 12) if len(lines) > 2 else "",
            }
        )
    elif kind == "proof-frame":
        if not numbers:
            return None
        number_text, suffix = split_number_and_unit(numbers[0])
        content.update(
            {
                "kicker": "结果证据",
                "title": compact_text(text, 42),
                "value": compact_text(number_text, 24),
                "unit": compact_text(suffix, 24),
                "caption": compact_text(text, 42),
            }
        )
    elif kind == "dual-proof":
        if len(numbers) < 2:
            return None
        content.update(
            {
                "kicker": "双组结果",
                "title": compact_text(text, 42),
                "leftValue": compact_text(numbers[0], 24),
                "rightValue": compact_text(numbers[1], 24),
                "caption": "",
            }
        )
    elif kind in {"process-chain", "insight-grid", "code-window"}:
        if len(items) < 4:
            return None
        content.update(
            {
                "kicker": {
                    "process-chain": "四步流程",
                    "insight-grid": "四点洞察",
                    "code-window": "自动化流程",
                }[kind],
                "title": compact_text(text, 42),
                "line1": compact_text(items[0], 16),
                "line2": compact_text(items[1], 16),
                "line3": compact_text(items[2], 16),
                "line4": compact_text(items[3], 16),
                "caption": "",
            }
        )
    elif kind == "chapter-callout":
        match = CHAPTER_PATTERN.search(text)
        if not match:
            return None
        index = next((group for group in match.groups() if group and group not in {"章", "节", "阶段"}), "")
        title = trim_punctuation(text[match.end() :]) or text
        content.update(
            {
                "kicker": "章节重点",
                "index": compact_text(index, 8),
                "title": compact_text(title, 42),
                "detail": compact_text(text, 72),
            }
        )
    elif kind == "icon-breath":
        content.update(
            {
                "kicker": "概念聚焦",
                "title": compact_text(text, 42),
                "detail": compact_text(text, 72),
            }
        )
    elif kind == "data-bars":
        pairs = extract_data_pairs(items)
        if len(pairs) < 4:
            return None
        content.update({"kicker": "四组数据", "title": compact_text(text, 42)})
        for index, (label, value) in enumerate(pairs[:4], start=1):
            content[f"label{index}"] = compact_text(label, 16)
            content[f"value{index}"] = compact_text(value, 12)
    elif kind == "step-rail":
        if len(items) < 3:
            return None
        content.update(
            {
                "kicker": "三级步骤",
                "title": compact_text(text, 42),
                "line1": compact_text(items[0], 16),
                "line2": compact_text(items[1], 16),
                "line3": compact_text(items[2], 16),
                "caption": "",
            }
        )
    elif kind == "module-grid":
        if len(items) < 8:
            return None
        content.update({"kicker": "系统模块", "title": compact_text(text, 42), "caption": ""})
        for index, item in enumerate(items[:8], start=1):
            content[f"module{index}"] = compact_text(item, 16)
    else:
        return None

    rules = CATALOG[kind]["content"]
    for key in rules["required"]:
        value = content.get(key)
        if isinstance(value, str) and not value.strip():
            return None
    return content


def make_candidate(
    cues: list[Cue],
    start_index: int,
    end_index: int,
    media: MediaContext,
) -> Candidate | None:
    window = cues[start_index : end_index + 1]
    kind = select_kind(window, media)
    if kind is None or kind not in CATALOG or not media_available(kind, media):
        return None
    if len(window) > int(CATALOG[kind]["maxCues"]):
        return None
    duration = window[-1].end - window[0].start
    if duration < 0.6 or duration > float(CATALOG[kind]["maxDuration"]):
        return None
    content = build_content(kind, window)
    if content is None:
        return None
    return Candidate(kind, start_index, end_index, KIND_SCORES[kind], content)


def choose_candidates(
    cues: list[Cue],
    media: MediaContext,
    max_cards: int,
    min_kinds: int | None = None,
) -> list[Candidate]:
    discovered: list[Candidate] = []
    index = 0
    while index < len(cues):
        single = make_candidate(cues, index, index, media)
        candidates: list[Candidate] = []
        for end_index in range(index + 1, min(len(cues), index + 8)):
            candidate = make_candidate(cues, index, end_index, media)
            if candidate is not None:
                candidates.append(candidate)
        structured = [
            candidate
            for candidate in candidates
            if (
                candidate.kind in STRUCTURED_GROUP_KINDS
                and has_structured_window_evidence(
                    cues[candidate.start_index : candidate.end_index + 1],
                    candidate.kind,
                )
            )
        ]
        if structured and (
            single is None or single.kind not in STRUCTURED_GROUP_KINDS
        ):
            best = max(
                structured,
                key=lambda candidate: (candidate.score, -candidate.end_index),
            )
            discovered.append(best)
            index = best.end_index + 1
        elif single is not None:
            discovered.append(single)
            index += 1
        elif candidates:
            best = max(candidates, key=lambda candidate: (candidate.score, candidate.end_index))
            discovered.append(best)
            index = best.end_index + 1
        else:
            index += 1

    if max_cards <= 0:
        return []
    if len(discovered) <= max_cards:
        return discovered

    # Cover the full SRT instead of taking only the first max_cards matches.
    # Each chronological bucket contributes its strongest, least-repeated kind.
    selected: list[Candidate] = []
    kind_counts: dict[str, int] = {}
    total = len(discovered)
    buckets: list[list[Candidate]] = []
    for bucket_index in range(max_cards):
        start = (bucket_index * total) // max_cards
        end = ((bucket_index + 1) * total) // max_cards
        bucket = discovered[start : max(start + 1, end)]
        buckets.append(bucket)
        best = max(
            bucket,
            key=lambda candidate: (
                candidate.score - kind_counts.get(candidate.kind, 0) * 18,
                -candidate.start_index,
            ),
        )
        selected.append(best)
        kind_counts[best.kind] = kind_counts.get(best.kind, 0) + 1

    duration = cues[-1].end - cues[0].start if cues else 0
    if min_kinds is None:
        requested_kinds = (
            5 if duration >= 30 and max_cards >= 8
            else 4 if duration >= 15 and max_cards >= 6
            else 0
        )
    else:
        requested_kinds = max(0, min_kinds)
    available_kinds = {candidate.kind for candidate in discovered}
    target_kinds = min(requested_kinds, max_cards, len(available_kinds))

    def candidate_key(candidate: Candidate) -> tuple[str, int, int]:
        return candidate.kind, candidate.start_index, candidate.end_index

    selected_by_bucket = list(selected)
    selected_keys = {candidate_key(candidate) for candidate in selected_by_bucket}

    while len({candidate.kind for candidate in selected_by_bucket}) < target_kinds:
        counts: dict[str, int] = {}
        for candidate in selected_by_bucket:
            counts[candidate.kind] = counts.get(candidate.kind, 0) + 1
        missing = available_kinds - set(counts)
        replacement_options: list[
            tuple[int, int, int, int, int, Candidate]
        ] = []
        for bucket_index, bucket in enumerate(buckets):
            current = selected_by_bucket[bucket_index]
            if counts.get(current.kind, 0) <= 1:
                continue
            for candidate in bucket:
                if (
                    candidate.kind not in missing
                    or candidate_key(candidate) in selected_keys
                ):
                    continue
                score_loss = current.score - candidate.score
                replacement_options.append(
                    (
                        score_loss,
                        bucket_index,
                        candidate.start_index,
                        candidate.end_index,
                        list(CATALOG).index(candidate.kind),
                        candidate,
                    )
                )
        if replacement_options:
            _, bucket_index, _, _, _, replacement = min(replacement_options)
            selected_keys.discard(candidate_key(selected_by_bucket[bucket_index]))
            selected_by_bucket[bucket_index] = replacement
            selected_keys.add(candidate_key(replacement))
            continue

        # If a chronological bucket contains no missing kind, replace the
        # nearest repeated non-anchor candidate globally. Discovered windows
        # never overlap, so this preserves timeline validity.
        global_options: list[
            tuple[int, int, int, int, int, Candidate]
        ] = []
        anchor_keys = {
            candidate_key(discovered[0]),
            candidate_key(discovered[-1]),
        }
        for candidate in discovered:
            if (
                candidate.kind not in missing
                or candidate_key(candidate) in selected_keys
            ):
                continue
            for selected_index, current in enumerate(selected_by_bucket):
                if (
                    counts.get(current.kind, 0) <= 1
                    or candidate_key(current) in anchor_keys
                ):
                    continue
                distance = abs(candidate.start_index - current.start_index)
                score_loss = current.score - candidate.score
                global_options.append(
                    (
                        distance,
                        score_loss,
                        selected_index,
                        candidate.end_index,
                        list(CATALOG).index(candidate.kind),
                        candidate,
                    )
                )
        if not global_options:
            break
        _, _, selected_index, _, _, replacement = min(global_options)
        selected_keys.discard(candidate_key(selected_by_bucket[selected_index]))
        selected_by_bucket[selected_index] = replacement
        selected_keys.add(candidate_key(replacement))

    return sorted(
        selected_by_bucket,
        key=lambda candidate: (candidate.start_index, candidate.end_index),
    )


def generate_cards(
    cues: list[Cue],
    media: MediaContext | None = None,
    max_cards: int = 12,
    min_kinds: int | None = None,
) -> list[dict[str, Any]]:
    media = media or MediaContext()
    candidates = choose_candidates(cues, media, max_cards, min_kinds=min_kinds)
    cards: list[dict[str, Any]] = []
    for output_index, candidate in enumerate(candidates):
        presets = CATALOG[candidate.kind]["presets"]
        preset = presets[output_index % len(presets)]
        x, y, width, font_size = preset
        start = cues[candidate.start_index].start
        end = cues[candidate.end_index].end
        cards.append(
            {
                "id": f"fx-{output_index + 1:04d}",
                "kind": candidate.kind,
                "start": round(start, 3),
                "end": round(end, 3),
                "x": x,
                "y": y,
                "w": width,
                "fontSize": font_size,
                "content": candidate.content,
            }
        )
    return cards


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate semantically matched Overlay Studio JSON from SRT"
    )
    parser.add_argument("srt", type=Path)
    parser.add_argument("output", type=Path, nargs="?")
    parser.add_argument(
        "--main-video",
        action="store_true",
        help="allow picture-in-picture when the project has an imported main video",
    )
    parser.add_argument(
        "--image-media",
        action="store_true",
        help="allow image-backed cards when the project has confirmed image media",
    )
    parser.add_argument("--max-cards", type=int, default=12)
    parser.add_argument(
        "--min-kinds",
        type=int,
        default=None,
        help="best-effort minimum distinct kinds; auto targets 4-5 for longer SRT",
    )
    args = parser.parse_args()

    output = args.output or args.srt.with_suffix(".overlay.json")
    try:
        cues = parse_srt(args.srt)
        cards = generate_cards(
            cues,
            MediaContext(main_video=args.main_video, image=args.image_media),
            max_cards=max(0, args.max_cards),
            min_kinds=args.min_kinds,
        )
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(cards, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        errors = validate(args.srt, output)
    except (OSError, UnicodeError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
