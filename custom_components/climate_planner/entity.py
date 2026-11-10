"""Shared entities and dynamic platform entity management."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from homeassistant.core import Event, HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity import Entity

from .const import DOMAIN, EVENT_UPDATED
from .runtime import PlannerRuntime

_LOGGER = logging.getLogger(__name__)


class PlannerEntity(Entity):
    """Base entity backed by the persistent planner runtime."""

    _attr_should_poll = False

    def __init__(self, runtime: PlannerRuntime, entry_id: str, unique_id: str) -> None:
        self.runtime = runtime
        self._entry_id = entry_id
        self._attr_unique_id = unique_id

    @property
    def device_info(self) -> dict[str, Any]:
        schedule_id = getattr(self, "schedule_id", None)
        schedule = self._schedule(schedule_id) if schedule_id else None
        if schedule_id:
            return {
                "identifiers": {(DOMAIN, f"{self._entry_id}_{schedule_id}")},
                "name": schedule["name"] if schedule else "Heating plan",
                "manufacturer": "Climate Planner",
                "model": "Heating plan",
            }
        return {
            "identifiers": {(DOMAIN, self._entry_id)},
            "name": "Climate Planner",
            "manufacturer": "Climate Planner",
            "model": "Heating planner",
        }

    @property
    def available(self) -> bool:
        return (
            self.runtime._started
            and self.runtime.hass.data.get(DOMAIN, {}).get("runtime") is self.runtime
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.hass.bus.async_listen(EVENT_UPDATED, self._async_handle_update))

    async def _async_handle_update(self, event: Event) -> None:
        if event.data.get("entry_id") == self._entry_id:
            self.async_write_ha_state()

    def _schedule(self, schedule_id: str) -> dict[str, Any] | None:
        return next(
            (item for item in self.runtime.data["schedules"] if item["id"] == schedule_id),
            None,
        )

    def _assignment(
        self, schedule_id: str, assignment_id: str
    ) -> tuple[dict[str, Any], dict[str, Any]] | None:
        schedule = self._schedule(schedule_id)
        if schedule is None:
            return None
        assignment = next(
            (item for item in schedule["assignments"] if item["id"] == assignment_id),
            None,
        )
        if assignment is None:
            return None
        mode = next(
            (item for item in self.runtime.data["modes"] if item["id"] == assignment["mode_id"]),
            None,
        )
        if mode is None:
            return None
        return assignment, mode

    def _assignment_label(self, schedule_id: str, assignment_id: str, suffix: str) -> str:
        """Build a concise entity name, disambiguating duplicate assignments."""

        details = self._assignment(schedule_id, assignment_id)
        if details is None:
            return suffix
        schedule = self._schedule(schedule_id)
        matching = (
            [item for item in schedule["assignments"] if item["mode_id"] == details[0]["mode_id"]]
            if schedule
            else []
        )
        label = details[1]["name"]
        if len(matching) > 1:
            label = f"{label} {matching.index(details[0]) + 1}"
        return f"{label} {suffix}"


class PlannerEntityManager:
    """Create entities for newly added schedules and assignments at runtime."""

    def __init__(
        self,
        hass: HomeAssistant,
        runtime: PlannerRuntime,
        entry_id: str,
        platform: str,
        async_add_entities: Callable[[list[Entity]], None],
    ) -> None:
        self.hass = hass
        self.runtime = runtime
        self.entry_id = entry_id
        self.platform = platform
        self.async_add_entities = async_add_entities
        self._known: set[str] = set()
        self._entities: dict[str, Entity] = {}
        self._unsub = None

    async def async_setup(self) -> None:
        self._unsub = self.hass.bus.async_listen(EVENT_UPDATED, self._async_handle_update)
        await self._async_refresh()

    async def async_shutdown(self) -> None:
        if self._unsub:
            self._unsub()
            self._unsub = None

    async def _async_handle_update(self, event: Event) -> None:
        if event.data.get("entry_id") == self.entry_id:
            await self._async_refresh()

    async def _async_refresh(self) -> None:
        entities: list[Entity] = []
        desired_unique_ids: set[str] = set()

        def register(entity: Entity) -> None:
            desired_unique_ids.add(entity.unique_id)
            if entity.unique_id in self._known:
                return
            self._known.add(entity.unique_id)
            self._entities[entity.unique_id] = entity
            entities.append(entity)

        if self.platform == "switch":
            from .switch import AssignmentEnabledSwitch, ScheduleEnabledSwitch

            for schedule in self.runtime.data["schedules"]:
                entity = ScheduleEnabledSwitch(self.runtime, self.entry_id, schedule["id"])
                register(entity)
                for assignment in schedule["assignments"]:
                    entity = AssignmentEnabledSwitch(
                        self.runtime, self.entry_id, schedule["id"], assignment["id"]
                    )
                    register(entity)
        elif self.platform == "button":
            from .button import ActivateAssignmentButton, ApplyMatchingButton

            for schedule in self.runtime.data["schedules"]:
                for action in (
                    "apply_matched",
                    "apply_enabled_matching",
                    "apply_enabled_mode_matching",
                ):
                    entity = ApplyMatchingButton(
                        self.runtime, self.entry_id, schedule["id"], action
                    )
                    register(entity)
                for assignment in schedule["assignments"]:
                    entity = ActivateAssignmentButton(
                        self.runtime, self.entry_id, schedule["id"], assignment["id"]
                    )
                    register(entity)
        await self._async_remove_stale(desired_unique_ids)
        if entities:
            self.async_add_entities(entities)

    def _is_managed_unique_id(self, unique_id: str) -> bool:
        """Return whether a unique ID belongs to a schedule entity we own."""

        return unique_id.startswith(f"{self.entry_id}_schedule_")

    def _is_managed_device(self, device) -> bool:
        """Return whether a device is one of this entry's schedule devices."""

        prefix = f"{self.entry_id}_"
        return any(
            domain == DOMAIN and identifier.startswith(prefix)
            for domain, identifier in device.identifiers
        )

    async def _async_remove_stale(self, desired_unique_ids: set[str]) -> None:
        """Remove entities and devices whose schedules no longer exist."""

        stale_unique_ids = self._known - desired_unique_ids
        for unique_id in stale_unique_ids:
            entity = self._entities.pop(unique_id, None)
            self._known.remove(unique_id)
            if entity is None or getattr(entity, "hass", None) is None:
                continue
            try:
                await entity.async_remove(force_remove=True)
            except Exception:  # noqa: BLE001
                # Registry cleanup below still prevents stale entries from
                # being restored on the next Home Assistant restart.
                _LOGGER.exception("Could not remove stale Climate Planner entity")

        entity_registry = er.async_get(self.hass)
        for entry in entity_registry.entities.get_entries_for_config_entry_id(self.entry_id):
            if (
                entry.domain == self.platform
                and entry.platform == DOMAIN
                and self._is_managed_unique_id(entry.unique_id)
                and entry.unique_id not in desired_unique_ids
            ):
                entity_registry.async_remove(entry.entity_id)

        device_registry = dr.async_get(self.hass)
        for device in device_registry.devices.get_devices_for_config_entry_id(self.entry_id):
            if not self._is_managed_device(device):
                continue
            if entity_registry.entities.get_entries_for_device_id(
                device.id, include_disabled_entities=True
            ):
                continue
            device_registry.async_remove_device(device.id)
