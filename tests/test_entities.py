from types import SimpleNamespace

import pytest

import custom_components.climate_planner.entity as entity_module
from custom_components.climate_planner.button import ActivateAssignmentButton, ApplyMatchingButton
from custom_components.climate_planner.entity import PlannerEntityManager
from custom_components.climate_planner.models import validate_planner
from custom_components.climate_planner.number import (
    ModePriorityNumber,
    ModeTargetTemperatureNumber,
    ScheduleWindowTemperatureNumber,
)
from custom_components.climate_planner.select import (
    AssignmentModeSelect,
    HolidayRegionSelect,
    WindowLabelSelect,
)
from custom_components.climate_planner.sensor import (
    AssignmentConfigurationSensor,
    PlannerConfigurationSensor,
    ScheduleConfigurationSensor,
)
from custom_components.climate_planner.switch import (
    AssignmentEnabledSwitch,
    ScheduleEnabledSwitch,
    WindowDetectionSwitch,
)
from custom_components.climate_planner.text import ScheduleClimateEntitiesText, ScheduleNameText


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
        window_label="",
        window_label_name="",
        holiday_region="national",
        hass=SimpleNamespace(data={"climate_planner": {"runtime": None}}),
    )


def test_entities_are_grouped_under_their_heating_plan_device():
    value = runtime()
    schedule_entity = ScheduleEnabledSwitch(value, "entry", "schedule_living")
    window_entity = WindowDetectionSwitch(value, "entry", "schedule_living")
    assignment_entity = AssignmentEnabledSwitch(
        value, "entry", "schedule_living", "assignment_home"
    )
    expected = {("climate_planner", "entry_schedule_living")}
    assert schedule_entity.device_info["identifiers"] == expected
    assert assignment_entity.device_info["identifiers"] == expected
    assert schedule_entity.device_info["name"] == "Living room"
    assert schedule_entity.name == "Automatic"
    assert window_entity.name == "Window detection"
    assert window_entity.is_on is True
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


def test_global_configuration_selects_expose_display_options():
    value = runtime()
    value.holiday_region = "sn"
    value.window_label = "fenster"
    value._window_label_options = lambda: [{"id": "fenster", "name": "Fensterkontakte"}]

    holiday_select = HolidayRegionSelect(value, "entry")
    label_select = WindowLabelSelect(value, "entry")

    assert holiday_select.current_option == "Sachsen"
    assert "Sachsen" in holiday_select.options
    assert label_select.current_option == "Fensterkontakte"
    assert label_select.options == ["Kein Label", "Fensterkontakte"]
    assert label_select.device_info["identifiers"] == {("climate_planner", "entry_settings")}
    assert label_select.device_info["name"] == "Climate Planner Grundeinstellungen"


def test_all_configuration_entities_are_grouped_by_scope():
    value = runtime()

    global_sensor = PlannerConfigurationSensor(value, "entry")
    schedule_sensor = ScheduleConfigurationSensor(value, "entry", "schedule_living")
    assignment_sensor = AssignmentConfigurationSensor(
        value, "entry", "schedule_living", "assignment_home"
    )
    mode_select = AssignmentModeSelect(value, "entry", "schedule_living", "assignment_home")
    plan_name = ScheduleNameText(value, "entry", "schedule_living")
    climates = ScheduleClimateEntitiesText(value, "entry", "schedule_living")
    setback = ScheduleWindowTemperatureNumber(value, "entry", "schedule_living")
    mode_temperature = ModeTargetTemperatureNumber(value, "entry", "mode_home")
    mode_priority = ModePriorityNumber(value, "entry", "mode_home")

    assert global_sensor.device_info["name"] == "Climate Planner Grundeinstellungen"
    assert global_sensor.extra_state_attributes["modes"][0]["id"] == "mode_home"
    assert schedule_sensor.device_info["name"] == "Living room"
    assert assignment_sensor.extra_state_attributes["weekday_rules"]["monday"]
    assert mode_select.current_option == "Home"
    assert plan_name.native_value == "Living room"
    assert climates.native_value == "climate.living"
    assert setback.native_value == 18.5
    assert mode_temperature.native_value == 21.0
    assert mode_priority.native_value == 0


@pytest.mark.asyncio
async def test_manager_removes_stale_schedule_entities_and_devices(monkeypatch):
    registry_entries = [
        SimpleNamespace(
            domain="switch",
            platform="climate_planner",
            unique_id="entry_schedule_deleted_enabled",
            entity_id="switch.deleted_automatic",
        )
    ]
    removed_entities = []

    class FakeEntityItems:
        def get_entries_for_config_entry_id(self, _entry_id):
            return registry_entries

        def get_entries_for_device_id(self, _device_id, include_disabled_entities=False):
            return []

    class FakeEntityRegistry:
        entities = FakeEntityItems()

        def async_remove(self, entity_id):
            removed_entities.append(entity_id)

    schedule_device = SimpleNamespace(
        id="device-deleted",
        identifiers={("climate_planner", "entry_schedule_deleted")},
    )
    planner_device = SimpleNamespace(
        id="device-planner",
        identifiers={("climate_planner", "entry")},
    )
    removed_devices = []

    class FakeDeviceItems:
        def get_devices_for_config_entry_id(self, _entry_id):
            return [schedule_device, planner_device]

    class FakeDeviceRegistry:
        devices = FakeDeviceItems()

        def async_remove_device(self, device_id):
            removed_devices.append(device_id)

    monkeypatch.setattr(entity_module.er, "async_get", lambda _hass: FakeEntityRegistry())
    monkeypatch.setattr(entity_module.dr, "async_get", lambda _hass: FakeDeviceRegistry())

    manager = PlannerEntityManager(
        SimpleNamespace(), SimpleNamespace(), "entry", "switch", lambda _entities: None
    )
    manager._known.add("entry_schedule_deleted_enabled")
    await manager._async_remove_stale(set())

    assert removed_entities == ["switch.deleted_automatic"]
    assert removed_devices == ["device-deleted"]
    assert not manager._known


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
