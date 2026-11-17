"""Pure weekly schedule evaluation and week-view generation."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, tzinfo

from .const import (
    AUTO_RULE_HOLIDAYS,
    DEFAULT_HOLIDAY_REGION,
    HOLIDAY_NATIONAL,
    HOLIDAY_STATE_AVAILABILITY,
    WEEKDAYS,
)


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


def _easter_sunday(year: int) -> date:
    """Return the Gregorian Easter Sunday for a year."""

    # Anonymous Gregorian algorithm, valid for the Home Assistant date range.
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l_value = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l_value) // 451
    month = (h + l_value - 7 * m + 114) // 31
    day = (h + l_value - 7 * m + 114) % 31 + 1
    return date(year, month, day)


def _first_advent(year: int) -> date:
    """Return the first Advent Sunday for a year."""

    christmas = date(year, 12, 25)
    last_sunday = christmas - timedelta(days=(christmas.weekday() + 1) % 7)
    return last_sunday - timedelta(days=21)


def available_holiday_ids(region: str = DEFAULT_HOLIDAY_REGION) -> tuple[str, ...]:
    """Return holiday IDs available for a German region selection."""

    if region == "all":
        return AUTO_RULE_HOLIDAYS
    return tuple(
        holiday
        for holiday in AUTO_RULE_HOLIDAYS
        if (
            holiday in HOLIDAY_NATIONAL
            or (holiday not in HOLIDAY_STATE_AVAILABILITY and holiday not in {"whit_sunday"})
            or region in HOLIDAY_STATE_AVAILABILITY.get(holiday, frozenset())
        )
    )


def _holiday_dates(holiday: str, year: int, *, holiday_region: str = "all") -> tuple[date, ...]:
    """Return supported holiday dates without relying on an external service."""

    if holiday not in available_holiday_ids(holiday_region):
        return ()

    fixed = {
        "new_year": (1, 1),
        "epiphany": (1, 6),
        "international_womens_day": (3, 8),
        "labour_day": (5, 1),
        "german_unity": (10, 3),
        "reformation_day": (10, 31),
        "all_saints_day": (11, 1),
        "maria_himmelfahrt": (8, 15),
        "world_children_day": (9, 20),
        "christmas_eve": (12, 24),
        "christmas_day": (12, 25),
        "boxing_day": (12, 26),
        "new_years_eve": (12, 31),
    }
    if holiday in fixed:
        month, day = fixed[holiday]
        return (date(year, month, day),)
    if holiday.startswith("advent_") and holiday[-1:] in {"1", "2", "3", "4"}:
        return (_first_advent(year) + timedelta(days=7 * (int(holiday[-1]) - 1)),)
    if holiday == "all_advent":
        first = _first_advent(year)
        return tuple(first + timedelta(days=7 * offset) for offset in range(4))
    easter = _easter_sunday(year)
    if holiday == "easter_sunday":
        return (easter,)
    if holiday == "easter_period":
        return tuple(easter + timedelta(days=offset) for offset in range(-2, 2))
    if holiday == "christmas_period":
        return tuple(date(year, 12, day) for day in (24, 25, 26))
    if holiday == "repentance_day":
        return (_first_advent(year) - timedelta(days=11),)
    movable_offsets = {
        "good_friday": -2,
        "easter_saturday": -1,
        "easter_monday": 1,
        "whit_sunday": 49,
        "ascension": 39,
        "whit_monday": 50,
        "corpus_christi": 60,
    }
    offset = movable_offsets.get(holiday)
    return (easter + timedelta(days=offset),) if offset is not None else ()


def _auto_rule_dates(
    rule: dict, year: int, *, holiday_region: str = DEFAULT_HOLIDAY_REGION
) -> tuple[date, ...]:
    """Resolve a recurring rule for one calendar year."""

    kind = rule.get("kind")
    if kind == "date":
        event_date = date.fromisoformat(rule["date"])
        return (event_date,) if event_date.year == year else ()
    if kind == "holiday":
        return _holiday_dates(rule["holiday"], year, holiday_region=holiday_region)
    return ()


def _auto_rule_actions(rule: dict) -> list[tuple[str, dict]]:
    """Return action/configuration pairs for current and legacy rule shapes."""

    actions = rule.get("actions")
    if isinstance(actions, dict):
        return [
            (action, config)
            for action in ("on", "off")
            if isinstance(config := actions.get(action), dict)
        ]
    action = rule.get("action")
    return [(action, rule)] if action in {"on", "off"} else []


def _auto_action_time(action_config: dict) -> str:
    """Return an action time while keeping legacy date rules at midnight."""

    return action_config.get("time") or action_config.get("start_time") or "00:00"


def _auto_rule_events(
    assignment: dict,
    current_date: date,
    *,
    future_only: bool = False,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
) -> list[tuple[date, str, int, int, str, bool]]:
    """Return automatic date and holiday events relevant to ``current_date``."""

    events: list[tuple[date, str, int, int, str, bool]] = []
    rules = assignment.get("auto_rules", [])
    if not isinstance(rules, list):
        return events
    years = (
        range(current_date.year, current_date.year + 2)
        if future_only
        else range(current_date.year - 1, current_date.year + 1)
    )
    for index, rule in enumerate(rules):
        if not isinstance(rule, dict):
            continue
        for action, action_config in _auto_rule_actions(rule):
            enabled = action == "on"
            tie_breaker = 0 if enabled else 1
            action_time = _auto_action_time(action_config)
            if rule.get("kind") == "date":
                event_date = date.fromisoformat(rule["date"])
                matches = event_date >= current_date if future_only else event_date <= current_date
                if matches:
                    marker = f"auto_rule:{rule.get('id', index)}:{action}:{event_date}"
                    events.append(
                        (event_date, action_time, tie_breaker, index + 1, marker, enabled)
                    )
                continue
            for year in years:
                for event_date in _auto_rule_dates(rule, year, holiday_region=holiday_region):
                    matches = (
                        event_date >= current_date if future_only else event_date <= current_date
                    )
                    if matches:
                        marker = f"auto_rule:{rule.get('id', index)}:{action}:{event_date}"
                        events.append(
                            (event_date, action_time, tie_breaker, index + 1, marker, enabled)
                        )
    return events


def latest_auto_date_event(
    assignment: dict,
    current_date: date,
    *,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
) -> tuple[str, bool] | None:
    """Return the latest reached automatic enable/disable event.

    The assignment's persisted ``enabled`` value remains the manual/current
    state until an automatic date is reached.  If both dates are reached, the
    later date wins; a disable event wins deterministically when both dates are
    equal.
    """

    events = _auto_rule_events(assignment, current_date, holiday_region=holiday_region)
    if not events:
        return None
    _event_date, _time_text, _tie_breaker, _index, marker, enabled = max(events)
    return marker, enabled


def _add_months(source: date, months: int) -> date | None:
    """Add calendar months while skipping impossible anchor days."""

    absolute_month = source.year * 12 + source.month - 1 + months
    year, month_index = divmod(absolute_month, 12)
    try:
        return date(year, month_index + 1, source.day)
    except ValueError:
        return None


def _cycle_occurrences(
    rule: dict, action_config: dict, now: datetime, *, future_only: bool
) -> list[datetime]:
    """Return the relevant previous or next occurrence for a cyclic rule."""

    zone = now.tzinfo
    assert zone is not None
    anchor_date = (
        date.fromisoformat(action_config["start_date"])
        if action_config.get("start_date")
        else now.date()
    )
    start = _at_local(anchor_date, _auto_action_time(action_config), zone)
    end_date = (
        date.fromisoformat(action_config["end_date"]) if action_config.get("end_date") else None
    )
    recurrence = rule["recurrence"]
    if recurrence in {"hourly", "daily", "weekly"}:
        periods = {
            "hourly": timedelta(hours=1),
            "daily": timedelta(days=1),
            "weekly": timedelta(days=7),
        }
        period = periods[recurrence]
        if now < start:
            index = 0
        else:
            elapsed = now - start
            index = int(elapsed.total_seconds() // period.total_seconds())
            if future_only:
                index += 1
        occurrence = start + index * period
        in_range = end_date is None or occurrence.date() <= end_date
        if in_range and ((occurrence > now) if future_only else (occurrence <= now)):
            return [occurrence]
        return []

    month_step = {"monthly": 1, "quarterly": 3, "yearly": 12}[recurrence]
    month_difference = (now.year - start.year) * 12 + now.month - start.month
    approximate_index = max(0, month_difference // month_step)
    first_index = max(0, approximate_index - 2)
    last_index = approximate_index + (5 if future_only else 1)
    occurrences: list[datetime] = []
    for index in range(first_index, last_index + 1):
        event_date = _add_months(start.date(), index * month_step)
        if event_date is None:
            continue
        occurrence = _at_local(event_date, _auto_action_time(action_config), zone)
        in_range = end_date is None or event_date <= end_date
        if in_range and ((occurrence > now) if future_only else (occurrence <= now)):
            occurrences.append(occurrence)
    if future_only:
        return [min(occurrences)] if occurrences else []
    return [max(occurrences)] if occurrences else []


def _latest_auto_event_details(
    assignment: dict,
    now: datetime,
    *,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
) -> tuple[datetime, str, bool] | None:
    """Return the latest reached automatic event with its occurrence."""

    local_now = _local_now(now)
    zone = local_now.tzinfo
    assert zone is not None
    events: list[tuple[datetime, int, int, str, bool]] = []
    for event_date, event_time, tie_breaker, index, marker, enabled in _auto_rule_events(
        assignment, local_now.date(), holiday_region=holiday_region
    ):
        occurrence = _at_local(event_date, event_time, zone)
        if occurrence > local_now:
            continue
        events.append((occurrence, tie_breaker, index, marker, enabled))
    for index, rule in enumerate(assignment.get("auto_rules", [])):
        if not isinstance(rule, dict) or rule.get("kind") != "cycle":
            continue
        for action, action_config in _auto_rule_actions(rule):
            enabled = action == "on"
            tie_breaker = 0 if enabled else 1
            for occurrence in _cycle_occurrences(rule, action_config, local_now, future_only=False):
                marker = f"auto_rule:{rule.get('id', index)}:{action}:{occurrence.isoformat()}"
                events.append((occurrence, tie_breaker, index + 1, marker, enabled))
    if not events:
        return None
    occurrence, _tie_breaker, _index, marker, enabled = max(events)
    return occurrence, marker, enabled


def latest_auto_event(
    assignment: dict,
    now: datetime,
    *,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
) -> tuple[str, bool] | None:
    """Return the latest reached date, holiday, or cyclic rule event."""

    details = _latest_auto_event_details(assignment, now, holiday_region=holiday_region)
    if details is None:
        return None
    _occurrence, marker, enabled = details
    return marker, enabled


def _next_auto_events(
    assignment: dict,
    now: datetime,
    *,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
) -> list[tuple[datetime, int, int, str, bool]]:
    """Return the next occurrence(s) for an assignment's automatic rules."""

    local_now = _local_now(now)
    zone = local_now.tzinfo
    assert zone is not None
    events: list[tuple[datetime, int, int, str, bool]] = []
    for event_date, event_time, tie_breaker, index, marker, enabled in _auto_rule_events(
        assignment,
        local_now.date(),
        future_only=True,
        holiday_region=holiday_region,
    ):
        occurrence = _at_local(event_date, event_time, zone)
        if occurrence <= local_now:
            continue
        events.append((occurrence, tie_breaker, index, marker, enabled))
    for index, rule in enumerate(assignment.get("auto_rules", [])):
        if not isinstance(rule, dict) or rule.get("kind") != "cycle":
            continue
        for action, action_config in _auto_rule_actions(rule):
            enabled = action == "on"
            tie_breaker = 0 if enabled else 1
            for occurrence in _cycle_occurrences(rule, action_config, local_now, future_only=True):
                marker = f"auto_rule:{rule.get('id', index)}:{action}:{occurrence.isoformat()}"
                events.append((occurrence, tie_breaker, index + 1, marker, enabled))
    return events


