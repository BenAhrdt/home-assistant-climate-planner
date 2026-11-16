from datetime import date, datetime
from zoneinfo import ZoneInfo

import pytest

from custom_components.climate_planner.engine import (
    available_holiday_ids,
    latest_auto_date_event,
    latest_auto_event,
    next_activation,
    next_auto_date,
    select_active_mode,
    week_view,
)


def test_holiday_region_filters_state_specific_holidays():
    nationwide = set(available_holiday_ids("national"))
    saxony = set(available_holiday_ids("sn"))
    brandenburg = set(available_holiday_ids("bb"))

    assert "new_year" in nationwide
    assert "epiphany" not in nationwide
    assert "reformation_day" not in nationwide
    assert "reformation_day" in saxony
    assert "repentance_day" in saxony
    assert "easter_saturday" in nationwide
    assert "easter_sunday" in nationwide
    assert "easter_sunday" in brandenburg
    assert "easter_sunday" in saxony


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


def test_week_view_resolves_same_priority_modes_into_one_day_sequence():
    modes = [mode("play", "Play", 21.5), mode("sleep", "Sleep", 20)]
    value = schedule(
        [
            assignment("play-rule", "play", monday=["23:59"], tuesday=["23:59"]),
            assignment("sleep-rule", "sleep", monday=["18:00"], tuesday=["18:00"]),
        ]
    )

    monday = next(
        day
        for day in week_view(value, modes, datetime(2026, 11, 9, 12, tzinfo=ZONE))["days"]
        if day["weekday"] == "monday"
    )

    assert [(segment["start"], segment["end"], segment["mode_id"]) for segment in monday["segments"]] == [
        (0, 1080, "play"),
        (1080, 1439, "sleep"),
        (1439, 1440, "play"),
    ]
    assert len(monday["priority_tracks"]) == 1
    assert [(segment["start"], segment["end"], segment["mode_id"]) for segment in monday["priority_tracks"][0]["segments"]] == [
        (0, 1080, "play"),
        (1080, 1439, "sleep"),
        (1439, 1440, "play"),
    ]


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


def test_higher_priority_mode_does_not_carry_into_day_before_first_phase():
    modes = [mode("base", "Base", 20), mode("off", "Off", 18.5, priority=100)]
    value = schedule(
        [
            assignment("base-rule", "base", sunday=["18:00"], monday=["05:00"]),
            assignment("off-rule", "off", sunday=["01:00"], monday=["01:00"]),
        ]
    )

    before_phase = select_active_mode(value, modes, datetime(2026, 11, 9, 0, 30, tzinfo=ZONE))
    assert before_phase is not None and before_phase.mode["id"] == "base"
    at_phase = select_active_mode(value, modes, datetime(2026, 11, 9, 1, 0, tzinfo=ZONE))
    assert at_phase is not None and at_phase.mode["id"] == "off"


def test_mode_with_future_first_phase_is_not_active_without_fallback():
    modes = [mode("off", "Off", 18.5, priority=100)]
    value = schedule([assignment("off-rule", "off", sunday=["01:00"], monday=["01:00"])])

    assert select_active_mode(value, modes, datetime(2026, 11, 9, 0, 30, tzinfo=ZONE)) is None
    assert select_active_mode(value, modes, datetime(2026, 11, 9, 1, 0, tzinfo=ZONE)) is not None


def test_auto_rule_priority_waits_for_current_day_phase():
    modes = [mode("normal", "Normal", 21), mode("birthday", "Birthday", 22, priority=10)]
    value = schedule(
        [
            assignment("normal-rule", "normal", monday=["00:00"]),
            {
                **assignment("birthday-rule", "birthday", monday=["07:00"], tuesday=["05:00"]),
                "auto_rules": [
                    {
                        "id": "birthday-on",
                        "action": "on",
                        "kind": "date",
                        "date": "2026-11-09",
                    }
                ],
            },
        ]
    )

    before_phase = select_active_mode(value, modes, datetime(2026, 11, 9, 6, 30, tzinfo=ZONE))
    assert before_phase is not None and before_phase.mode["id"] == "normal"
    at_phase = select_active_mode(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE))
    assert at_phase is not None and at_phase.mode["id"] == "birthday"
    before_tuesday_phase = select_active_mode(
        value, modes, datetime(2026, 11, 10, 4, 30, tzinfo=ZONE)
    )
    assert before_tuesday_phase is not None and before_tuesday_phase.mode["id"] == "normal"
    at_tuesday_phase = select_active_mode(value, modes, datetime(2026, 11, 10, 5, 0, tzinfo=ZONE))
    assert at_tuesday_phase is not None and at_tuesday_phase.mode["id"] == "birthday"


