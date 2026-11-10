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

from .const import DEFAULT_WINDOW_OPEN_TEMPERATURE, STORAGE_VERSION, WEEKDAYS

ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$")
TIME_PATTERN = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ENTITY_PATTERN = re.compile(r"^climate\.[a-z0-9_]+$")
COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")
ICON_PATTERN = re.compile(r"^mdi:[a-z0-9-]+$")
LABEL_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$")


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


def _normalize_weekday_rules(value: object, phase_ids: set[str]) -> dict[str, list[dict]]:
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
    if not result:
        raise InvalidData("missing_weekday")
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
        "auto_on_date",
        "auto_off_date",
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
    result = {
        "id": assignment_id,
        "mode_id": mode_id,
        "enabled": _bool(raw.get("enabled"), "invalid_assignment_enabled"),
        "weekday_rules": _normalize_weekday_rules(raw.get("weekday_rules"), phase_ids),
    }
    auto_on_date = _optional_date(raw.get("auto_on_date"), "invalid_auto_on_date")
    auto_off_date = _optional_date(raw.get("auto_off_date"), "invalid_auto_off_date")
    if auto_on_date:
        result["auto_on_date"] = auto_on_date
    if auto_off_date:
        result["auto_off_date"] = auto_off_date
    return result


def _normalize_schedule(raw: object, mode_ids: set[str], seen: set[str]) -> dict:
    if not isinstance(raw, dict):
        raise InvalidData("invalid_schedule")
    if set(raw) - {
        "id",
        "name",
        "climate_entity_id",
        "climate_entity_ids",
        "window_label",
        "window_open_temperature",
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
    assignments = raw.get("assignments")
    if not isinstance(assignments, list):
        raise InvalidData("invalid_assignments")
    assignment_ids: set[str] = set()
    phase_ids: set[str] = set()
    window_label = _optional_text(
        raw.get("window_label"), "invalid_window_label", pattern=LABEL_PATTERN
    )
    window_open_temperature = _temperature(
        raw.get("window_open_temperature", DEFAULT_WINDOW_OPEN_TEMPERATURE)
    )
    result = {
        "id": schedule_id,
        "name": _string(raw.get("name"), "invalid_schedule_name"),
        "climate_entity_ids": entity_ids,
        "window_open_temperature": window_open_temperature,
        "enabled": _bool(raw.get("enabled"), "invalid_schedule_enabled"),
        "assignments": [
            _normalize_assignment(item, mode_ids, assignment_ids, phase_ids) for item in assignments
        ],
    }
    if window_label:
        result["window_label"] = window_label
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
