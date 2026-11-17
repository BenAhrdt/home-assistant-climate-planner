from copy import deepcopy

import pytest

from custom_components.climate_planner.models import (
    InvalidData,
    empty_planner,
    migrate_storage,
    validate_planner,
)


def mode(mode_id="mode_home", name="Home", temperature=21.0):
    return {"id": mode_id, "name": name, "target_temperature": temperature}


def assignment(mode_id="mode_home"):
    return {
        "id": "assignment_1",
        "mode_id": mode_id,
        "enabled": True,
        "weekday_rules": {"monday": ["06:30"]},
    }


def schedule(assignments=None, climate_entity="climate.living_room"):
    return {
        "id": "schedule_living",
        "name": "Living room",
        "climate_entity_id": climate_entity,
        "enabled": True,
        "assignments": assignments if assignments is not None else [assignment()],
    }


def planner():
    return {
        "schema_version": 1,
        "revision": 0,
        "modes": [mode()],
        "schedules": [schedule()],
    }


def test_empty_planner_is_schema_valid():
    assert validate_planner(empty_planner()) == empty_planner()


def test_validation_normalizes_single_time_string_for_migration():
    value = planner()
    value["schedules"][0]["assignments"][0]["weekday_rules"]["monday"] = "06:30"
    phases = validate_planner(value)["schedules"][0]["assignments"][0]["weekday_rules"]["monday"]
    assert phases[0]["time"] == "06:30"
    assert phases[0]["id"].startswith("phase_")


def test_legacy_single_climate_entity_is_migrated_to_list():
    normalized = validate_planner(planner())
    assert normalized["schedules"][0]["climate_entity_ids"] == ["climate.living_room"]
    assert normalized["modes"][0]["priority"] == 0


def test_window_setback_temperature_is_preserved_and_legacy_label_is_removed():
    value = planner()
    value["schedules"][0].update({"window_label": "fenster", "window_open_temperature": 18.5})

    normalized = validate_planner(value)

    assert "window_label" not in normalized["schedules"][0]
    assert normalized["schedules"][0]["window_open_temperature"] == 18.5
    assert normalized["schedules"][0]["window_open_enabled"] is True
    assert validate_planner(planner())["schedules"][0]["window_open_temperature"] == 18.5


def test_window_detection_can_be_disabled_per_schedule():
    value = planner()
    value["schedules"][0]["window_open_enabled"] = False

    normalized = validate_planner(value)

    assert normalized["schedules"][0]["window_open_enabled"] is False


def test_window_open_delay_defaults_to_five_seconds_and_accepts_configured_value():
    value = planner()
    assert validate_planner(value)["schedules"][0]["window_open_delay_seconds"] == 5

    value["schedules"][0]["window_open_delay_seconds"] = 300
    assert validate_planner(value)["schedules"][0]["window_open_delay_seconds"] == 300


@pytest.mark.parametrize("legacy_delay", [0, 1, 4])
def test_window_open_delay_migrates_legacy_values_to_five_seconds(legacy_delay):
    value = planner()
    value["schedules"][0]["window_open_delay_seconds"] = legacy_delay

    assert validate_planner(value)["schedules"][0]["window_open_delay_seconds"] == 5


@pytest.mark.parametrize("invalid_delay", [-1, 1801, True, 5.0])
def test_window_open_delay_rejects_values_outside_integer_range(invalid_delay):
    value = planner()
    value["schedules"][0]["window_open_delay_seconds"] = invalid_delay

    with pytest.raises(InvalidData, match="invalid_window_open_delay_seconds"):
        validate_planner(value)


def test_legacy_global_mode_pause_is_migrated_to_assignments():
    value = planner()
    value["modes"][0].update({"enabled": False, "priority": 7})
    normalized = validate_planner(value)
    assert normalized["modes"][0]["priority"] == 7
    assert normalized["schedules"][0]["assignments"][0]["enabled"] is False


def test_repeated_auto_rules_are_normalized():
    value = planner()
    value["schedules"][0]["assignments"][0]["auto_rules"] = [
        {
            "id": "rule_on",
            "name": "Morgens einschalten",
            "action": "on",
            "kind": "date",
            "date": "2026-02-14",
        },
        {"id": "rule_off", "action": "off", "kind": "holiday", "holiday": "christmas_eve"},
        {
            "id": "rule_cycle",
            "action": "on",
            "kind": "cycle",
            "recurrence": "yearly",
            "start_date": "2026-02-14",
            "start_time": "08:00",
            "end_date": "2027-02-14",
        },
    ]

    rules = validate_planner(value)["schedules"][0]["assignments"][0]["auto_rules"]

    assert rules == value["schedules"][0]["assignments"][0]["auto_rules"]


