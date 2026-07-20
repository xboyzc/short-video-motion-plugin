#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


EPSILON = 0.0011
TOP_LEVEL_KEYS = {"id", "kind", "start", "end", "x", "y", "w", "fontSize", "content"}
ID_PATTERN = re.compile(r"^fx-(\d{4})$")
NUMBER_PATTERN = re.compile(r"\d+(?:[.,]\d+)?")

PRESETS = {
    "metric-focus": {(7.3, 30.0, 22.5, 124)},
    "compare-split": {(4.5, 35.0, 91.0, 38)},
    "quote-lockup": {(5.8, 22.0, 27.0, 32)},
    "signal-card": {(4.6, 23.5, 27.2, 31), (68.2, 23.5, 27.2, 31)},
    "kinetic-text": {(4.5, 19.0, 27.0, 54), (68.5, 19.0, 27.0, 54)},
}

CONTENT_RULES = {
    "metric-focus": {
        "keys": {"label", "value", "suffix", "detail"},
        "limits": {"label": 42, "suffix": 6, "detail": 42},
        "required": {"label", "detail"},
    },
    "compare-split": {
        "keys": {"title", "leftLabel", "leftValue", "rightLabel", "rightValue"},
        "limits": {"title": 42, "leftLabel": 42, "leftValue": 42, "rightLabel": 42, "rightValue": 42},
        "required": {"title", "leftLabel", "leftValue", "rightLabel", "rightValue"},
    },
    "quote-lockup": {
        "keys": {"kicker", "quote", "source"},
        "limits": {"kicker": 42, "quote": 72, "source": 42},
        "required": {"kicker", "quote"},
    },
    "signal-card": {
        "keys": {"kicker", "line1", "line2", "line3", "footer"},
        "limits": {"kicker": 24, "line1": 16, "line2": 16, "line3": 16, "footer": 24},
        "required": {"kicker", "line1", "line2"},
    },
    "kinetic-text": {
        "keys": {"kicker", "line1", "line2", "line3"},
        "limits": {"kicker": 22, "line1": 12, "line2": 12, "line3": 12},
        "required": {"kicker", "line1"},
    },
}


@dataclass(frozen=True)
class Cue:
    start: float
    end: float
    text: str


def timestamp_to_seconds(value: str) -> float:
    match = re.fullmatch(r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})", value.strip())
    if not match:
        raise ValueError(f"invalid SRT timestamp: {value}")
    hours, minutes, seconds, milliseconds = (int(part) for part in match.groups())
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000


def parse_srt(path: Path) -> list[Cue]:
    source = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")
    cues: list[Cue] = []
    for block in re.split(r"\n{2,}", source.strip()):
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        timing_index = next((index for index, line in enumerate(lines) if "-->" in line), None)
        if timing_index is None:
            continue
        timing = lines[timing_index].split("-->")
        if len(timing) != 2:
            raise ValueError(f"invalid SRT timing line: {lines[timing_index]}")
        start_text = timing[0].strip().split()[0]
        end_text = timing[1].strip().split()[0]
        start = timestamp_to_seconds(start_text)
        end = timestamp_to_seconds(end_text)
        text = " ".join(lines[timing_index + 1 :]).strip()
        if end <= start or not text:
            raise ValueError(f"invalid or empty SRT cue: {lines[timing_index]}")
        cues.append(Cue(start, end, text))
    if not cues:
        raise ValueError("SRT contains no valid cues")
    return sorted(cues, key=lambda cue: (cue.start, cue.end))


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def normalize_quote(value: str) -> str:
    return re.sub(r"[\s，。！？；：、,.!?;:'\"“”‘’（）()《》【】\-—…]", "", value)


def find_interval(cues: list[Cue], start: float, end: float) -> tuple[int, int] | None:
    for start_index, cue in enumerate(cues):
        if abs(cue.start - start) > EPSILON:
            continue
        for end_index in range(start_index, min(len(cues), start_index + 3)):
            if abs(cues[end_index].end - end) <= EPSILON:
                return start_index, end_index
    return None


def validate_content(card: dict[str, Any], covered_text: str, label: str, errors: list[str]) -> None:
    kind = card["kind"]
    content = card.get("content")
    if not isinstance(content, dict):
        errors.append(f"{label}.content must be an object")
        return
    rules = CONTENT_RULES[kind]
    if set(content) != rules["keys"]:
        errors.append(f"{label}.content keys must be exactly {sorted(rules['keys'])}")
        return
    for key, limit in rules["limits"].items():
        value = content[key]
        if not isinstance(value, str):
            errors.append(f"{label}.content.{key} must be a string")
            continue
        if key in rules["required"] and not value.strip():
            errors.append(f"{label}.content.{key} must not be empty")
        if "\n" in value or len(value) > limit:
            errors.append(f"{label}.content.{key} exceeds its single-line limit {limit}")

    if kind == "metric-focus":
        value = content.get("value")
        if not is_number(value):
            errors.append(f"{label}.content.value must be a finite number")
        elif str(value).rstrip("0").rstrip(".") not in covered_text.replace(",", ""):
            errors.append(f"{label}.content.value must appear in the covered SRT text")

    source_numbers = {token.replace(",", ".") for token in NUMBER_PATTERN.findall(covered_text)}
    for key, value in content.items():
        if kind == "metric-focus" and key == "value":
            continue
        if not isinstance(value, str):
            continue
        for token in NUMBER_PATTERN.findall(value):
            normalized = token.replace(",", ".")
            if normalized not in source_numbers:
                errors.append(f"{label} introduces number {token!r} not found in its SRT interval")

    if kind == "quote-lockup":
        quote = content.get("quote", "")
        if isinstance(quote, str) and normalize_quote(quote) not in normalize_quote(covered_text):
            errors.append(f"{label}.content.quote must be a verbatim SRT excerpt")


