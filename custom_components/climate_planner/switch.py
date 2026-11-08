"""Switch entities for heating plans and per-plan mode assignments."""

from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .entity import PlannerEntity, PlannerEntityManager
from .runtime import PlannerRuntime


class ScheduleEnabledSwitch(PlannerEntity, SwitchEntity):
    """Enable or pause automatic evaluation of one heating plan."""

    _attr_icon = "mdi:calendar-check"

    def __init__(self, runtime: PlannerRuntime, entry_id: str, schedule_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_schedule_{schedule_id}_enabled")
        self.schedule_id = schedule_id
        self._attr_name = "Automatic"

    @property
    def is_on(self) -> bool:
        schedule = self._schedule(self.schedule_id)
        return bool(schedule and schedule["enabled"])

    @property
    def available(self) -> bool:
        return super().available and self._schedule(self.schedule_id) is not None

    async def async_turn_on(self, **kwargs) -> None:
        await self.runtime.async_set_schedule_enabled(self.schedule_id, True)

    async def async_turn_off(self, **kwargs) -> None:
        await self.runtime.async_set_schedule_enabled(self.schedule_id, False)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"schedule_id": self.schedule_id}


class AssignmentEnabledSwitch(PlannerEntity, SwitchEntity):
    """Enable or pause one specific mode assignment in one heating plan."""

    _attr_icon = "mdi:thermostat-auto"

    def __init__(
        self, runtime: PlannerRuntime, entry_id: str, schedule_id: str, assignment_id: str
    ) -> None:
        super().__init__(
            runtime,
            entry_id,
            f"{entry_id}_schedule_{schedule_id}_assignment_{assignment_id}_enabled",
        )
        self.schedule_id = schedule_id
        self.assignment_id = assignment_id
        self._attr_name = self._assignment_label(schedule_id, assignment_id, "automatic")

    @property
    def is_on(self) -> bool:
        details = self._assignment(self.schedule_id, self.assignment_id)
        return bool(details and details[0]["enabled"])

    @property
    def available(self) -> bool:
        return (
            super().available and self._assignment(self.schedule_id, self.assignment_id) is not None
        )

    async def async_turn_on(self, **kwargs) -> None:
        await self.runtime.async_set_assignment_enabled(self.schedule_id, self.assignment_id, True)

    async def async_turn_off(self, **kwargs) -> None:
        await self.runtime.async_set_assignment_enabled(self.schedule_id, self.assignment_id, False)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        details = self._assignment(self.schedule_id, self.assignment_id)
        return {
            "schedule_id": self.schedule_id,
            "assignment_id": self.assignment_id,
            "mode_id": details[0]["mode_id"] if details else "",
        }


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities) -> None:
    runtime: PlannerRuntime = entry.runtime_data
    manager = PlannerEntityManager(hass, runtime, entry.entry_id, "switch", async_add_entities)
    hass.data[DOMAIN].setdefault("entity_managers", {})[(entry.entry_id, "switch")] = manager
    await manager.async_setup()


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    manager = (
        hass.data.get(DOMAIN, {}).get("entity_managers", {}).pop((entry.entry_id, "switch"), None)
    )
    if manager:
        await manager.async_shutdown()
    return True