def test_auto_rule_priority_can_start_immediately_at_midnight():
    modes = [mode("normal", "Normal", 21), mode("birthday", "Birthday", 22, priority=10)]
    value = schedule(
        [
            assignment("normal-rule", "normal", monday=["00:00"]),
            {
                **assignment("birthday-rule", "birthday", monday=["00:00"]),
                "auto_rules": [
                    {"id": "birthday-on", "action": "on", "kind": "date", "date": "2026-11-09"}
                ],
            },
        ]
    )

    match = select_active_mode(value, modes, datetime(2026, 11, 9, 6, 30, tzinfo=ZONE))
    assert match is not None and match.mode["id"] == "birthday"


def test_continuous_auto_rule_uses_auto_period_without_weekday_phases():
    modes = [mode("holiday", "Holiday", 22)]
    value = schedule(
        [
            {
                **assignment("holiday-rule", "holiday"),
                "continuous": True,
                "weekday_rules": {},
                "auto_rules": [
                    {
                        "id": "holiday-period",
                        "name": "Holiday period",
                        "kind": "date",
                        "date": "2026-11-09",
                        "actions": {
                            "on": {"time": "09:00"},
                            "off": {"time": "22:00"},
                        },
                    }
                ],
            }
        ]
    )

    assert select_active_mode(value, modes, datetime(2026, 11, 9, 8, 59, tzinfo=ZONE)) is None
    assert select_active_mode(value, modes, datetime(2026, 11, 9, 9, 0, tzinfo=ZONE)) is not None
    assert select_active_mode(value, modes, datetime(2026, 11, 9, 21, 59, tzinfo=ZONE)) is not None
    assert select_active_mode(value, modes, datetime(2026, 11, 9, 22, 0, tzinfo=ZONE)) is None

    view = week_view(value, modes, datetime(2026, 11, 9, 7, tzinfo=ZONE))
    monday = next(day for day in view["days"] if day["weekday"] == "monday")
    assert [(segment["start"], segment["end"]) for segment in monday["tracks"][0]["segments"]] == [
        (540, 1320)
    ]
    assert [(segment["start"], segment["end"]) for segment in monday["priority_tracks"][0]["segments"]] == [
        (540, 1320)
    ]


def test_week_view_shows_future_continuous_auto_period_while_assignment_is_paused():
    modes = [mode("holiday", "Holiday", 22)]
    value = schedule(
        [
            {
                **assignment("holiday-rule", "holiday"),
                "enabled": False,
                "weekday_rules": {},
                "auto_rules": [
                    {
                        "id": "holiday-period",
                        "kind": "date",
                        "date": "2026-11-10",
                        "continuous": True,
                        "actions": {"on": {"time": "09:00"}, "off": {"time": "22:00"}},
                    }
                ],
            }
        ]
    )

    view = week_view(value, modes, datetime(2026, 11, 9, 7, tzinfo=ZONE))
    tuesday = next(day for day in view["days"] if day["weekday"] == "tuesday")

    assert [(segment["start"], segment["end"]) for segment in tuesday["tracks"][0]["segments"]] == [
        (540, 1320)
    ]


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


def test_week_view_keeps_parallel_assignments_in_separate_tracks():
    modes = [mode("base", "Base", 20), mode("off", "Off", 18.5, priority=100)]
    value = schedule(
        [
            assignment("base-rule", "base", monday=["05:00", "18:00"]),
            assignment("off-rule", "off", monday=["01:00"]),
        ]
    )

    view = week_view(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE))
    monday = next(day for day in view["days"] if day["weekday"] == "monday")

    assert [track["assignment_id"] for track in monday["tracks"]] == [
        "base-rule",
        "off-rule",
    ]
    assert [(segment["start"], segment["end"]) for segment in monday["tracks"][1]["segments"]] == [
        (60, 1440)
    ]
    assert [lane["priority"] for lane in monday["priority_tracks"]] == [0, 100]
    assert [(segment["start"], segment["end"], segment["mode_id"]) for segment in monday["priority_tracks"][1]["segments"]] == [
        (60, 1440, "off")
    ]


