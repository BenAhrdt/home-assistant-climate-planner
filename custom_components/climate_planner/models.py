"""Validated, serializable Climate Planner data models.

Weekday rules are lists of stable phase objects. Legacy string times are
accepted and migrated to phase objects when a planner is loaded.
"""

from __future__ import annotations

import math
import re
from copy import deepcopy
from datetime import date
from uuid import uuid4

from .const import (
    AUTO_RULE_HOLIDAYS,
    AUTO_RULE_KINDS,
    AUTO_RULE_RECURRENCES,
    DEFAULT_WINDOW_OPEN_TEMPERATURE,
    STORAGE_VERSION,
    WEEKDAYS,
    WINDOW_OPEN_DELAY_MAX_SECONDS,
    WINDOW_OPEN_DELAY_MIN_SECONDS,
    WINDOW_OPEN_DELAY_SECONDS,
)

ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$")
TIME_PATTERN = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ENTITY_PATTERN = re.compile(r"^climate\.[a-z0-9_]+$")
COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")
ICON_PATTERN = re.compile(r"^mdi:[a-z0-9-]+$")


class InvalidData(ValueError):
    """Raised for user or storage data that cannot be represented safely."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class RevisionConflict(InvalidData):
    """Raised when a panel saves an older snapshot."""

    def __init__(self) -> None:
        super().__init__("revision_conflict")


def new_id(prefix: str) -> str:
    """Return a stable opaque identifier generated once for a new object."""

    return f"{prefix}_{uuid4().hex}"


def empty_planner() -> dict:
    """Return a fresh, schema-valid planner."""

    return {
        "schema_version": STORAGE_VERSION,
        "revision": 0,
        "modes": [],
        "schedules": [],
    }


def _string(value: object, code: str, *, max_length: int = 160) -> str:
    if not isinstance(value, str):
        raise InvalidData(code)
    result = value.strip()
    if not result or len(result) > max_length:
        raise InvalidData(code)
    return result


def _id(value: object, code: str) -> str:
    result = _string(value, code, max_length=80)
    if not ID_PATTERN.fullmatch(result):
        raise InvalidData(code)
    return result


def _temperature(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise InvalidData("invalid_temperature")
    if not math.isfinite(float(value)) or not -100 <= float(value) <= 100:
        raise InvalidData("invalid_temperature")
    return float(value)


def _priority(value: object) -> int:
    """Normalize a mode priority without accepting booleans or huge values."""

    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not -1_000_000 <= value <= 1_000_000
    ):
        raise InvalidData("invalid_mode_priority")
    return value


def _window_open_delay_seconds(value: object) -> int:
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not WINDOW_OPEN_DELAY_MIN_SECONDS <= value <= WINDOW_OPEN_DELAY_MAX_SECONDS
    ):
        raise InvalidData("invalid_window_open_delay_seconds")
    return value


def _bool(value: object, code: str) -> bool:
    if type(value) is not bool:
        raise InvalidData(code)
    return value


def _optional_text(value: object, code: str, *, pattern: re.Pattern[str]) -> str | None:
    if value is None or value == "":
        return None
    result = _string(value, code, max_length=80)
    if not pattern.fullmatch(result):
        raise InvalidData(code)
    return result


def _optional_date(value: object, code: str) -> str | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str) or not DATE_PATTERN.fullmatch(value):
        raise InvalidData(code)
    try:
        date.fromisoformat(value)
    except ValueError as err:
        raise InvalidData(code) from err
    return value


def _normalize_climate_entity_names(value: object, entity_ids: list[str]) -> dict[str, str]:
    """Normalize optional per-plan display names without changing entity IDs."""

    if value is None:
        return {}
    if not isinstance(value, dict):
        raise InvalidData("invalid_climate_entity_names")
    result: dict[str, str] = {}
    for entity_id, name in value.items():
        if not isinstance(entity_id, str) or entity_id not in entity_ids:
            raise InvalidData("invalid_climate_entity_name_entity")
        if not isinstance(name, str):
            raise InvalidData("invalid_climate_entity_name")
        normalized = name.strip()
        if normalized and len(normalized) > 160:
            raise InvalidData("invalid_climate_entity_name")
        if normalized:
            result[entity_id] = normalized
    return result


def _normalize_weekday_rules(
    value: object, phase_ids: set[str], *, allow_empty: bool = False
) -> dict[str, list[dict]]:
    if not isinstance(value, dict):
        raise InvalidData("invalid_weekday_rules")
    unknown = set(value) - set(WEEKDAYS)
    if unknown:
        raise InvalidData("invalid_weekday")
    result: dict[str, list[dict]] = {}
    for weekday in WEEKDAYS:
        raw_times = value.get(weekday, [])
        # Accept a single string only for migration/convenience; persist lists.
        if isinstance(raw_times, str):
            raw_times = [raw_times]
        if not isinstance(raw_times, list):
            raise InvalidData("invalid_time")
        phases: list[dict] = []
        for raw_phase in raw_times:
            if isinstance(raw_phase, str):
                phase_id = new_id("phase")
                time_text = raw_phase
                override = None
            elif isinstance(raw_phase, dict):
                if set(raw_phase) - {"id", "time", "target_temperature"}:
                    raise InvalidData("invalid_phase")
                phase_id = _id(raw_phase.get("id") or new_id("phase"), "invalid_phase_id")
                time_text = raw_phase.get("time")
                override = raw_phase.get("target_temperature")
            else:
                raise InvalidData("invalid_phase")
            if phase_id in phase_ids:
                raise InvalidData("duplicate_phase_id")
            phase_ids.add(phase_id)
            if not isinstance(time_text, str) or not TIME_PATTERN.fullmatch(time_text):
                raise InvalidData("invalid_time")
            phase = {"id": phase_id, "time": time_text}
            if override is not None:
                phase["target_temperature"] = _temperature(override)
            phases.append(phase)
        if phases:
            result[weekday] = phases
    if not result and not allow_empty:
        raise InvalidData("missing_weekday")
    return result


def _normalize_auto_rules(value: object, seen: set[str]) -> list[dict]:
    """Normalize grouped automatic assignment enable/disable rules.

    The current shape stores one rule with a shared occasion and optional
    ``actions.on``/``actions.off`` configurations.  The former one-action
    shape remains accepted so existing planner documents keep working.
    """

    if value is None:
        return []
    if not isinstance(value, list) or len(value) > 100:
        raise InvalidData("invalid_auto_rules")
    result: list[dict] = []
    for raw_rule in value:
        if not isinstance(raw_rule, dict):
            raise InvalidData("invalid_auto_rule")
        if set(raw_rule) - {
            "id",
            "name",
            "action",
            "actions",
            "kind",
            "date",
            "holiday",
            "recurrence",
            "start_date",
            "start_time",
            "end_date",
            "continuous",
        }:
            raise InvalidData("invalid_auto_rule")
        rule_id = _id(raw_rule.get("id") or new_id("auto_rule"), "invalid_auto_rule_id")
        if rule_id in seen:
            raise InvalidData("duplicate_auto_rule_id")
        seen.add(rule_id)
        kind = raw_rule.get("kind")
        if kind not in AUTO_RULE_KINDS:
            raise InvalidData("invalid_auto_rule_kind")
        normalized = {"id": rule_id, "kind": kind}
        continuous = raw_rule.get("continuous", False)
        if type(continuous) is not bool:
            raise InvalidData("invalid_auto_rule_continuous")
        if continuous:
            normalized["continuous"] = True
        rule_name = raw_rule.get("name")
        if rule_name is not None and rule_name != "":
            if not isinstance(rule_name, str):
                raise InvalidData("invalid_auto_rule_name")
            rule_name = rule_name.strip()
            if len(rule_name) > 160:
                raise InvalidData("invalid_auto_rule_name")
            if rule_name:
                normalized["name"] = rule_name
        if kind == "date":
            date_text = _optional_date(raw_rule.get("date"), "invalid_auto_rule_date")
            if not date_text:
                raise InvalidData("missing_auto_rule_date")
            normalized["date"] = date_text
        elif kind == "holiday":
            holiday = raw_rule.get("holiday")
            if holiday not in AUTO_RULE_HOLIDAYS:
                raise InvalidData("invalid_auto_rule_holiday")
            normalized["holiday"] = holiday
        elif kind == "cycle":
            recurrence = raw_rule.get("recurrence")
            if recurrence not in AUTO_RULE_RECURRENCES:
                raise InvalidData("invalid_auto_rule_recurrence")
            normalized["recurrence"] = recurrence
            if "actions" not in raw_rule:
                start_date = _optional_date(
                    raw_rule.get("start_date"), "invalid_auto_rule_start_date"
                )
                start_time = raw_rule.get("start_time")
                if not isinstance(start_time, str) or not TIME_PATTERN.fullmatch(start_time):
                    raise InvalidData("invalid_auto_rule_start_time")
                normalized["start_time"] = start_time
                if start_date:
                    normalized["start_date"] = start_date
                end_date = _optional_date(raw_rule.get("end_date"), "invalid_auto_rule_end_date")
                if end_date and start_date and end_date < start_date:
                    raise InvalidData("invalid_auto_rule_end_date")
                if end_date:
                    normalized["end_date"] = end_date
        if "actions" in raw_rule:
            if "name" not in normalized:
                raise InvalidData("invalid_auto_rule_name")
            if any(key in raw_rule for key in ("action", "start_date", "start_time", "end_date")):
                raise InvalidData("invalid_auto_rule")
            raw_actions = raw_rule.get("actions")
            if (
                not isinstance(raw_actions, dict)
                or set(raw_actions) - {"on", "off"}
                or not any(action in raw_actions for action in ("on", "off"))
            ):
                raise InvalidData("invalid_auto_rule_actions")
            actions = {}
            for action in ("on", "off"):
                if action not in raw_actions:
                    continue
                raw_action = raw_actions[action]
                if not isinstance(raw_action, dict) or set(raw_action) - {
                    "time",
                    "start_date",
                    "end_date",
                }:
                    raise InvalidData("invalid_auto_rule_action")
                time_text = raw_action.get("time")
                if not isinstance(time_text, str) or not TIME_PATTERN.fullmatch(time_text):
                    raise InvalidData("invalid_auto_rule_time")
                action_value = {"time": time_text}
                if kind == "cycle":
                    start_date = _optional_date(
                        raw_action.get("start_date"), "invalid_auto_rule_start_date"
                    )
                    end_date = _optional_date(
                        raw_action.get("end_date"), "invalid_auto_rule_end_date"
                    )
                    if end_date and start_date and end_date < start_date:
                        raise InvalidData("invalid_auto_rule_end_date")
                    if start_date:
                        action_value["start_date"] = start_date
                    if end_date:
                        action_value["end_date"] = end_date
                elif raw_action.get("start_date") or raw_action.get("end_date"):
                    raise InvalidData("invalid_auto_rule_action")
                actions[action] = action_value
            normalized["actions"] = actions
        else:
            action = raw_rule.get("action")
            if action not in {"on", "off"}:
                raise InvalidData("invalid_auto_rule_action")
            normalized["action"] = action
        result.append(normalized)
    return result


def _normalize_mode(raw: object, seen: set[str]) -> dict:
    if not isinstance(raw, dict):
        raise InvalidData("invalid_mode")
    if set(raw) - {
        "id",
        "name",
        "target_temperature",
        "color",
        "icon",
        "enabled",  # legacy global flag; per-plan state lives on assignments
        "priority",
    }:
        raise InvalidData("invalid_mode")
    mode_id = _id(raw.get("id"), "invalid_mode_id")
    if mode_id in seen:
        raise InvalidData("duplicate_mode_id")
    seen.add(mode_id)
    if "enabled" in raw:
        _bool(raw["enabled"], "invalid_mode_enabled")
    # Keep the persisted planner value canonical in Celsius; UI and service
    # boundaries perform Home Assistant unit conversion explicitly.
    result = {
        "id": mode_id,
        "name": _string(raw.get("name"), "invalid_mode_name"),
        "target_temperature": _temperature(raw.get("target_temperature")),
        "priority": _priority(raw.get("priority", 0)),
    }
    color = _optional_text(raw.get("color"), "invalid_mode_color", pattern=COLOR_PATTERN)
    icon = _optional_text(raw.get("icon"), "invalid_mode_icon", pattern=ICON_PATTERN)
    if color:
        result["color"] = color
    if icon:
        result["icon"] = icon
    return result


def _normalize_assignment(
    raw: object, mode_ids: set[str], seen: set[str], phase_ids: set[str]
) -> dict:
    if not isinstance(raw, dict):
        raise InvalidData("invalid_assignment")
    if set(raw) - {
        "id",
        "mode_id",
        "enabled",
        "continuous",
        "auto_rules",
        "weekday_rules",
    }:
        raise InvalidData("invalid_assignment")
    assignment_id = _id(raw.get("id"), "invalid_assignment_id")
    if assignment_id in seen:
        raise InvalidData("duplicate_assignment_id")
    seen.add(assignment_id)
    mode_id = _id(raw.get("mode_id"), "invalid_assignment_mode")
    if mode_id not in mode_ids:
        raise InvalidData("unknown_mode_reference")
    auto_rules = _normalize_auto_rules(raw.get("auto_rules"), phase_ids)
    continuous = raw.get("continuous", any(rule.get("continuous") for rule in auto_rules))
    if type(continuous) is not bool:
        raise InvalidData("invalid_assignment_continuous")
    result = {
        "id": assignment_id,
        "mode_id": mode_id,
        "enabled": _bool(raw.get("enabled"), "invalid_assignment_enabled"),
        "weekday_rules": _normalize_weekday_rules(
            raw.get(
                "weekday_rules",
                {} if continuous else None,
            ),
            phase_ids,
            allow_empty=continuous,
        ),
    }
    if continuous:
        result["continuous"] = True
    if auto_rules:
        result["auto_rules"] = auto_rules
    return result


def _normalize_schedule(raw: object, mode_ids: set[str], seen: set[str]) -> dict:
    if not isinstance(raw, dict):
        raise InvalidData("invalid_schedule")
    if set(raw) - {
        "id",
        "name",
        "climate_entity_id",
        "climate_entity_ids",
        "climate_entity_names",
        "window_label",
        "window_open_enabled",
        "window_open_temperature",
        "window_open_delay_seconds",
        "enabled",
        "assignments",
    }:
        raise InvalidData("invalid_schedule")
    schedule_id = _id(raw.get("id"), "invalid_schedule_id")
    if schedule_id in seen:
        raise InvalidData("duplicate_schedule_id")
    seen.add(schedule_id)
    raw_entity_ids = raw.get("climate_entity_ids")
    legacy_entity_id = raw.get("climate_entity_id")
    if raw_entity_ids is None:
        if legacy_entity_id is None:
            raise InvalidData("missing_climate_entities")
        raw_entity_ids = [legacy_entity_id]
    elif legacy_entity_id is not None:
        raise InvalidData("invalid_climate_entities")
    if not isinstance(raw_entity_ids, list) or not raw_entity_ids:
        raise InvalidData("missing_climate_entities")
    entity_ids: list[str] = []
    for raw_entity_id in raw_entity_ids:
        entity_id = _string(raw_entity_id, "invalid_climate_entity", max_length=255)
        if not ENTITY_PATTERN.fullmatch(entity_id) or entity_id in entity_ids:
            raise InvalidData("invalid_climate_entity")
        entity_ids.append(entity_id)
    climate_entity_names = _normalize_climate_entity_names(
        raw.get("climate_entity_names"), entity_ids
    )
    assignments = raw.get("assignments")
    if not isinstance(assignments, list):
        raise InvalidData("invalid_assignments")
    assignment_ids: set[str] = set()
    phase_ids: set[str] = set()
    # `window_label` was briefly stored per schedule. Keep accepting this
    # legacy key so existing snapshots can be normalized and rewritten, but
    # use the integration-wide config-entry option instead.
    window_open_temperature = _temperature(
        raw.get("window_open_temperature", DEFAULT_WINDOW_OPEN_TEMPERATURE)
    )
    window_open_delay_seconds = _window_open_delay_seconds(
        raw.get("window_open_delay_seconds", WINDOW_OPEN_DELAY_SECONDS)
    )
    result = {
        "id": schedule_id,
        "name": _string(raw.get("name"), "invalid_schedule_name"),
        "climate_entity_ids": entity_ids,
        "window_open_enabled": _bool(
            raw.get("window_open_enabled", True), "invalid_window_open_enabled"
        ),
        "window_open_temperature": window_open_temperature,
        "window_open_delay_seconds": window_open_delay_seconds,
        "enabled": _bool(raw.get("enabled"), "invalid_schedule_enabled"),
        "assignments": [
            _normalize_assignment(item, mode_ids, assignment_ids, phase_ids) for item in assignments
        ],
    }
    if climate_entity_names:
        result["climate_entity_names"] = climate_entity_names
    return result


def validate_planner(raw: object) -> dict:
    """Validate and normalize a complete planner snapshot.

    Validation is intentionally backend-side as the custom panel is only a
    client.  A complete snapshot is replaced in one atomic Store write.
    """

    if raw is None:
        return empty_planner()
    if not isinstance(raw, dict):
        raise InvalidData("invalid_planner")
    schema_version = raw.get("schema_version", STORAGE_VERSION)
    if schema_version != STORAGE_VERSION:
        raise InvalidData("unsupported_schema_version")
    revision = raw.get("revision", 0)
    if isinstance(revision, bool) or not isinstance(revision, int) or revision < 0:
        raise InvalidData("invalid_revision")
    if set(raw) - {"schema_version", "revision", "modes", "schedules"}:
        raise InvalidData("invalid_planner")
    modes_raw = raw.get("modes")
    schedules_raw = raw.get("schedules")
    if not isinstance(modes_raw, list) or not isinstance(schedules_raw, list):
        raise InvalidData("invalid_planner")
    mode_ids: set[str] = set()
    schedule_ids: set[str] = set()
    legacy_disabled_modes = {
        item.get("id")
        for item in modes_raw
        if isinstance(item, dict) and item.get("enabled") is False
    }
    normalized_modes = [_normalize_mode(item, mode_ids) for item in modes_raw]
    normalized_schedules = [
        _normalize_schedule(item, mode_ids, schedule_ids) for item in schedules_raw
    ]
    # Older snapshots briefly stored a global mode switch. Preserve a paused
    # legacy mode by migrating it to each matching per-plan assignment.
    for schedule in normalized_schedules:
        for assignment in schedule["assignments"]:
            if assignment["mode_id"] in legacy_disabled_modes:
                assignment["enabled"] = False
    return {
        "schema_version": STORAGE_VERSION,
        "revision": revision,
        "modes": normalized_modes,
        "schedules": normalized_schedules,
    }


def migrate_storage(raw: object) -> dict:
    """Migrate the persisted value to the current schema without data loss."""

    if raw is None:
        return empty_planner()
    if not isinstance(raw, dict):
        raise InvalidData("invalid_storage")
    # Version one is the first released schema.  Keeping this explicit makes
    # future migrations additive and prevents silently dropping unknown data.
    version = raw.get("schema_version", STORAGE_VERSION)
    if version != STORAGE_VERSION:
        raise InvalidData("unsupported_schema_version")
    return validate_planner(raw)


def clone_planner(data: dict) -> dict:
    """Return a detached JSON-compatible snapshot for websocket responses."""

    return deepcopy(data)
