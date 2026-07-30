#!/usr/bin/env python3

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from generate_overlay_json import MediaContext, generate_cards
from validate_overlay_json import CATALOG, Cue, parse_srt, validate


EXPECTED_KINDS = [
    "metric-focus",
    "compare-split",
    "quote-lockup",
    "signal-card",
    "picture-in-picture",
    "image-feature",
    "kinetic-text",
    "proof-frame",
    "dual-proof",
    "process-chain",
    "insight-grid",
    "chapter-callout",
    "icon-breath",
    "data-bars",
    "step-rail",
    "code-window",
    "module-grid",
]

EXPECTED_CURRENT_PRESETS = {
    "metric-focus": [[7.3, 28.0, 22.5, 94]],
    "compare-split": [[4.5, 31.0, 91.0, 39]],
    "quote-lockup": [[5.8, 18.0, 25.8, 27]],
    "signal-card": [[4.6, 8.0, 25.8, 21], [69.6, 8.0, 25.8, 21]],
    "picture-in-picture": [[4.6, 10.0, 25.8, 21], [69.6, 10.0, 25.8, 21]],
    "image-feature": [[4.7, 10.0, 25.5, 21], [69.8, 10.0, 25.5, 21]],
    "kinetic-text": [[4.5, 12.0, 25.8, 29], [69.7, 12.0, 25.8, 29]],
    "proof-frame": [[4.2, 7.0, 27.2, 60]],
    "dual-proof": [[4.0, 6.0, 27.5, 17]],
    "process-chain": [[3.8, 7.0, 26.4, 20]],
    "insight-grid": [[4.0, 7.0, 26.0, 20]],
    "chapter-callout": [[4.2, 15.0, 26.0, 28]],
    "icon-breath": [[4.0, 12.0, 26.0, 26], [70.0, 12.0, 26.0, 26]],
    "data-bars": [[3.0, 7.0, 28.0, 13], [69.0, 7.0, 28.0, 13]],
    "step-rail": [[4.0, 7.0, 25.6, 20], [70.4, 7.0, 25.6, 20]],
    "code-window": [[1.5, 5.0, 30.0, 12], [68.5, 5.0, 30.0, 12]],
    "module-grid": [[3.0, 6.0, 28.0, 11], [69.0, 6.0, 28.0, 11]],
}

ALL_KIND_TEXTS = [
    "核心转化率达到73%。",
    "过去需要七天，现在只要两个小时。",
    "真正的效率，是让每一步都有价值。",
    "背景情况非常复杂，信息层级和关系很多，需要用清楚的结构表达。",
    "请看画中画操作演示，主视频同步展示。",
    "这张图片展示产品结构和关键画面。",
    "重构。提速。交付。",
    "这张截图证明累计触达45.5万。",
    "两张截图的结果分别是20万和21.7万。",
    "完整流程包括选题、文案、剪辑、复盘。",
    "四点洞察包括开头抓人、中段反转、引发评论、值得收藏。",
    "第一章先讲关键概念。",
    "聚焦核心概念：长期记忆。",
    "四组数据为基础28%、执行45%、协同63%、增长81%。",
    "三个步骤依次是输入、处理、输出。",
    "自动化代码流程包括读取文件、解析内容、生成结构、运行校验。",
    "八项模块包括AI驱动、创作记忆、人物关系、伏笔管理、通用规范、选题策划、世界观、正文创作。",
]


