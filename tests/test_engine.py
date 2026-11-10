from datetime import date, datetime
from zoneinfo import ZoneInfo

from custom_components.climate_planner.engine import (
    latest_auto_date_event,
    next_activation,
    next_auto_date,
    select_active_mode,
    week_view,
)

ZONE = ZoneInfo("Europe/Berlin")


def mode(mode_id, name, temperature, *, priority=0):
    return {
        "id": mode_id,
        "name": name,
        "target_temperature": temperature,
        "priority": priority,
    }


def assignment(assignment_id, mode_id, **rules):
    return {
        "id": assignment_id,
        "mode_id": mode_id,
        "enabled": True,
        "weekday_rules": rules,
    }


def schedule(assignments):
    return {
        "id": "schedule_1",
        "name": "Living",
        "climate_entity_id": "climate.living",
        "enabled": True,
        "assignments": assignments,
    }


def test_latest_matching_mode_and_weekday_wrap():
    modes = [mode("night", "Night", 18), mode("comfort", "Comfort", 21)]
    value = schedule(
        [
            assignment("night-rule", "night", sunday=["22:00"], monday=["22:00"]),
            assignment("comfort-rule", "comfort", monday=["06:30"]),
        ]
    )
    match = select_active_mode(value, modes, datetime(2026, 11, 9, 5, 30, tzinfo=ZONE))
    assert match is not None and match.mode["id"] == "night"
    match = select_active_mode(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE))
    assert match is not None and match.mode["id"] == "comfort"


def test_same_activation_time_uses_later_assignment_deterministically():
    modes = [mode("first", "First", 19), mode("second", "Second", 20)]
    value = schedule(
        [
            assignment("first-rule", "first", monday=["06:30"]),
            assignment("second-rule", "second", monday=["06:30"]),
        ]
    )
    match = select_active_mode(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE))
    assert match is not None and match.mode["id"] == "second"


def test_higher_priority_wins_over_a_more_recent_lower_priority_rule():
    modes = [mode("low", "Low", 18), mode("high", "High", 22, priority=5)]
    value = schedule(
        [
            assignment("high-rule", "high", monday=["06:00"]),
            assignment("low-rule", "low", monday=["18:00"]),
        ]
    )
    match = select_active_mode(value, modes, datetime(2026, 11, 9, 20, 0, tzinfo=ZONE))
    assert match is not None and match.mode["id"] == "high"


def test_disabled_mode_is_not_selected():
    modes = [mode("off", "Off", 16), mode("low", "Low", 18)]
    value = schedule(
        [
            {**assignment("off-rule", "off", monday=["00:00"]), "enabled": False},
            assignment("low-rule", "low", monday=["06:00"]),
        ]
    )
    match = select_active_mode(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE))
    assert match is not None and match.mode["id"] == "low"


def test_next_activation_is_targeted():
    modes = [mode("comfort", "Comfort", 21)]
    value = schedule([assignment("rule", "comfort", tuesday=["07:15"])])
    now = datetime(2026, 11, 9, 7, 0, tzinfo=ZONE)
    assert next_activation(value, modes, now).isoformat() == "2026-11-10T07:15:00+01:00"


def test_individual_weekday_times_are_evaluated_independently():
    modes = [mode("comfort", "Comfort", 21)]
    value = schedule([assignment("rule", "comfort", monday=["06:30"], tuesday=["07:00"])])
    monday = datetime(2026, 11, 9, 6, 45, tzinfo=ZONE)
    tuesday = datetime(2026, 11, 10, 7, 15, tzinfo=ZONE)
    assert select_active_mode(value, modes, monday).mode["id"] == "comfort"
    assert select_active_mode(value, modes, tuesday).mode["id"] == "comfort"
    assert next_activation(value, modes, monday).isoformat() == "2026-11-10T07:00:00+01:00"


def test_disabled_schedule_has_no_active_mode():
    modes = [mode("comfort", "Comfort", 21)]
    value = {
        **schedule([assignment("rule", "comfort", monday=["06:00"])]),
        "enabled": False,
    }
    assert select_active_mode(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE)) is None


def test_disabled_schedule_remains_visible_in_week_view():
    modes = [mode("comfort", "Comfort", 21)]
    value = {
        **schedule([assignment("rule", "comfort", monday=["06:00"])]),
        "enabled": False,
    }

    view = week_view(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE))
    monday = next(day for day in view["days"] if day["weekday"] == "monday")

    assert [(segment["start"], segment["end"]) for segment in monday["segments"]] == [
        (0, 360),
        (360, 1440),
    ]
    assert all(segment["mode_id"] == "comfort" for segment in monday["segments"])
    assert view["current_minute"] is None


def test_week_view_contains_mode_segments_and_current_marker():
    modes = [mode("night", "Night", 18), mode("comfort", "Comfort", 21)]
    value = schedule(
        [
            assignment("night-rule", "night", monday=["00:00"], tuesday=["00:00"]),
            assignment("comfort-rule", "comfort", monday=["06:30"]),
        ]
    )
    view = week_view(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE))
    monday = next(day for day in view["days"] if day["weekday"] == "monday")
    assert [segment["mode_id"] for segment in monday["segments"]] == [
        "night",
        "comfort",
    ]
    assert view["current_weekday"] == "monday"
    assert view["current_minute"] == 420


def test_week_view_keeps_last_phase_until_day_end():
    modes = [mode("comfort", "Comfort", 21)]
    value = schedule([assignment("rule", "comfort", monday=["09:00"])])
    view = week_view(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE))
    monday = next(day for day in view["days"] if day["weekday"] == "monday")
    assert monday["segments"][-1]["start"] == 540
    assert monday["segments"][-1]["end"] == 1440


def test_auto_date_event_uses_latest_date_without_order_validation():
    value = {
        "auto_on_date": "2026-11-20",
        "auto_off_date": "2026-11-10",
    }

    assert latest_auto_date_event(value, date(2026, 11, 15)) == (
        "auto_off_date:2026-11-10",
        False,
    )
    assert latest_auto_date_event(value, date(2026, 11, 21)) == (
        "auto_on_date:2026-11-20",
        True,
    )


def test_next_auto_date_is_scheduled_at_local_midnight():
    value = schedule([assignment("rule", "comfort", monday=["06:00"])])
    value["assignments"][0]["auto_on_date"] = "2026-11-10"

    assert next_auto_date(value, datetime(2026, 11, 9, 12, tzinfo=ZONE)) == datetime(
        2026, 11, 10, tzinfo=ZONE
    )