def test_grouped_auto_rule_supports_on_and_off_actions():
    value = planner()
    value["schedules"][0]["assignments"][0]["auto_rules"] = [
        {
            "id": "easter-monday",
            "name": "Ostermontag",
            "kind": "holiday",
            "holiday": "easter_monday",
            "actions": {
                "on": {"time": "09:00"},
                "off": {"time": "21:00"},
            },
        }
    ]

    rules = validate_planner(value)["schedules"][0]["assignments"][0]["auto_rules"]

    assert rules == value["schedules"][0]["assignments"][0]["auto_rules"]


def test_continuous_auto_rule_can_omit_weekday_phases_and_preserves_flag():
    value = planner()
    assignment_value = value["schedules"][0]["assignments"][0]
    assignment_value["weekday_rules"] = {}
    assignment_value["auto_rules"] = [
        {
            "id": "easter",
            "name": "Ostern",
            "kind": "holiday",
            "holiday": "easter_period",
            "continuous": True,
            "actions": {
                "on": {"time": "09:00"},
                "off": {"time": "22:00"},
            },
        }
    ]

    normalized = validate_planner(value)["schedules"][0]["assignments"][0]

    assert normalized["weekday_rules"] == {}
    assert normalized["continuous"] is True
    assert normalized["auto_rules"][0]["continuous"] is True


def test_continuous_assignment_is_central_and_allows_empty_weekday_phases():
    value = planner()
    assignment_value = value["schedules"][0]["assignments"][0]
    assignment_value["continuous"] = True
    assignment_value["weekday_rules"] = {}
    assignment_value["auto_rules"] = [
        {
            "id": "holiday",
            "name": "Feiertag",
            "kind": "holiday",
            "holiday": "labour_day",
            "actions": {"on": {"time": "09:00"}, "off": {"time": "22:00"}},
        }
    ]

    normalized = validate_planner(value)["schedules"][0]["assignments"][0]

    assert normalized["continuous"] is True
    assert normalized["weekday_rules"] == {}
    assert "continuous" not in normalized["auto_rules"][0]


def test_continuous_assignment_without_auto_rules_is_valid():
    value = planner()
    assignment_value = value["schedules"][0]["assignments"][0]
    assignment_value["continuous"] = True
    assignment_value["weekday_rules"] = {}

    normalized = validate_planner(value)["schedules"][0]["assignments"][0]

    assert normalized["continuous"] is True
    assert normalized["weekday_rules"] == {}
    assert "auto_rules" not in normalized


