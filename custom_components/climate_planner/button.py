"""Button entities for mode activation and explicit matching actions."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    DOMAIN,
    SERVICE_APPLY_ENABLED_MATCHING,
    SERVICE_APPLY_ENABLED_MODE_MATCHING,
    SERVICE_APPLY_MATCHED,
)
from .entity import PlannerEntity, PlannerEntityManager
from .runtime import PlannerRuntime


class ActivateAssignmentButton(PlannerEntity, ButtonEntity):
    """Temporarily activate one exact mode assignment."""

    _attr_icon = "mdi:play-circle-outline"

    def __init__(
        self, runtime: PlannerRuntime, entry_id: str, schedule_id: str, assignment_id: str
    ) -> None:
        super().__init__(
            runtime,
            entry_id,
            f"{entry_id}_schedule_{schedule_id}_assignment_{assignment_id}_activate",
        )
        self.schedule_id = schedule_id
        self.assignment_id = assignment_id
        self._attr_name = self._assignment_label(schedule_id, assignment_id, "activate")

    async def async_press(self) -> None:
        details = self._assignment(self.schedule_id, self.assignment_id)
        if details:
            await self.runtime.async_activate_mode(
                self.schedule_id, details[0]["mode_id"], self.assignment_id
            )

    @property
    def available(self) -> bool:
        return (
            super().available and self._assignment(self.schedule_id, self.assignment_id) is not None
        )

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        details = self._assignment(self.schedule_id, self.assignment_id)
        return {
            "schedule_id": self.schedule_id,
            "assignment_id": self.assignment_id,
            "mode_id": details[0]["mode_id"] if details else "",
        }


class ApplyMatchingButton(PlannerEntity, ButtonEntity):
    """Explicitly apply one of the ioBroker-compatible match actions."""

    _attr_icon = "mdi:playlist-play"

    _labels = {
        SERVICE_APPLY_MATCHED: "Apply matched",
        SERVICE_APPLY_ENABLED_MATCHING: "Apply enabled matching",
        SERVICE_APPLY_ENABLED_MODE_MATCHING: "Apply enabled mode matching",
    }

    def __init__(
        self, runtime: PlannerRuntime, entry_id: str, schedule_id: str, action: str
    ) -> None:
        super().__init__(
            runtime,
            entry_id,
            f"{entry_id}_schedule_{schedule_id}_{action}",
        )
        self.schedule_id = schedule_id
        self.action = action
        label = self._labels[action]
        self._attr_name = label
        self._last_applied_count = 0

    async def async_press(self) -> None:
        self._last_applied_count = await self.runtime.async_apply_matching(
            self.action, self.schedule_id
        )
        if getattr(self, "hass", None) is not None:
            self.async_write_ha_state()

    @property
    def available(self) -> bool:
        return super().available and self._schedule(self.schedule_id) is not None

    @property
    def extra_state_attributes(self) -> dict[str, str | int]:
        return {
            "schedule_id": self.schedule_id,
            "action": self.action,
            "last_applied_count": self._last_applied_count,
        }


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities) -> None:
    runtime: PlannerRuntime = entry.runtime_data
    manager = PlannerEntityManager(hass, runtime, entry.entry_id, "button", async_add_entities)
    hass.data[DOMAIN].setdefault("entity_managers", {})[(entry.entry_id, "button")] = manager
    await manager.async_setup()


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    manager = (
        hass.data.get(DOMAIN, {}).get("entity_managers", {}).pop((entry.entry_id, "button"), None)
    )
    if manager:
        await manager.async_shutdown()
    return True
