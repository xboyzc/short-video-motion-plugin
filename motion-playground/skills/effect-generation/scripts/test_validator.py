#!/usr/bin/env python3

from __future__ import annotations

import json
import tempfile
from copy import deepcopy
from pathlib import Path

from validate_overlay_json import CATALOG, validate


CUE_TEXTS = [
    "核心转化率达到20%，结果稳定。",
    "过去需要七天，现在只要两个小时。",
    "真正的效率，是让每一步都有价值。",
    "复杂信息先提炼重点，再快速判断，最后执行。",
    "画中画展示操作步骤，主视频同步演示。",
    "这张截图集中展示产品结构和关键结果。",
    "重新理解工作方式，让信息直接出现。",
    "结果证据显示累计触达45.5万。",
    "两组结果分别达到20万和21.7万。",
    "完整流程包括选题、文案、剪辑、复盘。",
    "四个洞察是开头抓人、中段反转、引发评论、值得收藏。",
    "第一章节聚焦关键概念和方法。",
    "用一个图标标记核心概念。",
    "四组数据为基础28%、执行45%、协同63%、增长81%。",
    "三级步骤依次是输入、处理、输出。",
    "自动化流程依次读取文件、解析内容、生成结构、运行校验。",
    "八项能力包括人工智能驱动、创作记忆、人物关系、伏笔管理、通用规范、选题策划、世界观、正文创作。",
]


