"""Pure weekly schedule evaluation and week-view generation."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, tzinfo

from .const import WEEKDAYS


@dataclass(frozen=True, slots=True)
class ActiveMatch:
    """The mode selected for one schedule at a point in local time."""

    mode: dict
    assignment: dict
    phase: dict | str
    occurrence: datetime


def _local_now(now: datetime) -> datetime:
    if now.tzinfo is None:
        raise ValueError("Schedule evaluation requires an aware datetime")
    return now.astimezone(now.tzinfo)


def _at_local(day: date, time_text: str, zone: tzinfo) -> datetime:
    hours, minutes = (int(part) for part in time_text.split(":", 1))
    return datetime.combine(day, time(hour=hours, minute=minutes), tzinfo=zone)


def _mode_map(modes: list[dict]) -> dict[str, dict]:
    return {mode["id"]: mode for mode in modes}


def _phase_time(phase: dict | str) -> str:
    """Return a phase time while tolerating pre-migration data."""

    return phase["time"] if isinstance(phase, dict) else phase


def latest_auto_date_event(assignment: dict, current_date: date) -> tuple[str, bool] | None:
    """Return the latest reached automatic enable/disable event.

    The assignment's persisted ``enabled`` value remains the manual/current
    state until an automatic date is reached.  If both dates are reached, the
    later date wins; a disable event wins deterministically when both dates are
    equal.
    """

    events = []
    for field, enabled, tie_breaker in (
        ("auto_on_date", True, 0),
        ("auto_off_date", False, 1),
    ):
        date_text = assignment.get(field)
        if not date_text:
            continue
        event_date = date.fromisoformat(date_text)
        if event_date <= current_date:
            events.append((event_date, tie_breaker, date_text, enabled, field))
    if not events:
        return None
    _event_date, _tie_breaker, date_text, enabled, field = max(events)
    return f"{field}:{date_text}", enabled


def next_auto_date(schedule: dict, now: datetime) -> datetime | None:
    """Return the next future automatic enable/disable date at local midnight."""

    local_now = _local_now(now)
    zone = local_now.tzinfo
    assert zone is not None
    upcoming: list[datetime] = []
    for assignment in schedule["assignments"]:
        for field in ("auto_on_date", "auto_off_date"):
            date_text = assignment.get(field)
            if not date_text:
                continue
            event_date = date.fromisoformat(date_text)
            if event_date > local_now.date():
                upcoming.append(_at_local(event_date, "00:00", zone))
    return min(upcoming) if upcoming else None


def _candidates(
    schedule: dict,
    modes: list[dict],
    now: datetime,
    *,
    days: int,
    respect_schedule_enabled: bool = True,
    respect_assignment_enabled: bool = True,
) -> list[tuple]:
    local_now = _local_now(now)
    zone = local_now.tzinfo
    assert zone is not None
    mode_by_id = _mode_map(modes)
    mode_order = {mode["id"]: index for index, mode in enumerate(modes)}
    candidates: list[tuple] = []
    for days_ago in range(days + 1):
        day = local_now.date() - timedelta(days=days_ago)
        weekday = WEEKDAYS[day.weekday()]
        for assignment_index, assignment in enumerate(schedule["assignments"]):
            if respect_assignment_enabled and not assignment["enabled"]:
                continue
            mode = mode_by_id.get(assignment["mode_id"])
            if mode is None:
                continue
            for time_index, phase in enumerate(assignment["weekday_rules"].get(weekday, [])):
                time_text = _phase_time(phase)
                occurrence = _at_local(day, time_text, zone)
                if occurrence <= local_now:
                    candidates.append(
                        (
                            occurrence,
                            assignment_index,
                            time_index,
                            mode_order.get(mode["id"], -1),
                            mode,
                            assignment,
                            phase,
                        )
                    )
    return candidates


def select_active_mode(
    schedule: dict,
    modes: list[dict],
    now: datetime,
    *,
    respect_schedule_enabled: bool = True,
    respect_assignment_enabled: bool = True,
) -> ActiveMatch | None:
    """Select the latest matching mode, including the previous weekly cycle.

    Higher mode priority wins first. Equal priorities use the latest matching
    activation, then configured assignment and mode order as deterministic
    tie-breakers.
    """

    if respect_schedule_enabled and not schedule["enabled"]:
        return None
    candidates = _candidates(
        schedule,
        modes,
        now,
        days=7,
        respect_schedule_enabled=respect_schedule_enabled,
        respect_assignment_enabled=respect_assignment_enabled,
    )
    if not candidates:
        return None
    occurrence, _assignment_index, _time_index, _mode_index, mode, assignment, phase = max(
        candidates,
        key=lambda item: (
            item[4].get("priority", 0),
            item[0],
            item[1],
            item[2],
            item[3],
        ),
    )
    return ActiveMatch(mode=mode, assignment=assignment, phase=phase, occurrence=occurrence)


def next_activation(schedule: dict, modes: list[dict], now: datetime) -> datetime | None:
    """Return the next configured activation strictly after ``now``."""

    local_now = _local_now(now)
    zone = local_now.tzinfo
    assert zone is not None
    mode_by_id = _mode_map(modes)
    occurrences: list[datetime] = []
    for offset in range(8):
        day = local_now.date() + timedelta(days=offset)
        weekday = WEEKDAYS[day.weekday()]
        for assignment in schedule["assignments"]:
            mode = mode_by_id.get(assignment["mode_id"])
            if not assignment["enabled"] or mode is None:
                continue
            for phase in assignment["weekday_rules"].get(weekday, []):
                time_text = _phase_time(phase)
                occurrence = _at_local(day, time_text, zone)
                if occurrence > local_now:
                    occurrences.append(occurrence)
    return min(occurrences) if occurrences else None


def week_view(schedule: dict, modes: list[dict], now: datetime) -> dict:
    """Build display segments for Monday through Sunday in the HA time zone.

    A final phase without a following boundary extends to the fixed day end.
    Actual climate changes remain driven by configured activation start times.
    """

    local_now = _local_now(now)
    zone = local_now.tzinfo
    assert zone is not None
    days: list[dict] = []
    for weekday_index, weekday in enumerate(WEEKDAYS):
        day = local_now.date() - timedelta(days=local_now.weekday()) + timedelta(days=weekday_index)
        day_start = _at_local(day, "00:00", zone)
        mode_by_id = _mode_map(modes)
        points = sorted(
            {
                int(_phase_time(phase)[:2]) * 60 + int(_phase_time(phase)[3:])
                for assignment in schedule["assignments"]
                if assignment["enabled"] and mode_by_id.get(assignment["mode_id"]) is not None
                for phase in assignment["weekday_rules"].get(weekday, [])
            }
        )
        segments: list[dict] = []

        def append_segment(
            start: int,
            end: int,
            *,
            _day_start: datetime = day_start,
            _segments: list[dict] = segments,
        ) -> None:
            if end <= start:
                return
            # A paused schedule still has a configuration worth displaying.
            # Runtime evaluation continues to respect ``schedule["enabled"]``;
            # only the read-only week preview deliberately ignores that flag.
            match = select_active_mode(
                schedule,
                modes,
                _day_start + timedelta(minutes=start),
                respect_schedule_enabled=False,
            )
            if not match:
                return
            mode = match.mode
            _segments.append(
                {
                    "start": start,
                    "end": end,
                    "mode_id": mode["id"],
                    "mode_name": mode["name"],
                    "target_temperature": (
                        match.phase.get("target_temperature", mode["target_temperature"])
                        if isinstance(match.phase, dict)
                        else mode["target_temperature"]
                    ),
                    "color": mode.get("color"),
                    "icon": mode.get("icon"),
                    "phase_id": match.phase.get("id") if isinstance(match.phase, dict) else None,
                    "assignment_id": match.assignment["id"],
                }
            )

        cursor = 0
        for point in points:
            append_segment(cursor, point)
            cursor = point
        append_segment(cursor, 1440)
        days.append({"weekday": weekday, "segments": segments})
    current_minute = None
    if schedule["enabled"]:
        current_minute = local_now.hour * 60 + local_now.minute + local_now.second / 60
    return {
        "schedule_id": schedule["id"],
        "days": days,
        "current_weekday": WEEKDAYS[local_now.weekday()],
        "current_minute": current_minute,
    }
