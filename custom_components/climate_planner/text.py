"""Text entities for editable Climate Planner names and references."""

from __future__ import annotations

import re

from homeassistant.components.text import TextEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .entity import PlannerEntity, PlannerEntityManager
from .runtime import PlannerRuntime


def _mode(runtime: PlannerRuntime, mode_id: str) -> dict | None:
    return next((item for item in runtime.data["modes"] if item["id"] == mode_id), None)


def _schedule(runtime: PlannerRuntime, schedule_id: str) -> dict | None:
    return next((item for item in runtime.data["schedules"] if item["id"] == schedule_id), None)


class ScheduleNameText(PlannerEntity, TextEntity):
    """Edit a heating plan display name."""

    _attr_icon = "mdi:label-outline"
    _attr_native_max = 160

    def __init__(self, runtime: PlannerRuntime, entry_id: str, schedule_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_schedule_{schedule_id}_name")
        self.schedule_id = schedule_id
        self._attr_name = "Name"

    @property
    def native_value(self) -> str | None:
        schedule = _schedule(self.runtime, self.schedule_id)
        return schedule["name"] if schedule else None

    @property
    def available(self) -> bool:
        return super().available and _schedule(self.runtime, self.schedule_id) is not None

    async def async_set_value(self, value: str) -> None:
        await self.runtime.async_set_schedule_name(self.schedule_id, value)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"schedule_id": self.schedule_id}


class ScheduleClimateEntitiesText(PlannerEntity, TextEntity):
    """Edit the climate entity list as a comma- or newline-separated value."""

    _attr_icon = "mdi:thermostat-box-multiple"
    _attr_native_max = 255

    def __init__(self, runtime: PlannerRuntime, entry_id: str, schedule_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_schedule_{schedule_id}_climate_entities")
        self.schedule_id = schedule_id
        self._attr_name = "Climate entities"

    @property
    def native_value(self) -> str | None:
        schedule = _schedule(self.runtime, self.schedule_id)
        return ", ".join(schedule["climate_entity_ids"]) if schedule else None

    @property
    def available(self) -> bool:
        return super().available and _schedule(self.runtime, self.schedule_id) is not None

    async def async_set_value(self, value: str) -> None:
        entity_ids = [item.strip() for item in re.split(r"[,;\n]+", value) if item.strip()]
        await self.runtime.async_set_schedule_climate_entities(self.schedule_id, entity_ids)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"schedule_id": self.schedule_id}


class ScheduleClimateDisplayNameText(PlannerEntity, TextEntity):
    """Edit a plan-local display name for one climate entity."""

    _attr_icon = "mdi:rename-box"
    _attr_native_max = 160

    def __init__(
        self, runtime: PlannerRuntime, entry_id: str, schedule_id: str, entity_id: str
    ) -> None:
        super().__init__(
            runtime,
            entry_id,
            f"{entry_id}_schedule_{schedule_id}_climate_{entity_id.replace('.', '_')}_name",
        )
        self.schedule_id = schedule_id
        self.entity_id_setting = entity_id
        self._attr_name = f"{entity_id} display name"

    @property
    def native_value(self) -> str:
        schedule = _schedule(self.runtime, self.schedule_id)
        return (schedule or {}).get("climate_entity_names", {}).get(self.entity_id_setting, "")

    @property
    def available(self) -> bool:
        schedule = _schedule(self.runtime, self.schedule_id)
        return super().available and bool(
            schedule and self.entity_id_setting in schedule["climate_entity_ids"]
        )

    async def async_set_value(self, value: str) -> None:
        await self.runtime.async_set_schedule_climate_entity_name(
            self.schedule_id, self.entity_id_setting, value
        )

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"schedule_id": self.schedule_id, "climate_entity_id": self.entity_id_setting}


class ModeNameText(PlannerEntity, TextEntity):
    """Edit a mode library name."""

    _attr_icon = "mdi:format-title"
    _attr_native_max = 160

    def __init__(self, runtime: PlannerRuntime, entry_id: str, mode_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_mode_{mode_id}_name")
        self.mode_id = mode_id
        self._attr_name = self._name("name")

    def _name(self, suffix: str) -> str:
        mode = _mode(self.runtime, self.mode_id)
        return f"{mode['name']} {suffix}" if mode else f"Mode {suffix}"

    @property
    def native_value(self) -> str | None:
        mode = _mode(self.runtime, self.mode_id)
        return mode["name"] if mode else None

    @property
    def available(self) -> bool:
        return super().available and _mode(self.runtime, self.mode_id) is not None

    async def async_set_value(self, value: str) -> None:
        await self.runtime.async_set_mode_setting(self.mode_id, "name", value)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"mode_id": self.mode_id}


class ModeIconText(PlannerEntity, TextEntity):
    """Edit a mode's optional MDI icon."""

    _attr_icon = "mdi:shape-outline"
    _attr_native_max = 80

    def __init__(self, runtime: PlannerRuntime, entry_id: str, mode_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_mode_{mode_id}_icon")
        self.mode_id = mode_id
        self._attr_name = self._name("icon")

    def _name(self, suffix: str) -> str:
        mode = _mode(self.runtime, self.mode_id)
        return f"{mode['name']} {suffix}" if mode else f"Mode {suffix}"

    @property
    def native_value(self) -> str:
        return (_mode(self.runtime, self.mode_id) or {}).get("icon", "")

    @property
    def available(self) -> bool:
        return super().available and _mode(self.runtime, self.mode_id) is not None

    async def async_set_value(self, value: str) -> None:
        await self.runtime.async_set_mode_setting(self.mode_id, "icon", value)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"mode_id": self.mode_id}


class ModeColorText(PlannerEntity, TextEntity):
    """Edit a mode's optional hexadecimal color."""

    _attr_icon = "mdi:palette-outline"
    _attr_native_max = 7

    def __init__(self, runtime: PlannerRuntime, entry_id: str, mode_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_mode_{mode_id}_color")
        self.mode_id = mode_id
        self._attr_name = self._name("color")

    def _name(self, suffix: str) -> str:
        mode = _mode(self.runtime, self.mode_id)
        return f"{mode['name']} {suffix}" if mode else f"Mode {suffix}"

    @property
    def native_value(self) -> str:
        return (_mode(self.runtime, self.mode_id) or {}).get("color", "")

    @property
    def available(self) -> bool:
        return super().available and _mode(self.runtime, self.mode_id) is not None

    async def async_set_value(self, value: str) -> None:
        await self.runtime.async_set_mode_setting(self.mode_id, "color", value)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"mode_id": self.mode_id}


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities) -> None:
    """Create editable text settings."""

    runtime: PlannerRuntime = entry.runtime_data
    manager = PlannerEntityManager(hass, runtime, entry.entry_id, "text", async_add_entities)
    hass.data.setdefault(DOMAIN, {}).setdefault("entity_managers", {})[(entry.entry_id, "text")] = (
        manager
    )
    await manager.async_setup()


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload text entities with the config entry."""

    manager = (
        hass.data.get(DOMAIN, {}).get("entity_managers", {}).pop((entry.entry_id, "text"), None)
    )
    if manager:
        await manager.async_shutdown()
    return True