def test_week_view_keeps_last_phase_until_day_end():
    modes = [mode("comfort", "Comfort", 21)]
    value = schedule([assignment("rule", "comfort", monday=["09:00"])])
    view = week_view(value, modes, datetime(2026, 11, 9, 7, 0, tzinfo=ZONE))
    monday = next(day for day in view["days"] if day["weekday"] == "monday")
    assert monday["segments"][-1]["start"] == 540
    assert monday["segments"][-1]["end"] == 1440


def test_auto_date_event_uses_latest_date():
    value = {
        "auto_rules": [
            {"id": "on", "action": "on", "kind": "date", "date": "2026-11-20"},
            {"id": "off", "action": "off", "kind": "date", "date": "2026-11-10"},
        ]
    }

    assert latest_auto_date_event(value, date(2026, 11, 15)) == (
        "auto_rule:off:off:2026-11-10",
        False,
    )
    assert latest_auto_date_event(value, date(2026, 11, 21)) == (
        "auto_rule:on:on:2026-11-20",
        True,
    )


def test_next_auto_date_is_scheduled_at_local_midnight():
    value = schedule([assignment("rule", "comfort", monday=["06:00"])])
    value["assignments"][0]["auto_rules"] = [
        {"id": "on", "action": "on", "kind": "date", "date": "2026-11-10"}
    ]

    assert next_auto_date(value, datetime(2026, 11, 9, 12, tzinfo=ZONE)) == datetime(
        2026, 11, 10, tzinfo=ZONE
    )


def test_grouped_holiday_rule_uses_action_times():
    value = {
        "auto_rules": [
            {
                "id": "easter-monday",
                "kind": "holiday",
                "holiday": "easter_monday",
                "actions": {"on": {"time": "09:00"}, "off": {"time": "21:00"}},
            }
        ]
    }

    assert latest_auto_event(value, datetime(2026, 4, 6, 12, tzinfo=ZONE)) == (
        "auto_rule:easter-monday:on:2026-04-06",
        True,
    )
    configured = assignment("rule", "comfort", monday=["06:00"])
    configured["auto_rules"] = value["auto_rules"]
    assert next_auto_date(
        schedule([configured]), datetime(2026, 4, 5, 12, tzinfo=ZONE)
    ) == datetime(2026, 4, 6, 9, tzinfo=ZONE)


def test_grouped_cycle_rule_uses_independent_action_dates_and_times():
    configured = assignment("rule", "comfort", monday=["06:00"])
    configured["auto_rules"] = [
        {
            "id": "wednesday",
            "kind": "cycle",
            "recurrence": "weekly",
            "actions": {
                "on": {
                    "start_date": "2027-01-01",
                    "end_date": "2027-02-01",
                    "time": "09:00",
                },
                "off": {"start_date": "2027-01-01", "time": "22:00"},
            },
        }
    ]

    assert next_auto_date(
        schedule([configured]), datetime(2026, 12, 31, 12, tzinfo=ZONE)
    ) == datetime(2027, 1, 1, 9, tzinfo=ZONE)


def test_repeated_one_time_date_is_not_limited_to_the_next_year():
    rule = {"id": "future", "action": "on", "kind": "date", "date": "2030-06-01"}
    configured = assignment("rule", "comfort", monday=["06:00"])
    configured["auto_rules"] = [rule]

    assert next_auto_date(
        schedule([configured]), datetime(2026, 11, 15, 12, tzinfo=ZONE)
    ) == datetime(2030, 6, 1, tzinfo=ZONE)


def test_all_advent_holiday_has_four_occurrences():
    value = {
        "auto_rules": [
            {"id": "advent", "action": "off", "kind": "holiday", "holiday": "all_advent"}
        ]
    }

    assert latest_auto_event(value, datetime(2026, 12, 1, 12, tzinfo=ZONE)) == (
        "auto_rule:advent:off:2026-11-29",
        False,
    )
    configured = assignment("rule", "comfort", monday=["06:00"])
    configured["auto_rules"] = value["auto_rules"]
    assert next_auto_date(
        schedule([configured]), datetime(2026, 12, 1, 12, tzinfo=ZONE)
    ) == datetime(2026, 12, 6, tzinfo=ZONE)


