#!/usr/bin/env python3

from __future__ import annotations

import json
import tempfile
from copy import deepcopy
from pathlib import Path

from validate_overlay_json import validate


SRT = """1
00:00:00,000 --> 00:00:02,000
我们的转化率提升到了73%。

2
00:00:02,200 --> 00:00:04,000
过去完成这项工作需要七天，

3
00:00:04,000 --> 00:00:06,000
现在只需要两个小时。

4
00:00:06,200 --> 00:00:08,000
真正的效率，不是做得更多，

5
00:00:08,000 --> 00:00:10,000
而是让每一步都有价值。

6
00:00:10,200 --> 00:00:12,000
我给它换了皮肤。

7
00:00:12,200 --> 00:00:14,000
它不是一个贴图，

8
00:00:14,000 --> 00:00:16,000
它是真正能够播放音乐的。
"""

VALID = [
    {
        "id": "fx-0001",
        "kind": "metric-focus",
        "start": 0.0,
        "end": 2.0,
        "x": 7.3,
        "y": 30.0,
        "w": 22.5,
        "fontSize": 124,
        "content": {"label": "转化率", "value": 73, "suffix": "%", "detail": "转化率提升到了73%"},
    },
    {
        "id": "fx-0002",
        "kind": "compare-split",
        "start": 2.2,
        "end": 6.0,
        "x": 4.5,
        "y": 35.0,
        "w": 91.0,
        "fontSize": 38,
        "content": {"title": "效率对比", "leftLabel": "过去", "leftValue": "七天", "rightLabel": "现在", "rightValue": "两个小时"},
    },
    {
        "id": "fx-0003",
        "kind": "quote-lockup",
        "start": 6.2,
        "end": 10.0,
        "x": 5.8,
        "y": 22.0,
        "w": 27.0,
        "fontSize": 32,
        "content": {"kicker": "核心观点", "quote": "真正的效率，不是做得更多，而是让每一步都有价值。", "source": ""},
    },
    {
        "id": "fx-0004",
        "kind": "kinetic-text",
        "start": 10.2,
        "end": 12.0,
        "x": 68.5,
        "y": 19.0,
        "w": 27.0,
        "fontSize": 54,
        "content": {"kicker": "TODAY", "line1": "换了皮肤", "line2": "", "line3": ""},
    },
    {
        "id": "fx-0005",
        "kind": "signal-card",
        "start": 12.2,
        "end": 16.0,
        "x": 4.6,
        "y": 23.5,
        "w": 27.2,
        "fontSize": 31,
        "content": {"kicker": "REAL FUNCTION", "line1": "不是贴图", "line2": "真正播放音乐", "line3": "", "footer": ""},
    },
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
    with tempfile.TemporaryDirectory(prefix="effect-generation-test-") as temp_directory:
        root = Path(temp_directory)
        run_case(root, "valid", VALID, True)

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
        invented_number[1]["content"]["rightValue"] = "3小时"
        run_case(root, "invented-number", invented_number, False)

    print("5 validator tests passed, including text-card field-name regression")


if __name__ == "__main__":
    main()
