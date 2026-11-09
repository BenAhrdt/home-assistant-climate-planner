from copy import deepcopy
from types import SimpleNamespace

import pytest
from homeassistant.const import UnitOfTemperature

import custom_components.climate_planner.runtime as runtime_module
from custom_components.climate_planner.const import (
    SERVICE_APPLY_ENABLED_MATCHING,
    SERVICE_APPLY_ENABLED_MODE_MATCHING,
    SERVICE_APPLY_MATCHED,
)
from custom_components.climate_planner.runtime import PlannerRuntime


class FakeStore:
    values = {}

    def __init__(self, _hass, _version, key, **_kwargs):
        self.key = key

    async def async_load(self):
        return deepcopy(type(self).values.get(self.key))

    async def async_save(self, value):
        type(self).values[self.key] = deepcopy(value)


class FakeStates:
    def __init__(self):
        self.values = {}

    def get(self, entity_id):
        return self.values.get(entity_id)

    def async_all(self, domain):
        return [
            state for entity_id, state in self.values.items() if entity_id.startswith(f"{domain}.")
        ]


class FakeServices:
    def __init__(self):
        self.calls = []
        self.error = None

    async def async_call(self, domain, service, data, *, target, blocking):
        if self.error:
            raise self.error
        self.calls.append((domain, service, data, target, blocking))


class FakeBus:
    def __init__(self):
        self.events = []

    def async_fire(self, event, data):
        self.events.append((event, data))


class FakeHass:
    def __init__(self):
        self.config = SimpleNamespace(
            time_zone="Europe/Berlin",
            units=SimpleNamespace(temperature_unit=UnitOfTemperature.CELSIUS),
        )
        self.states = FakeStates()
        self.services = FakeServices()
        self.bus = FakeBus()


def planner_payload():
    return {
        "modes": [{"id": "mode_home", "name": "Home", "target_temperature": 21}],
        "schedules": [
            {
                "id": "schedule_living",
                "name": "Living",
                "climate_entity_id": "climate.living",
                "enabled": True,
                "assignments": [
                    {
                        "id": "assignment_home",
                        "mode_id": "mode_home",
                        "enabled": True,
                        "weekday_rules": {
                            "monday": ["00:00"],
                            "tuesday": ["00:00"],
                            "wednesday": ["00:00"],
                            "thursday": ["00:00"],
                            "friday": ["00:00"],
                            "saturday": ["00:00"],
                            "sunday": ["00:00"],
                        },
                    }
                ],
            }
        ],
    }


@pytest.fixture
def fake_runtime(monkeypatch):
    FakeStore.values = {}
    monkeypatch.setattr(runtime_module, "Store", FakeStore)
    monkeypatch.setattr(
        runtime_module,
        "async_track_point_in_time",
        lambda *_args, **_kwargs: lambda: None,
    )
    return FakeHass()