def next_auto_date(
    schedule: dict,
    now: datetime,
    *,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
) -> datetime | None:
    """Return the next future automatic enable/disable occurrence."""

    upcoming: list[datetime] = []
    for assignment in schedule["assignments"]:
        upcoming.extend(
            event[0] for event in _next_auto_events(assignment, now, holiday_region=holiday_region)
        )
    return min(upcoming) if upcoming else None


def _candidates(
    schedule: dict,
    modes: list[dict],
    now: datetime,
    *,
    days: int,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
    respect_schedule_enabled: bool = True,
    respect_assignment_enabled: bool = True,
) -> list[tuple]:
    local_now = _local_now(now)
    zone = local_now.tzinfo
    assert zone is not None
    mode_by_id = _mode_map(modes)
    mode_order = {mode["id"]: index for index, mode in enumerate(modes)}
    candidates: list[tuple] = []
    for assignment_index, assignment in enumerate(schedule["assignments"]):
        # An automatic rule makes the assignment a dated/temporary override.
        # Its weekly phase must have started on the current local day before
        # it may win by priority.  Without this guard, a newly auto-enabled
        # assignment could inherit last week's phase and override the current
        # mode before today's configured start time.  A phase at 00:00 is the
        # explicit opt-in for an immediate effect after Auto on.
        day_offsets = (0,) if assignment.get("auto_rules") else range(days + 1)
        if respect_assignment_enabled and not assignment["enabled"]:
            continue
        mode = mode_by_id.get(assignment["mode_id"])
        if mode is None:
            continue
        continuous = assignment.get("continuous") is True or any(
            rule.get("continuous") is True
            for rule in assignment.get("auto_rules", [])
            if isinstance(rule, dict)
        )
        if continuous:
            details = _latest_auto_event_details(
                assignment, local_now, holiday_region=holiday_region
            )
            has_auto_on = any(
                action == "on"
                for rule in assignment.get("auto_rules", [])
                if isinstance(rule, dict)
                for action, _config in _auto_rule_actions(rule)
            )
            if details is None and has_auto_on:
                continue
            if details is not None and not details[2]:
                continue
            occurrence = (
                details[0] if details is not None else _at_local(local_now.date(), "00:00", zone)
            )
            phase = {
                "id": details[1] if details is not None else f"continuous:{assignment['id']}",
                "time": occurrence.strftime("%H:%M"),
            }
            candidates.append(
                (
                    occurrence,
                    assignment_index,
                    -1,
                    mode_order.get(mode["id"], -1),
                    mode,
                    assignment,
                    phase,
                )
            )
            continue
        for days_ago in day_offsets:
            day = local_now.date() - timedelta(days=days_ago)
            weekday = WEEKDAYS[day.weekday()]
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