def timestamp(milliseconds: int) -> str:
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, millis = divmod(remainder, 1_000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"


def make_srt(texts: list[str], spacing_ms: int = 2200, duration_ms: int = 2000) -> str:
    blocks: list[str] = []
    for index, text in enumerate(texts):
        start_ms = index * spacing_ms
        end_ms = start_ms + duration_ms
        blocks.append(
            f"{index + 1}\n"
            f"{timestamp(start_ms)} --> {timestamp(end_ms)}\n"
            f"{text}"
        )
    return "\n\n".join(blocks) + "\n"


def validate_generated(root: Path, name: str, srt_text: str, cards: list[dict]) -> None:
    srt_path = root / f"{name}.srt"
    json_path = root / f"{name}.overlay.json"
    srt_path.write_text(srt_text, encoding="utf-8")
    json_path.write_text(
        json.dumps(cards, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    errors = validate(srt_path, json_path)
    if errors:
        raise AssertionError(f"{name} failed validation: {errors}")


def test_all_kinds(root: Path) -> None:
    srt_text = make_srt(ALL_KIND_TEXTS)
    srt_path = root / "all-kinds.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cues = parse_srt(srt_path)
    cards = generate_cards(
        cues,
        MediaContext(main_video=True, image=True),
        max_cards=len(EXPECTED_KINDS),
    )
    actual_kinds = [card["kind"] for card in cards]
    if actual_kinds != EXPECTED_KINDS:
        raise AssertionError(f"17-kind semantic fixture mismatch: {actual_kinds}")
    for cue, card in zip(cues, cards):
        if card["start"] != cue.start or card["end"] != cue.end:
            raise AssertionError("generated card did not preserve exact cue boundaries")
    validate_generated(root, "all-kinds-generated", srt_text, cards)


def test_media_gating(root: Path) -> None:
    texts = [
        "请看画中画操作演示，主视频同步展示。",
        "这张截图证明累计触达45.5万。",
        "两张截图的结果分别是20万和21.7万。",
        "自动化代码流程包括读取文件、解析内容、生成结构、运行校验。",
    ]
    srt_text = make_srt(texts)
    srt_path = root / "media-gating.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cards = generate_cards(parse_srt(srt_path), MediaContext(), max_cards=20)
    media_kinds = {
        "picture-in-picture",
        "image-feature",
        "proof-frame",
        "dual-proof",
        "code-window",
    }
    if any(card["kind"] in media_kinds for card in cards):
        raise AssertionError("generator emitted a media card without confirmed media")
    validate_generated(root, "media-gating-generated", srt_text, cards)


def test_multi_cue_step(root: Path) -> None:
    texts = ["第一步输入信息。", "第二步处理内容。", "第三步输出结果。"]
    srt_text = make_srt(texts, spacing_ms=1800, duration_ms=1600)
    srt_path = root / "multi-step.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cues = parse_srt(srt_path)
    cards = generate_cards(cues, max_cards=5)
    if len(cards) != 1 or cards[0]["kind"] != "step-rail":
        raise AssertionError(f"three consecutive step cues were not grouped: {cards}")
    if cards[0]["start"] != cues[0].start or cards[0]["end"] != cues[2].end:
        raise AssertionError("grouped step card did not use the first/last exact SRT boundary")
    validate_generated(root, "multi-step-generated", srt_text, cards)


def test_compare_long_text_fallback(root: Path) -> None:
    text = "过去需要经过很长的人工确认和多轮反复复杂审批，现在可以通过自动流程快速完成全部检查。"
    srt_text = make_srt([text])
    srt_path = root / "long-compare.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cards = generate_cards(parse_srt(srt_path), max_cards=5)
    if not cards or cards[0]["kind"] not in {"signal-card", "insight-grid"}:
        raise AssertionError(f"long compare should use a readable alternative card: {cards}")
    if any(card["kind"] == "compare-split" for card in cards):
        raise AssertionError("long compare text must not be squeezed into compare-split")
    validate_generated(root, "long-compare-generated", srt_text, cards)


def test_long_srt_coverage(root: Path) -> None:
    patterns = [
        "核心完成率达到73%。",
        "过去需要7天，现在只要2小时。",
        "真正的质量，是每次结果都可以复核。",
        "第二章讲清楚执行方法。",
        "完整流程包括输入、分析、生成、复核。",
    ]
    texts = [patterns[index % len(patterns)] for index in range(40)]
    srt_text = make_srt(texts, spacing_ms=1700, duration_ms=1500)
    srt_path = root / "long.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cues = parse_srt(srt_path)
    cards = generate_cards(cues, max_cards=10)
    if len(cards) != 10:
        raise AssertionError(f"expected 10 selected cards, got {len(cards)}")
    if cards[0]["start"] >= cues[10].start or cards[-1]["start"] < cues[30].start:
        raise AssertionError("long-SRT selection did not cover the full timeline")
    expected_kinds = {
        "metric-focus",
        "compare-split",
        "quote-lockup",
        "chapter-callout",
        "process-chain",
    }
    actual_kinds = {card["kind"] for card in cards}
    if actual_kinds != expected_kinds:
        raise AssertionError(
            f"long-SRT selection must preserve five supported kinds: {actual_kinds}"
        )
    repeated = generate_cards(cues, max_cards=10)
    if cards != repeated:
        raise AssertionError("same SRT must produce deterministic card selection")
    validate_generated(root, "long-generated", srt_text, cards)


def test_structured_window_beats_numeric_singletons(root: Path) -> None:
    texts = [
        "四组数据：基础28%。",
        "执行45%。",
        "协同63%。",
        "增长81%。",
    ]
    srt_text = make_srt(texts, spacing_ms=1700, duration_ms=1500)
    srt_path = root / "structured-data.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cues = parse_srt(srt_path)
    cards = generate_cards(cues, max_cards=8)
    if len(cards) != 1 or cards[0]["kind"] != "data-bars":
        raise AssertionError(
            f"four explicit data cues must form one data-bars card: {cards}"
        )
    if cards[0]["start"] != cues[0].start or cards[0]["end"] != cues[3].end:
        raise AssertionError("structured data card lost exact first/last cue boundaries")
    validate_generated(root, "structured-data-generated", srt_text, cards)


def test_no_false_process_grouping(root: Path) -> None:
    texts = [
        "今天来到现场。",
        "我们先看看环境。",
        "这里的信息比较多。",
        "接下来继续说明。",
        "最后再做总结。",
    ]
    srt_text = make_srt(texts, spacing_ms=1900, duration_ms=1600)
    srt_path = root / "ordinary-narration.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cards = generate_cards(parse_srt(srt_path), max_cards=8)
    if any(card["kind"] == "process-chain" for card in cards):
        raise AssertionError(f"ordinary narration was falsely grouped as process: {cards}")
    validate_generated(root, "ordinary-narration-generated", srt_text, cards)


def test_insufficient_variety_is_not_padded(root: Path) -> None:
    texts = [f"核心完成率达到{10 + index}%。" for index in range(40)]
    srt_text = make_srt(texts, spacing_ms=1700, duration_ms=1500)
    srt_path = root / "numeric-only.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cards = generate_cards(parse_srt(srt_path), max_cards=10)
    if not cards or {card["kind"] for card in cards} != {"metric-focus"}:
        raise AssertionError(f"numeric-only SRT must not invent extra kinds: {cards}")
    validate_generated(root, "numeric-only-generated", srt_text, cards)


def test_short_srt_is_not_padded(root: Path) -> None:
    texts = [
        "核心完成率达到73%。",
        "真正的质量，是每次结果都可以复核。",
    ]
    srt_text = make_srt(texts)
    srt_path = root / "short.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cards = generate_cards(parse_srt(srt_path), max_cards=10)
    actual_kinds = [card["kind"] for card in cards]
    if actual_kinds != ["metric-focus", "quote-lockup"]:
        raise AssertionError(f"short SRT must not be padded to five kinds: {cards}")
    validate_generated(root, "short-generated", srt_text, cards)


def test_date_is_not_a_metric(root: Path) -> None:
    srt_text = make_srt(["7月26日。"])
    srt_path = root / "date-only.srt"
    srt_path.write_text(srt_text, encoding="utf-8")
    cards = generate_cards(parse_srt(srt_path), max_cards=10)
    if cards:
        raise AssertionError(f"calendar date must not become a metric card: {cards}")


def main() -> None:
    if list(CATALOG) != EXPECTED_KINDS:
        raise AssertionError("catalog order/kinds drifted from the current 17-card app library")
    for kind, expected in EXPECTED_CURRENT_PRESETS.items():
        if CATALOG[kind]["presets"] != expected:
            raise AssertionError(f"{kind} current preset drift: {CATALOG[kind]['presets']}")

    with tempfile.TemporaryDirectory(prefix="effect-generation-generator-") as temp_directory:
        root = Path(temp_directory)
        test_all_kinds(root)
        test_media_gating(root)
        test_multi_cue_step(root)
        test_compare_long_text_fallback(root)
        test_long_srt_coverage(root)
        test_structured_window_beats_numeric_singletons(root)
        test_no_false_process_grouping(root)
        test_insufficient_variety_is_not_padded(root)
        test_short_srt_is_not_padded(root)
        test_date_is_not_a_metric(root)

    print(
        "10 generator cases passed; long SRT preserves five supported kinds "
        "and semantic fixture covers all 17 existing effect kinds"
    )


if __name__ == "__main__":
    main()