def timestamp(milliseconds: int) -> str:
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, millis = divmod(remainder, 1_000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"


def build_srt() -> str:
    blocks = []
    for index, cue_text in enumerate(CUE_TEXTS):
        start_ms = index * 2_200
        end_ms = start_ms + 2_000
        blocks.append(
            f"{index + 1}\n"
            f"{timestamp(start_ms)} --> {timestamp(end_ms)}\n"
            f"{cue_text}"
        )
    return "\n\n".join(blocks) + "\n"


SRT = build_srt()


def make_card(
    kind: str,
    cue_index: int,
    content: dict[str, object],
    preset_index: int = 0,
) -> dict[str, object]:
    x, y, w, font_size = CATALOG[kind]["presets"][preset_index]
    return {
        "id": f"fx-{cue_index + 1:04d}",
        "kind": kind,
        "start": round(cue_index * 2.2, 3),
        "end": round(cue_index * 2.2 + 2.0, 3),
        "x": x,
        "y": y,
        "w": w,
        "fontSize": font_size,
        "content": content,
    }


VALID = [
    make_card(
        "metric-focus",
        0,
        {"label": "核心转化率", "value": 20, "suffix": "%", "detail": "核心转化率达到20%"},
    ),
    make_card(
        "compare-split",
        1,
        {"title": "效率对比", "leftLabel": "过去", "leftValue": "七天", "rightLabel": "现在", "rightValue": "两个小时"},
    ),
    make_card(
        "quote-lockup",
        2,
        {"kicker": "核心观点", "quote": "真正的效率，是让每一步都有价值。", "source": ""},
    ),
    make_card(
        "signal-card",
        3,
        {"kicker": "动态信息", "line1": "提炼重点", "line2": "快速判断", "line3": "立即执行", "footer": "逐句出现"},
        1,
    ),
    make_card(
        "picture-in-picture",
        4,
        {"label": "操作演示", "title": "画中画同步展示", "caption": "主视频同步演示关键步骤"},
    ),
    make_card(
        "image-feature",
        5,
        {"label": "图片证据", "title": "一张图看懂结构", "caption": "集中展示产品结构和关键结果"},
        1,
    ),
    make_card(
        "kinetic-text",
        6,
        {"kicker": "重点强调", "line1": "重新理解", "line2": "工作方式", "line3": "直接出现"},
    ),
    make_card(
        "proof-frame",
        7,
        {"kicker": "结果证据", "title": "累计触达", "value": "45.5", "unit": "万", "caption": "结果稳定且可复核"},
    ),
    make_card(
        "dual-proof",
        8,
        {"kicker": "双重证据", "title": "两组结果", "leftValue": "20万", "rightValue": "21.7万", "caption": "同时验证"},
    ),
    make_card(
        "process-chain",
        9,
        {"kicker": "完整流程", "title": "从输入到结果", "line1": "选题", "line2": "文案", "line3": "剪辑", "line4": "复盘", "caption": "逐步拆开"},
    ),
    make_card(
        "insight-grid",
        10,
        {"kicker": "四点洞察", "title": "内容为什么有效", "line1": "开头抓人", "line2": "中段反转", "line3": "引发评论", "line4": "值得收藏", "caption": "结构化呈现"},
    ),
    make_card(
        "chapter-callout",
        11,
        {"kicker": "章节聚焦", "index": "一", "title": "关键概念", "detail": "聚焦方法与核心概念"},
    ),
    make_card(
        "icon-breath",
        12,
        {"kicker": "图标提示", "title": "标记核心概念", "detail": "用一个图标帮助快速识别"},
        1,
    ),
    make_card(
        "data-bars",
        13,
        {"kicker": "四组数据", "title": "阶段表现", "label1": "基础", "value1": "28%", "label2": "执行", "value2": "45%", "label3": "协同", "value3": "63%", "label4": "增长", "value4": "81%"},
    ),
    make_card(
        "step-rail",
        14,
        {"kicker": "三级步骤", "title": "依次完成", "line1": "输入", "line2": "处理", "line3": "输出", "caption": "步骤同步推进"},
        1,
    ),
    make_card(
        "code-window",
        15,
        {"kicker": "自动化流程", "title": "文件自动落地", "line1": "读取文件", "line2": "解析内容", "line3": "生成结构", "line4": "运行校验", "caption": "过程清晰可见"},
    ),
    make_card(
        "module-grid",
        16,
        {"kicker": "能力模块", "title": "完整创作系统", "module1": "人工智能驱动", "module2": "创作记忆", "module3": "人物关系", "module4": "伏笔管理", "module5": "通用规范", "module6": "选题策划", "module7": "世界观", "module8": "正文创作", "caption": "八项能力自动协同"},
        1,
    ),
]


def run_case(root: Path, name: str, payload, expect_valid: bool) -> None:
    srt_path = root / "sample.srt"
    json_path = root / f"{name}.json"
    srt_path.write_text(SRT, encoding="utf-8")
    json_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    errors = validate(srt_path, json_path)
    if expect_valid and errors:
        raise AssertionError(f"{name} should be valid: {errors}")
    if not expect_valid and not errors:
        raise AssertionError(f"{name} should be invalid")


def main() -> None:
    expected_kinds = {
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
    }
    if set(CATALOG) != expected_kinds:
        raise AssertionError(f"catalog mismatch: {sorted(set(CATALOG) ^ expected_kinds)}")
    if {card["kind"] for card in VALID} != expected_kinds:
        raise AssertionError("valid fixture does not cover every effect kind")

    with tempfile.TemporaryDirectory(prefix="effect-generation-test-") as temp_directory:
        root = Path(temp_directory)
        run_case(root, "all-seventeen-kinds", VALID, True)

        legacy_preset = deepcopy(VALID)
        legacy_preset[0]["x"], legacy_preset[0]["y"], legacy_preset[0]["w"], legacy_preset[0]["fontSize"] = CATALOG["metric-focus"]["legacyPresets"][0]
        run_case(root, "legacy-preset-compatible", legacy_preset, True)

        unknown_kind = deepcopy(VALID)
        unknown_kind[0]["kind"] = "custom-card"
        run_case(root, "unknown-kind", unknown_kind, False)

        shifted_time = deepcopy(VALID)
        shifted_time[1]["start"] = 2.3
        run_case(root, "shifted-time", shifted_time, False)

        wrong_preset = deepcopy(VALID)
        wrong_preset[2]["x"] = 12.0
        run_case(root, "wrong-preset", wrong_preset, False)

        invented_number = deepcopy(VALID)
        invented_number[8]["content"]["rightValue"] = "30万"
        run_case(root, "invented-number", invented_number, False)

        invented_quote = deepcopy(VALID)
        invented_quote[2]["content"]["quote"] = "真正的效率，是做得更多。"
        run_case(root, "invented-quote", invented_quote, False)

        too_many_cues = deepcopy(VALID)
        too_many_cues[11]["end"] = VALID[13]["end"]
        run_case(root, "too-many-cues", too_many_cues, False)

        mismatched_overlap = deepcopy(VALID)
        mismatched_overlap[1]["end"] = VALID[2]["end"]
        run_case(root, "mismatched-overlap", mismatched_overlap, False)

    print("9 validator cases passed; valid fixture covers all 17 existing effect kinds")


if __name__ == "__main__":
    main()