def latest_assignment_phase(assignment: dict, now: datetime) -> tuple[datetime, dict | str] | None:
    """Return the latest phase of one assignment that has already started."""

    local_now = _local_now(now)
    zone = local_now.tzinfo
    assert zone is not None
    latest: tuple[datetime, dict | str] | None = None
    for days_ago in range(8):
        day = local_now.date() - timedelta(days=days_ago)
        weekday = WEEKDAYS[day.weekday()]
        for phase in assignment["weekday_rules"].get(weekday, []):
            occurrence = _at_local(day, _phase_time(phase), zone)
            if occurrence <= local_now and (latest is None or occurrence > latest[0]):
                latest = (occurrence, phase)
    return latest


def select_active_mode(
    schedule: dict,
    modes: list[dict],
    now: datetime,
    *,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
    respect_schedule_enabled: bool = True,
    respect_assignment_enabled: bool = True,
) -> ActiveMatch | None:
    """Select the matching mode while applying automatic-rule day boundaries.

    Higher mode priority wins first. Equal priorities use the latest matching
    activation, then configured assignment and mode order as deterministic
    tie-breakers. Assignments with automatic rules only use phases already
    reached on the current local day; a 00:00 phase makes them available
    immediately after an automatic enable event. A higher-priority assignment
    whose first phase today is still in the future cannot win early through a
    carry-over from the previous day.
    """

    if respect_schedule_enabled and not schedule["enabled"]:
        return None
    candidates = _candidates(
        schedule,
        modes,
        now,
        days=7,
        holiday_region=holiday_region,
        respect_schedule_enabled=respect_schedule_enabled,
        respect_assignment_enabled=respect_assignment_enabled,
    )
    if not candidates:
        return None
    local_now = _local_now(now)
    local_minutes = local_now.hour * 60 + local_now.minute + local_now.second / 60
    weekday = WEEKDAYS[local_now.weekday()]
    mode_by_id = _mode_map(modes)
    first_phase_today = {
        assignment["id"]: (
            min(
                int(_phase_time(phase)[:2]) * 60 + int(_phase_time(phase)[3:])
                for phase in assignment["weekday_rules"].get(weekday, [])
            ),
            mode_by_id.get(assignment["mode_id"], {}).get("priority", 0),
        )
        for assignment in schedule["assignments"]
        if assignment["weekday_rules"].get(weekday)
    }
    future_assignments = {
        assignment_id
        for assignment_id, (first_start, priority) in first_phase_today.items()
        if first_start > local_minutes and priority > 0
    }
    if future_assignments:

        def is_carryover(item: tuple) -> bool:
            return item[0].date() < local_now.date() and item[5]["id"] in future_assignments

        fallback_candidates = [item for item in candidates if not is_carryover(item)]
        if not fallback_candidates:
            return None
        fallback_priority = min(item[4].get("priority", 0) for item in fallback_candidates)
        candidates = [
            item
            for item in candidates
            if not (is_carryover(item) and item[4].get("priority", 0) > fallback_priority)
        ]
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


