from types import SimpleNamespace

import pytest

from custom_components.climate_planner.button import ActivateAssignmentButton, ApplyMatchingButton
from custom_components.climate_planner.models import validate_planner
from custom_components.climate_planner.switch import (
    AssignmentEnabledSwitch,
    ScheduleEnabledSwitch,
)


def runtime():
    value = validate_planner(
        {
            "modes": [{"id": "mode_home", "name": "Home", "target_temperature": 21}],
            "schedules": [
                {
                    "id": "schedule_living",
                    "name": "Living room",
                    "climate_entity_id": "climate.living",
                    "enabled": True,
                    "assignments": [
                        {
                            "id": "assignment_home",
                            "mode_id": "mode_home",
                            "enabled": True,
                            "weekday_rules": {"monday": ["00:00"]},
                        }
                    ],
                }
            ],
        }
    )
    return SimpleNamespace(
        _started=True,
        data=value,
        hass=SimpleNamespace(data={"climate_planner": {"runtime": None}}),
    )


def test_entities_are_grouped_under_their_heating_plan_device():
    value = runtime()
    schedule_entity = ScheduleEnabledSwitch(value, "entry", "schedule_living")
    assignment_entity = AssignmentEnabledSwitch(
        value, "entry", "schedule_living", "assignment_home"
    )
    expected = {("climate_planner", "entry_schedule_living")}
    assert schedule_entity.device_info["identifiers"] == expected
    assert assignment_entity.device_info["identifiers"] == expected
    assert schedule_entity.device_info["name"] == "Living room"
    assert schedule_entity.name == "Automatic"
    assert assignment_entity.name == "Home automatic"


def test_duplicate_assignments_get_distinct_concise_names():
    value = validate_planner(
        {
            "modes": [{"id": "mode_home", "name": "Home", "target_temperature": 21}],
            "schedules": [
                {
                    "id": "schedule_living",
                    "name": "Living room",
                    "climate_entity_id": "climate.living",
                    "enabled": True,
                    "assignments": [
                        {
                            "id": "assignment_home_morning",
                            "mode_id": "mode_home",
                            "enabled": True,
                            "weekday_rules": {"monday": ["06:00"]},
                        },
                        {
                            "id": "assignment_home_evening",
                            "mode_id": "mode_home",
                            "enabled": True,
                            "weekday_rules": {"monday": ["18:00"]},
                        },
                    ],
                }
            ],
        }
    )
    runtime_value = SimpleNamespace(
        _started=True,
        data=value,
        hass=SimpleNamespace(data={"climate_planner": {"runtime": None}}),
    )

    first_switch = AssignmentEnabledSwitch(
        runtime_value, "entry", "schedule_living", "assignment_home_morning"
    )
    second_button = ActivateAssignmentButton(
        runtime_value, "entry", "schedule_living", "assignment_home_evening"
    )

    assert first_switch.name == "Home 1 automatic"
    assert second_button.name == "Home 2 activate"


@pytest.mark.asyncio
async def test_apply_button_delegates_to_runtime_action():
    calls = []

    class FakeRuntime:
        _started = True
        data = {"schedules": []}
        hass = SimpleNamespace(data={"climate_planner": {"runtime": None}})

        async def async_apply_matching(self, action, schedule_id):
            calls.append((action, schedule_id))
            return 1

    button = ApplyMatchingButton(FakeRuntime(), "entry", "schedule_living", "apply_matched")
    await button.async_press()

    assert calls == [("apply_matched", "schedule_living")]
    assert button.extra_state_attributes["last_applied_count"] == 1