def test_easter_and_christmas_period_are_holiday_occurrences():
    easter = {
        "auto_rules": [
            {"id": "easter", "action": "on", "kind": "holiday", "holiday": "easter_sunday"}
        ]
    }
    easter_period = {
        "auto_rules": [
            {"id": "easter-period", "action": "on", "kind": "holiday", "holiday": "easter_period"}
        ]
    }
    christmas = {
        "auto_rules": [
            {"id": "christmas", "action": "off", "kind": "holiday", "holiday": "christmas_period"}
        ]
    }

    assert latest_auto_date_event(easter, date(2026, 4, 6), holiday_region="all") == (
        "auto_rule:easter:on:2026-04-05",
        True,
    )
    assert latest_auto_date_event(easter_period, date(2026, 4, 6), holiday_region="all") == (
        "auto_rule:easter-period:on:2026-04-06",
        True,
    )
    configured = assignment("rule", "comfort", monday=["06:00"])
    configured["auto_rules"] = christmas["auto_rules"]
    assert next_auto_date(
        schedule([configured]), datetime(2026, 12, 23, 12, tzinfo=ZONE)
    ) == datetime(2026, 12, 24, tzinfo=ZONE)


def test_hourly_cycle_uses_the_configured_start_time():
    value = {
        "auto_rules": [
            {
                "id": "hourly",
                "action": "on",
                "kind": "cycle",
                "recurrence": "hourly",
                "start_date": "2026-11-15",
                "start_time": "08:00",
            }
        ]
    }
    configured = assignment("rule", "comfort", monday=["06:00"])
    configured["auto_rules"] = value["auto_rules"]

    assert latest_auto_event(configured, datetime(2026, 11, 15, 10, 30, tzinfo=ZONE)) == (
        "auto_rule:hourly:on:2026-11-15T10:00:00+01:00",
        True,
    )
    assert next_auto_date(
        schedule([configured]), datetime(2026, 11, 15, 10, 30, tzinfo=ZONE)
    ) == datetime(2026, 11, 15, 11, tzinfo=ZONE)


def test_cycle_end_date_limits_past_and_future_occurrences():
    configured = assignment("rule", "comfort", monday=["06:00"])
    configured["auto_rules"] = [
        {
            "id": "limited",
            "action": "on",
            "kind": "cycle",
            "recurrence": "daily",
            "start_date": "2026-11-15",
            "start_time": "08:00",
            "end_date": "2026-11-17",
        }
    ]

    assert latest_auto_event(configured, datetime(2026, 11, 17, 10, tzinfo=ZONE))[0].endswith(
        "2026-11-17T08:00:00+01:00"
    )
    assert (
        next_auto_date(schedule([configured]), datetime(2026, 11, 17, 10, 30, tzinfo=ZONE)) is None
    )


def test_cycle_without_start_date_uses_current_local_day_as_anchor():
    configured = assignment("rule", "comfort", monday=["06:00"])
    configured["auto_rules"] = [
        {
            "id": "no-start",
            "action": "on",
            "kind": "cycle",
            "recurrence": "daily",
            "start_time": "09:00",
        }
    ]

    assert latest_auto_event(configured, datetime(2026, 11, 15, 10, tzinfo=ZONE))[0].endswith(
        "2026-11-15T09:00:00+01:00"
    )


@pytest.mark.parametrize(
    ("recurrence", "expected"),
    [
        ("daily", datetime(2026, 11, 16, 8, tzinfo=ZONE)),
        ("weekly", datetime(2026, 11, 22, 8, tzinfo=ZONE)),
        ("monthly", datetime(2026, 12, 15, 8, tzinfo=ZONE)),
        ("quarterly", datetime(2027, 2, 15, 8, tzinfo=ZONE)),
        ("yearly", datetime(2027, 11, 15, 8, tzinfo=ZONE)),
    ],
)
def test_cycle_intervals_schedule_the_next_anchor_occurrence(recurrence, expected):
    configured = assignment("rule", "comfort", monday=["06:00"])
    configured["auto_rules"] = [
        {
            "id": "cycle",
            "action": "off",
            "kind": "cycle",
            "recurrence": recurrence,
            "start_date": "2026-11-15",
            "start_time": "08:00",
        }
    ]

    assert (
        next_auto_date(schedule([configured]), datetime(2026, 11, 15, 10, 30, tzinfo=ZONE))
        == expected
    )
