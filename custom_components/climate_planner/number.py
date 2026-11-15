"""Number entities for scalar Climate Planner settings."""

from __future__ import annotations

from homeassistant.components.number import NumberEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .entity import PlannerEntity, PlannerEntityManager
from .runtime import PlannerRuntime


class ScheduleWindowTemperatureNumber(PlannerEntity, NumberEntity):
    """Set the setback temperature used while a labelled window is open."""

    _attr_icon = "mdi:thermometer-minus"
    _attr_native_min_value = -100.0
    _attr_native_max_value = 100.0
    _attr_native_step = 0.1
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS

    def __init__(self, runtime: PlannerRuntime, entry_id: str, schedule_id: str) -> None:
        super().__init__(
            runtime,
            entry_id,
            f"{entry_id}_schedule_{schedule_id}_window_open_temperature",
        )
        self.schedule_id = schedule_id
        self._attr_name = "Window setback temperature"

    @property
    def native_value(self) -> float | None:
        schedule = self._schedule(self.schedule_id)
        return schedule.get("window_open_temperature") if schedule else None

    @property
    def available(self) -> bool:
        return super().available and self._schedule(self.schedule_id) is not None

    async def async_set_native_value(self, value: float) -> None:
        await self.runtime.async_set_schedule_window_open_temperature(self.schedule_id, value)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"schedule_id": self.schedule_id}


class ModeTargetTemperatureNumber(PlannerEntity, NumberEntity):
    """Set a mode library target temperature."""

    _attr_icon = "mdi:thermometer"
    _attr_native_min_value = -100.0
    _attr_native_max_value = 100.0
    _attr_native_step = 0.1
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS

    def __init__(self, runtime: PlannerRuntime, entry_id: str, mode_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_mode_{mode_id}_target_temperature")
        self.mode_id = mode_id
        self._attr_name = self._mode_name()

    def _mode_name(self) -> str:
        mode = next(
            (item for item in self.runtime.data["modes"] if item["id"] == self.mode_id), None
        )
        return f"{mode['name']} target temperature" if mode else "Mode target temperature"

    @property
    def native_value(self) -> float | None:
        mode = next(
            (item for item in self.runtime.data["modes"] if item["id"] == self.mode_id), None
        )
        return mode.get("target_temperature") if mode else None

    @property
    def available(self) -> bool:
        return super().available and any(
            item["id"] == self.mode_id for item in self.runtime.data["modes"]
        )

    async def async_set_native_value(self, value: float) -> None:
        await self.runtime.async_set_mode_setting(self.mode_id, "target_temperature", value)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"mode_id": self.mode_id}


class ModePriorityNumber(PlannerEntity, NumberEntity):
    """Set the priority used when multiple modes match."""

    _attr_icon = "mdi:priority-high"
    _attr_native_min_value = -1_000_000.0
    _attr_native_max_value = 1_000_000.0
    _attr_native_step = 1.0

    def __init__(self, runtime: PlannerRuntime, entry_id: str, mode_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_mode_{mode_id}_priority")
        self.mode_id = mode_id
        self._attr_name = self._mode_name()

    def _mode_name(self) -> str:
        mode = next(
            (item for item in self.runtime.data["modes"] if item["id"] == self.mode_id), None
        )
        return f"{mode['name']} priority" if mode else "Mode priority"

    @property
    def native_value(self) -> float | None:
        mode = next(
            (item for item in self.runtime.data["modes"] if item["id"] == self.mode_id), None
        )
        return mode.get("priority") if mode else None

    @property
    def available(self) -> bool:
        return super().available and any(
            item["id"] == self.mode_id for item in self.runtime.data["modes"]
        )

    async def async_set_native_value(self, value: float) -> None:
        await self.runtime.async_set_mode_setting(self.mode_id, "priority", int(value))

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"mode_id": self.mode_id}


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities) -> None:
    """Create scalar configuration entities."""

    runtime: PlannerRuntime = entry.runtime_data
    manager = PlannerEntityManager(hass, runtime, entry.entry_id, "number", async_add_entities)
    hass.data.setdefault(DOMAIN, {}).setdefault("entity_managers", {})[
        (entry.entry_id, "number")
    ] = manager
    await manager.async_setup()


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload number entities with the config entry."""

    manager = (
        hass.data.get(DOMAIN, {}).get("entity_managers", {}).pop((entry.entry_id, "number"), None)
    )
    if manager:
        await manager.async_shutdown()
    return True