def validate(srt_path: Path, json_path: Path) -> list[str]:
    errors: list[str] = []
    try:
        cues = parse_srt(srt_path)
    except (OSError, UnicodeError, ValueError) as error:
        return [f"SRT error: {error}"]
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        return [f"JSON error: {error}"]
    if not isinstance(data, list):
        return ["JSON root must be an array"]

    seen_ids: set[str] = set()
    intervals: list[tuple[float, float, float, float, str, str]] = []
    order_keys: list[tuple[float, float, str]] = []

    for index, card in enumerate(data):
        label = f"card[{index}]"
        if not isinstance(card, dict):
            errors.append(f"{label} must be an object")
            continue
        if set(card) != TOP_LEVEL_KEYS:
            errors.append(f"{label} keys must be exactly {sorted(TOP_LEVEL_KEYS)}")
            continue
        card_id = card.get("id")
        expected_id = f"fx-{index + 1:04d}"
        if not isinstance(card_id, str) or not ID_PATTERN.fullmatch(card_id):
            errors.append(f"{label}.id must match fx-0001 format")
        elif card_id != expected_id:
            errors.append(f"{label}.id must be {expected_id}")
        elif card_id in seen_ids:
            errors.append(f"duplicate id: {card_id}")
        seen_ids.add(str(card_id))

        kind = card.get("kind")
        if kind not in PRESETS:
            errors.append(f"{label}.kind is not in the five-card library")
            continue

        start, end = card.get("start"), card.get("end")
        if not is_number(start) or not is_number(end) or float(start) < 0 or float(end) <= float(start):
            errors.append(f"{label} has invalid start/end")
            continue
        start, end = float(start), float(end)
        if abs(start - round(start, 3)) > 1e-9 or abs(end - round(end, 3)) > 1e-9:
            errors.append(f"{label} start/end must have at most three decimals")
        if end - start < 0.6 or end - start > 10:
            errors.append(f"{label} duration must be between 0.6 and 10 seconds")
        interval = find_interval(cues, start, end)
        if interval is None:
            errors.append(f"{label} start/end do not match 1-3 consecutive SRT cues")
            covered_text = ""
        else:
            start_index, end_index = interval
            covered_text = " ".join(cue.text for cue in cues[start_index : end_index + 1])

        geometry_values = (card.get("x"), card.get("y"), card.get("w"), card.get("fontSize"))
        if not all(is_number(value) for value in geometry_values):
            errors.append(f"{label} geometry and fontSize must be finite numbers")
            continue
        geometry = tuple(float(value) for value in geometry_values)
        if not any(all(abs(actual - expected) <= 1e-9 for actual, expected in zip(geometry, preset)) for preset in PRESETS[kind]):
            errors.append(f"{label} does not use a locked visual preset for {kind}")

        if covered_text:
            validate_content(card, covered_text, label, errors)
        order_keys.append((start, end, str(card_id)))
        intervals.append((start, end, geometry[0], geometry[0] + geometry[2], kind, str(card_id)))

    if order_keys != sorted(order_keys):
        errors.append("cards must be sorted by start, end, id")

    for left_index, left in enumerate(intervals):
        for right in intervals[left_index + 1 :]:
            overlap = max(left[0], right[0]) < min(left[1], right[1]) - EPSILON
            if not overlap:
                continue
            same_interval = abs(left[0] - right[0]) <= EPSILON and abs(left[1] - right[1]) <= EPSILON
            non_intersecting_geometry = left[3] <= right[2] or right[3] <= left[2]
            if not same_interval:
                errors.append(f"{left[5]} and {right[5]} overlap with different time intervals")
            if left[4] == right[4]:
                errors.append(f"{left[5]} and {right[5]} repeat the same kind simultaneously")
            if "compare-split" in {left[4], right[4]}:
                errors.append(f"compare-split cannot overlap: {left[5]} and {right[5]}")
            if not non_intersecting_geometry:
                errors.append(f"{left[5]} and {right[5]} overlap visually")

    event_points = sorted({point for item in intervals for point in item[:2]})
    for point in event_points:
        active = [item for item in intervals if item[0] <= point < item[1]]
        if len(active) > 2:
            errors.append(f"more than two cards active at {point:.3f}s")
            break
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SRT-bound Overlay Studio JSON")
    parser.add_argument("srt", type=Path)
    parser.add_argument("overlay_json", type=Path)
    args = parser.parse_args()
    errors = validate(args.srt, args.overlay_json)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("VALID")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