def next_activation(
    schedule: dict,
    modes: list[dict],
    now: datetime,
    *,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
) -> datetime | None:
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
            continuous = assignment.get("continuous") is True or any(
                rule.get("continuous") is True
                for rule in assignment.get("auto_rules", [])
                if isinstance(rule, dict)
            )
            if mode is None or (not continuous and not assignment["enabled"]):
                continue
            if not continuous:
                for phase in assignment["weekday_rules"].get(weekday, []):
                    time_text = _phase_time(phase)
                    occurrence = _at_local(day, time_text, zone)
                    if occurrence > local_now:
                        occurrences.append(occurrence)
            if offset == 0 and continuous:
                occurrences.extend(
                    event[0]
                    for event in _next_auto_events(
                        assignment, local_now, holiday_region=holiday_region
                    )
                )
    return min(occurrences) if occurrences else None


def _continuous_auto_segments(
    assignment: dict,
    day: date,
    zone: tzinfo,
    *,
    holiday_region: str,
) -> list[dict]:
    """Return one day's segments for an assignment with continuous auto mode."""

    day_start = _at_local(day, "00:00", zone)
    day_end = day_start + timedelta(days=1)
    details = _latest_auto_event_details(assignment, day_start, holiday_region=holiday_region)
    has_auto_on = any(
        action == "on"
        for rule in assignment.get("auto_rules", [])
        if isinstance(rule, dict)
        for action, _config in _auto_rule_actions(rule)
    )
    active = details[2] if details is not None else not has_auto_on and assignment["enabled"]
    events = sorted(
        event
        for event in _next_auto_events(
            assignment, day_start - timedelta(seconds=1), holiday_region=holiday_region
        )
        if day_start <= event[0] < day_end
    )
    segments: list[dict] = []
    cursor = 0
    for occurrence, _tie_breaker, _index, _marker, enabled in events:
        minute = max(0, min(1440, int((occurrence - day_start).total_seconds() // 60)))
        if enabled and not active:
            active = True
            cursor = minute
        elif not enabled and active:
            if minute > cursor:
                segments.append({"start": cursor, "end": minute})
            active = False
            cursor = minute
    if active and cursor < 1440:
        segments.append({"start": cursor, "end": 1440})
    return segments


def _priority_week_segments(
    schedule: dict,
    assignments: list[dict],
    modes: list[dict],
    day: date,
    zone: tzinfo,
    *,
    holiday_region: str,
) -> list[dict]:
    """Resolve one priority lane into sequential segments for one day."""

    mode_by_id = _mode_map(modes)
    points: set[int] = set()
    for assignment in assignments:
        mode = mode_by_id.get(assignment["mode_id"])
        continuous = assignment.get("continuous") is True or any(
            rule.get("continuous") is True
            for rule in assignment.get("auto_rules", [])
            if isinstance(rule, dict)
        )
        if mode is None or not assignment["enabled"]:
            continue
        if continuous:
            auto_segments = _continuous_auto_segments(
                assignment, day, zone, holiday_region=holiday_region
            )
            points.update(
                boundary
                for segment in auto_segments
                for boundary in (segment["start"], segment["end"])
                if boundary < 1440
            )
        else:
            points.update(
                int(_phase_time(phase)[:2]) * 60 + int(_phase_time(phase)[3:])
                for phase in assignment["weekday_rules"].get(WEEKDAYS[day.weekday()], [])
            )

    lane_schedule = {**schedule, "assignments": assignments}
    day_start = _at_local(day, "00:00", zone)
    segments: list[dict] = []

    def append_segment(start: int, end: int) -> None:
        if end <= start:
            return
        match = select_active_mode(
            lane_schedule,
            modes,
            day_start + timedelta(minutes=start),
            holiday_region=holiday_region,
            respect_schedule_enabled=False,
        )
        if not match:
            return
        mode = match.mode
        segments.append(
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
    for point in sorted(points):
        append_segment(cursor, point)
        cursor = point
    append_segment(cursor, 1440)
    return segments


def week_view(
    schedule: dict,
    modes: list[dict],
    now: datetime,
    *,
    holiday_region: str = DEFAULT_HOLIDAY_REGION,
) -> dict:
    """Build display segments for Monday through Sunday in the HA time zone.

    A final phase without a following boundary extends to the fixed day end.
    The returned per-assignment tracks use only the phases of each displayed
    day. ``priority_tracks`` additionally resolves assignments with the same
    priority into one sequential lane while keeping each priority level in its
    own lane. Continuous automatic assignments instead use their automatic
    event period. Actual climate changes remain driven by configured
    activation start times.
    """

    local_now = _local_now(now)
    zone = local_now.tzinfo
    assert zone is not None
    days: list[dict] = []
    for weekday_index, weekday in enumerate(WEEKDAYS):
        day = local_now.date() - timedelta(days=local_now.weekday()) + timedelta(days=weekday_index)
        day_start = _at_local(day, "00:00", zone)
        mode_by_id = _mode_map(modes)
        tracks: list[dict] = []
        for assignment in schedule["assignments"]:
            mode = mode_by_id.get(assignment["mode_id"])
            phases = sorted(
                assignment["weekday_rules"].get(weekday, []),
                key=_phase_time,
            )
            continuous = assignment.get("continuous") is True or any(
                rule.get("continuous") is True
                for rule in assignment.get("auto_rules", [])
                if isinstance(rule, dict)
            )
            if mode is None or not assignment["enabled"]:
                continue
            auto_segments = (
                _continuous_auto_segments(assignment, day, zone, holiday_region=holiday_region)
                if continuous
                else []
            )
            if continuous and not auto_segments:
                continue
            if not continuous and not phases:
                continue
            track_segments = []
            phase_segments = (
                [(segment["start"], segment["end"], None) for segment in auto_segments]
                if continuous
                else [
                    (
                        int(_phase_time(phase)[:2]) * 60 + int(_phase_time(phase)[3:]),
                        (
                            int(_phase_time(phases[phase_index + 1])[:2]) * 60
                            + int(_phase_time(phases[phase_index + 1])[3:])
                            if phase_index + 1 < len(phases)
                            else 1440
                        ),
                        phase,
                    )
                    for phase_index, phase in enumerate(phases)
                ]
            )
            for start, end, phase in phase_segments:
                track_segments.append(
                    {
                        "start": start,
                        "end": end,
                        "mode_id": mode["id"],
                        "mode_name": mode["name"],
                        "target_temperature": (
                            phase.get("target_temperature", mode["target_temperature"])
                            if isinstance(phase, dict)
                            else mode["target_temperature"]
                        ),
                        "color": mode.get("color"),
                        "icon": mode.get("icon"),
                        "phase_id": phase.get("id") if isinstance(phase, dict) else None,
                        "assignment_id": assignment["id"],
                    }
                )
            tracks.append(
                {
                    "assignment_id": assignment["id"],
                    "mode_id": mode["id"],
                    "mode_name": mode["name"],
                    "color": mode.get("color"),
                    "icon": mode.get("icon"),
                    "segments": track_segments,
                }
            )
        priority_groups: dict[int, list[dict]] = {}
        for assignment in schedule["assignments"]:
            mode = mode_by_id.get(assignment["mode_id"])
            if mode is None or not assignment["enabled"]:
                continue
            priority = int(mode.get("priority", 0))
            priority_groups.setdefault(priority, []).append(assignment)
        priority_tracks: list[dict] = []
        for priority, priority_assignments in sorted(priority_groups.items()):
            priority_segments = _priority_week_segments(
                schedule,
                priority_assignments,
                modes,
                day,
                zone,
                holiday_region=holiday_region,
            )
            if priority_segments:
                priority_tracks.append(
                    {
                        "priority": priority,
                        "segments": priority_segments,
                    }
                )
        points = sorted(
            {
                int(_phase_time(phase)[:2]) * 60 + int(_phase_time(phase)[3:])
                for assignment in schedule["assignments"]
                if assignment["enabled"] and mode_by_id.get(assignment["mode_id"]) is not None
                for phase in assignment["weekday_rules"].get(weekday, [])
            }
            | {
                boundary
                for assignment in schedule["assignments"]
                if mode_by_id.get(assignment["mode_id"]) is not None
                and (
                    assignment.get("continuous") is True
                    or any(
                        rule.get("continuous") is True
                        for rule in assignment.get("auto_rules", [])
                        if isinstance(rule, dict)
                    )
                )
                for segment in _continuous_auto_segments(
                    assignment, day, zone, holiday_region=holiday_region
                )
                for boundary in (segment["start"], segment["end"])
                if boundary < 1440
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
                holiday_region=holiday_region,
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
        days.append(
            {
                "weekday": weekday,
                "segments": segments,
                "tracks": tracks,
                "priority_tracks": priority_tracks,
            }
        )
    current_minute = None
    if schedule["enabled"]:
        current_minute = local_now.hour * 60 + local_now.minute + local_now.second / 60
    return {
        "schedule_id": schedule["id"],
        "days": days,
        "current_weekday": WEEKDAYS[local_now.weekday()],
        "current_minute": current_minute,
    }