def test_grouped_cyclic_auto_rule_has_independent_action_ranges():
    value = planner()
    value["schedules"][0]["assignments"][0]["auto_rules"] = [
        {
            "id": "wednesday",
            "name": "Mittwochs lang",
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

    rules = validate_planner(value)["schedules"][0]["assignments"][0]["auto_rules"]

    assert rules == value["schedules"][0]["assignments"][0]["auto_rules"]


def test_repeated_auto_rules_require_their_value():
    value = planner()
    value["schedules"][0]["assignments"][0]["auto_rules"] = [
        {"id": "rule", "action": "on", "kind": "holiday"}
    ]

    with pytest.raises(InvalidData, match="invalid_auto_rule_holiday"):
        validate_planner(value)


def test_cyclic_auto_rule_is_normalized():
    value = planner()
    value["schedules"][0]["assignments"][0]["auto_rules"] = [
        {
            "id": "hourly",
            "action": "on",
            "kind": "cycle",
            "recurrence": "hourly",
            "start_date": "2026-11-15",
            "start_time": "08:00",
        }
    ]

    normalized = validate_planner(value)["schedules"][0]["assignments"][0]["auto_rules"]

    assert normalized == value["schedules"][0]["assignments"][0]["auto_rules"]


def test_cyclic_auto_rule_dates_are_optional():
    value = planner()
    value["schedules"][0]["assignments"][0]["auto_rules"] = [
        {
            "id": "open-ended",
            "action": "on",
            "kind": "cycle",
            "recurrence": "daily",
            "start_time": "09:00",
        }
    ]

    normalized = validate_planner(value)["schedules"][0]["assignments"][0]["auto_rules"]

    assert normalized == value["schedules"][0]["assignments"][0]["auto_rules"]


def test_cyclic_auto_rule_rejects_unknown_recurrence():
    value = planner()
    value["schedules"][0]["assignments"][0]["auto_rules"] = [
        {
            "id": "rule",
            "action": "on",
            "kind": "cycle",
            "recurrence": "every-so-often",
            "start_date": "2026-11-15",
            "start_time": "08:00",
        }
    ]

    with pytest.raises(InvalidData, match="invalid_auto_rule_recurrence"):
        validate_planner(value)


def test_cyclic_auto_rule_rejects_end_date_before_start_date():
    value = planner()
    value["schedules"][0]["assignments"][0]["auto_rules"] = [
        {
            "id": "rule",
            "action": "on",
            "kind": "cycle",
            "recurrence": "daily",
            "start_date": "2026-11-15",
            "start_time": "08:00",
            "end_date": "2026-11-14",
        }
    ]

    with pytest.raises(InvalidData, match="invalid_auto_rule_end_date"):
        validate_planner(value)


def test_multiple_climate_entities_are_preserved():
    value = planner()
    value["schedules"][0].pop("climate_entity_id")
    value["schedules"][0]["climate_entity_ids"] = [
        "climate.living_room",
        "climate.bedroom",
    ]
    normalized = validate_planner(value)
    assert normalized["schedules"][0]["climate_entity_ids"] == [
        "climate.living_room",
        "climate.bedroom",
    ]


def test_climate_entity_display_names_are_preserved_and_trimmed():
    value = planner()
    value["schedules"][0]["climate_entity_names"] = {
        "climate.living_room": "  Wohnzimmer  ",
    }

    normalized = validate_planner(value)

    assert normalized["schedules"][0]["climate_entity_names"] == {
        "climate.living_room": "Wohnzimmer",
    }


def test_unknown_climate_entity_display_name_is_rejected():
    value = planner()
    value["schedules"][0]["climate_entity_names"] = {
        "climate.missing": "Fehlt",
    }

    with pytest.raises(InvalidData, match="invalid_climate_entity_name_entity"):
        validate_planner(value)


@pytest.mark.parametrize(
    ("change", "code"),
    [
        (
            {"schedules": [{**schedule(), "climate_entity_id": "switch.heater"}]},
            "invalid_climate_entity",
        ),
        (
            {
                "schedules": [
                    {
                        **schedule(),
                        "assignments": [{**assignment(), "weekday_rules": {"monday": ["25:00"]}}],
                    }
                ]
            },
            "invalid_time",
        ),
        (
            {
                "modes": [mode()],
                "schedules": [{**schedule(), "assignments": [{**assignment("missing")}]}],
            },
            "unknown_mode_reference",
        ),
        (
            {"schedules": [{**schedule(), "assignments": [{**assignment(), "weekday_rules": {}}]}]},
            "missing_weekday",
        ),
        ({"modes": [mode(), mode()], "schedules": [schedule()]}, "duplicate_mode_id"),
        (
            {
                "schedules": [
                    {
                        **schedule(),
                        "assignments": [
                            {
                                **assignment(),
                                "auto_rules": [
                                    {
                                        "id": "invalid-date",
                                        "action": "on",
                                        "kind": "date",
                                        "date": "2026-02-30",
                                    }
                                ],
                            }
                        ],
                    }
                ]
            },
            "invalid_auto_rule_date",
        ),
    ],
)
def test_invalid_data_is_rejected(change, code):
    value = planner()
    value.update(deepcopy(change))
    with pytest.raises(InvalidData, match=code):
        validate_planner(value)


def test_multiple_times_per_day_are_supported():
    value = planner()
    value["schedules"][0]["assignments"][0]["weekday_rules"]["monday"] = [
        "06:30",
        "18:00",
    ]
    phases = validate_planner(value)["schedules"][0]["assignments"][0]["weekday_rules"]["monday"]
    assert [phase["time"] for phase in phases] == ["06:30", "18:00"]


def test_phase_temperature_override_is_normalized():
    value = planner()
    value["schedules"][0]["assignments"][0]["weekday_rules"]["monday"] = [
        {"id": "phase_warm", "time": "06:30", "target_temperature": 22.5}
    ]
    phase = validate_planner(value)["schedules"][0]["assignments"][0]["weekday_rules"]["monday"][0]
    assert phase == {"id": "phase_warm", "time": "06:30", "target_temperature": 22.5}


def test_mode_deletion_with_existing_assignment_is_rejected_safely():
    value = planner()
    value["modes"] = []
    with pytest.raises(InvalidData, match="unknown_mode_reference"):
        validate_planner(value)


def test_migration_rejects_unknown_schema_without_dropping_data():
    with pytest.raises(InvalidData, match="unsupported_schema_version"):
        migrate_storage({"schema_version": 99, "modes": [], "schedules": []})