@pytest.mark.asyncio
async def test_initial_evaluation_applies_temperature_once(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**planner_payload(), "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    assert len(fake_runtime.services.calls) == 1
    assert fake_runtime.services.calls[-1][2]["temperature"] == 21.0
    assert fake_runtime.services.calls[-1][3] == {"entity_id": "climate.living"}
    assert runtime._last_activated["schedule_living"]["mode_id"] == "mode_home"
    assert runtime._last_activated["schedule_living"]["target_temperature"] == 21.0
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_service_temperature_uses_home_assistant_unit(fake_runtime):
    fake_runtime.config.units.temperature_unit = UnitOfTemperature.FAHRENHEIT
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**planner_payload(), "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    assert fake_runtime.services.calls[-1][2]["temperature"] == pytest.approx(69.8)
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_unavailable_climate_does_not_abort(fake_runtime):
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**planner_payload(), "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    assert fake_runtime.services.calls == []
    assert runtime._last_activated == {}
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_explicit_activation_reasserts_and_records_unchanged_mode(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**planner_payload(), "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    assert len(fake_runtime.services.calls) == 1

    await runtime.async_activate_mode("schedule_living", "mode_home")

    assert len(fake_runtime.services.calls) == 2
    assert runtime._last_activated["schedule_living"]["mode_name"] == "Home"
    assert runtime._last_activated["schedule_living"]["assignment_id"] == "assignment_home"
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_store_persists_validated_planner(fake_runtime):
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**planner_payload(), "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    await runtime.async_shutdown()
    restored = PlannerRuntime(fake_runtime, "entry")
    await restored.async_start()
    assert restored.data["modes"][0]["name"] == "Home"
    assert restored.data["schedules"][0]["climate_entity_ids"] == ["climate.living"]
    await restored.async_shutdown()


@pytest.mark.asyncio
async def test_last_activated_mode_survives_restart_for_paused_schedule(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**planner_payload(), "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    await runtime.async_set_schedule_enabled("schedule_living", False)
    calls_before_restart = len(fake_runtime.services.calls)
    await runtime.async_shutdown()

    restored = PlannerRuntime(fake_runtime, "entry")
    await restored.async_start()

    assert restored.data["schedules"][0]["enabled"] is False
    assert restored._last_activated["schedule_living"]["mode_id"] == "mode_home"
    assert len(fake_runtime.services.calls) == calls_before_restart
    await restored.async_shutdown()


@pytest.mark.asyncio
async def test_service_error_is_logged_and_does_not_raise(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    fake_runtime.services.error = RuntimeError("boom")
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**planner_payload(), "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_central_mode_temperature_change_reapplies_active_mode(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**planner_payload(), "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    changed = planner_payload()
    changed["modes"][0]["target_temperature"] = 22
    await runtime.async_replace(
        {**changed, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    assert [call[2]["temperature"] for call in fake_runtime.services.calls] == [21.0, 22.0]
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_multiple_climate_entities_receive_same_temperature(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    fake_runtime.states.values["climate.bedroom"] = SimpleNamespace(state="heat")
    payload = planner_payload()
    schedule = payload["schedules"][0]
    schedule.pop("climate_entity_id")
    schedule["climate_entity_ids"] = ["climate.living", "climate.bedroom"]
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**payload, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    assert fake_runtime.services.calls[-1][3] == {
        "entity_id": ["climate.living", "climate.bedroom"]
    }
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_manual_mode_activation_overrides_schedule_until_next_event(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    payload = planner_payload()
    payload["modes"].append({"id": "mode_away", "name": "Away", "target_temperature": 17})
    payload["schedules"][0]["assignments"].append(
        {
            "id": "assignment_away",
            "mode_id": "mode_away",
            "enabled": False,
            "weekday_rules": {
                day: ["12:00"]
                for day in (
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                )
            },
        }
    )
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**payload, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    await runtime.async_activate_mode("schedule_living", "mode_away")
    assert runtime.active["schedule_living"] is not None
    assert runtime.active["schedule_living"].mode["id"] == "mode_away"
    assert runtime._manual_overrides["schedule_living"]["mode_id"] == "mode_away"
    assert runtime._manual_overrides["schedule_living"]["assignment_id"] == "assignment_away"
    assert fake_runtime.services.calls[-1][2]["temperature"] == 17.0
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_manual_mode_activation_is_allowed_when_schedule_is_paused(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    payload = planner_payload()
    payload["schedules"][0]["enabled"] = False
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**payload, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    assert fake_runtime.services.calls == []

    await runtime.async_activate_mode("schedule_living", "mode_home")

    assert runtime.active["schedule_living"].mode["id"] == "mode_home"
    assert fake_runtime.services.calls[-1][2]["temperature"] == 21.0

    await runtime.async_set_schedule_enabled("schedule_living", True)

    assert "schedule_living" not in runtime._manual_overrides
    assert len(fake_runtime.services.calls) == 2
    assert runtime._last_activated["schedule_living"]["mode_id"] == "mode_home"
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_panel_reactivation_clears_override_and_applies_current_schedule(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    payload = planner_payload()
    payload["schedules"][0]["enabled"] = False
    payload["modes"].append({"id": "mode_away", "name": "Away", "target_temperature": 17})
    payload["schedules"][0]["assignments"].append(
        {
            "id": "assignment_away",
            "mode_id": "mode_away",
            "enabled": False,
            "weekday_rules": {"monday": ["12:00"]},
        }
    )
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**payload, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    await runtime.async_activate_mode("schedule_living", "mode_away")
    assert runtime._last_activated["schedule_living"]["mode_id"] == "mode_away"

    changed = deepcopy(payload)
    changed["schedules"][0]["enabled"] = True
    await runtime.async_replace(
        {**changed, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )

    assert "schedule_living" not in runtime._manual_overrides
    assert runtime._last_activated["schedule_living"]["mode_id"] == "mode_home"
    assert fake_runtime.services.calls[-1][2]["temperature"] == 21.0
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_entity_enable_mutations_persist_per_plan(fake_runtime):
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**planner_payload(), "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    await runtime.async_set_assignment_enabled("schedule_living", "assignment_home", False)
    assert runtime.data["schedules"][0]["assignments"][0]["enabled"] is False
    await runtime.async_set_schedule_enabled("schedule_living", False)
    assert runtime.data["schedules"][0]["enabled"] is False
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_duplicate_mode_assignments_can_be_activated_independently(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    payload = planner_payload()
    payload["schedules"][0]["assignments"].append(
        {
            "id": "assignment_home_late",
            "mode_id": "mode_home",
            "enabled": False,
            "weekday_rules": {
                day: ["18:00"]
                for day in (
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                )
            },
        }
    )
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**payload, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    await runtime.async_activate_mode("schedule_living", "mode_home", "assignment_home_late")
    assert runtime._manual_overrides["schedule_living"]["assignment_id"] == "assignment_home_late"
    assert runtime.active["schedule_living"].assignment["id"] == "assignment_home_late"
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_apply_matching_actions_follow_enable_switch_semantics(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    payload = planner_payload()
    payload["schedules"][0]["enabled"] = False
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**payload, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    fake_runtime.services.calls.clear()
    assert (
        await runtime.async_apply_matching(SERVICE_APPLY_ENABLED_MATCHING, "schedule_living")
    ) == 0
    assert fake_runtime.services.calls == []
    assert (
        await runtime.async_apply_matching(SERVICE_APPLY_ENABLED_MODE_MATCHING, "schedule_living")
    ) == 1
    assert len(fake_runtime.services.calls) == 1
    assert runtime.active["schedule_living"].mode["id"] == "mode_home"
    assert (await runtime.async_apply_matching(SERVICE_APPLY_MATCHED, "schedule_living")) == 1
    assert len(fake_runtime.services.calls) == 2
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_apply_matching_uses_priority_after_applying_enable_filters(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    payload = planner_payload()
    payload["schedules"][0]["enabled"] = False
    payload["modes"].append(
        {"id": "mode_away", "name": "Away", "target_temperature": 17, "priority": 10}
    )
    payload["schedules"][0]["assignments"].append(
        {
            "id": "assignment_away",
            "mode_id": "mode_away",
            "enabled": False,
            "weekday_rules": {
                day: ["00:00"]
                for day in (
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                )
            },
        }
    )
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**payload, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    fake_runtime.services.calls.clear()

    assert (
        await runtime.async_apply_matching(SERVICE_APPLY_ENABLED_MODE_MATCHING, "schedule_living")
    ) == 1
    assert fake_runtime.services.calls[-1][2]["temperature"] == 21.0

    assert (await runtime.async_apply_matching(SERVICE_APPLY_MATCHED, "schedule_living")) == 1
    assert fake_runtime.services.calls[-1][2]["temperature"] == 17.0
    assert runtime.active["schedule_living"].mode["id"] == "mode_away"
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_pausing_a_plan_assignment_does_not_cancel_manual_override(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    payload = planner_payload()
    payload["modes"].append({"id": "mode_away", "name": "Away", "target_temperature": 17})
    payload["schedules"][0]["assignments"].append(
        {
            "id": "assignment_away",
            "mode_id": "mode_away",
            "enabled": True,
            "weekday_rules": {
                day: ["12:00"]
                for day in (
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                )
            },
        }
    )
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**payload, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    await runtime.async_activate_mode("schedule_living", "mode_away")
    changed = deepcopy(payload)
    changed["schedules"][0]["assignments"][1]["enabled"] = False
    await runtime.async_replace(
        {**changed, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    assert runtime._manual_overrides["schedule_living"]["mode_id"] == "mode_away"
    assert runtime.active["schedule_living"].mode["id"] == "mode_away"
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_phase_temperature_override_is_applied(fake_runtime):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(state="heat")
    payload = planner_payload()
    payload["schedules"][0]["assignments"][0]["weekday_rules"] = {
        day: [{"id": f"phase_warm_{day}", "time": "00:00", "target_temperature": 22}]
        for day in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    }
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    await runtime.async_replace(
        {**payload, "revision": runtime.data["revision"]}, runtime.data["revision"]
    )
    assert fake_runtime.services.calls[-1][2]["temperature"] == 22.0
    await runtime.async_shutdown()


@pytest.mark.asyncio
async def test_snapshot_includes_integration_area_and_device_labels(fake_runtime, monkeypatch):
    fake_runtime.states.values["climate.living"] = SimpleNamespace(
        entity_id="climate.living",
        state="heat",
        attributes={
            "friendly_name": "Living climate",
            "current_temperature": 20.5,
            "temperature": 21.0,
            "target_temperature": 20.0,
        },
    )
    entity_entry = SimpleNamespace(platform="demo", device_id="device_1", area_id=None, name=None)
    device_entry = SimpleNamespace(
        name_by_user="Living thermostat", name="Thermostat", area_id="living_room"
    )
    monkeypatch.setattr(
        runtime_module.er,
        "async_get",
        lambda _hass: SimpleNamespace(async_get=lambda _entity_id: entity_entry),
    )
    monkeypatch.setattr(
        runtime_module.dr,
        "async_get",
        lambda _hass: SimpleNamespace(async_get=lambda _device_id: device_entry),
    )
    monkeypatch.setattr(
        runtime_module.ar,
        "async_get",
        lambda _hass: SimpleNamespace(
            async_get_area=lambda _area_id: SimpleNamespace(name="Living room")
        ),
    )
    monkeypatch.setattr(
        runtime_module,
        "async_get_integrations",
        lambda _hass, _domains: _integration_result(),
    )
    runtime = PlannerRuntime(fake_runtime, "entry")
    await runtime.async_start()
    snapshot = await runtime.snapshot()
    assert snapshot["last_activated"] == {}
    assert snapshot["climate_entities"] == [
        {
            "entity_id": "climate.living",
            "label": "Demo Integration · Living thermostat · Living climate",
            "name": "Living climate",
            "device_name": "Living thermostat",
            "area_name": "Living room",
            "integration": "Demo Integration",
            "current_temperature": 20.5,
            "target_temperature": 21.0,
            "reported_target_temperature": 20.0,
        }
    ]
    await runtime.async_shutdown()


async def _integration_result():
    return {"demo": SimpleNamespace(manifest={"name": "Demo Integration"})}
