"""Configuration snapshot entities for the Climate Planner."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .entity import PlannerEntity, PlannerEntityManager
from .runtime import PlannerRuntime


class PlannerConfigurationSensor(PlannerEntity, SensorEntity):
    """Expose all integration-wide settings and the complete mode library."""

    _attr_icon = "mdi:cog-outline"

    def __init__(self, runtime: PlannerRuntime, entry_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_settings_configuration")
        self._attr_name = "Configuration"

    @property
    def native_value(self) -> str:
        return "configured" if self.runtime._started else "unavailable"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "revision": self.runtime.data["revision"],
            "window_label": self.runtime.window_label,
            "window_label_name": self.runtime.window_label_name,
            "holiday_region": self.runtime.holiday_region,
            "modes": deepcopy(self.runtime.data["modes"]),
        }


class ModeConfigurationSensor(PlannerEntity, SensorEntity):
    """Expose one complete mode-library entry as attributes."""

    _attr_icon = "mdi:thermostat"

    def __init__(self, runtime: PlannerRuntime, entry_id: str, mode_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_mode_{mode_id}_configuration")
        self.mode_id = mode_id
        self._attr_name = self._mode_name()

    def _mode(self) -> dict | None:
        return next(
            (item for item in self.runtime.data["modes"] if item["id"] == self.mode_id),
            None,
        )

    def _mode_name(self) -> str:
        mode = self._mode()
        return f"{mode['name']} configuration" if mode else "Mode configuration"

    @property
    def native_value(self) -> str:
        mode = self._mode()
        return mode["name"] if mode else "unavailable"

    @property
    def available(self) -> bool:
        return super().available and self._mode() is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"mode_id": self.mode_id, **deepcopy(self._mode() or {})}


class ScheduleConfigurationSensor(PlannerEntity, SensorEntity):
    """Expose one complete heating plan configuration as attributes."""

    _attr_icon = "mdi:calendar-clock"

    def __init__(self, runtime: PlannerRuntime, entry_id: str, schedule_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_schedule_{schedule_id}_configuration")
        self.schedule_id = schedule_id
        self._attr_name = "Configuration"

    @property
    def native_value(self) -> str:
        schedule = self._schedule(self.schedule_id)
        return "enabled" if schedule and schedule["enabled"] else "disabled"

    @property
    def available(self) -> bool:
        return super().available and self._schedule(self.schedule_id) is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        schedule = self._schedule(self.schedule_id)
        return deepcopy(schedule) if schedule else {"schedule_id": self.schedule_id}


class AssignmentConfigurationSensor(PlannerEntity, SensorEntity):
    """Expose one mode assignment, including phases and automatic rules."""

    _attr_icon = "mdi:playlist-edit"

    def __init__(
        self, runtime: PlannerRuntime, entry_id: str, schedule_id: str, assignment_id: str
    ) -> None:
        super().__init__(
            runtime,
            entry_id,
            f"{entry_id}_schedule_{schedule_id}_assignment_{assignment_id}_configuration",
        )
        self.schedule_id = schedule_id
        self.assignment_id = assignment_id
        self._attr_name = self._assignment_name()

    def _assignment(self) -> dict | None:
        schedule = self._schedule(self.schedule_id)
        return (
            next(
                (item for item in schedule["assignments"] if item["id"] == self.assignment_id),
                None,
            )
            if schedule
            else None
        )

    def _assignment_name(self) -> str:
        details = self._assignment()
        if not details:
            return "Assignment configuration"
        mode = next(
            (item for item in self.runtime.data["modes"] if item["id"] == details["mode_id"]),
            None,
        )
        return f"{mode['name'] if mode else details['mode_id']} configuration"

    @property
    def native_value(self) -> str:
        assignment = self._assignment()
        return "enabled" if assignment and assignment["enabled"] else "disabled"

    @property
    def available(self) -> bool:
        return super().available and self._assignment() is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        assignment = self._assignment()
        return (
            {
                "schedule_id": self.schedule_id,
                "assignment_id": self.assignment_id,
                **deepcopy(assignment),
            }
            if assignment
            else {"schedule_id": self.schedule_id, "assignment_id": self.assignment_id}
        )


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities) -> None:
    """Create configuration snapshots for global, mode, plan, and assignment data."""

    runtime: PlannerRuntime = entry.runtime_data
    manager = PlannerEntityManager(hass, runtime, entry.entry_id, "sensor", async_add_entities)
    hass.data.setdefault(DOMAIN, {}).setdefault("entity_managers", {})[
        (entry.entry_id, "sensor")
    ] = manager
    await manager.async_setup()


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload configuration snapshots with the config entry."""

    manager = (
        hass.data.get(DOMAIN, {}).get("entity_managers", {}).pop((entry.entry_id, "sensor"), None)
    )
    if manager:
        await manager.async_shutdown()
    return True
