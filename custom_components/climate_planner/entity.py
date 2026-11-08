"""Shared entities and dynamic platform entity management."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.core import Event, HomeAssistant
from homeassistant.helpers.entity import Entity

from .const import DOMAIN, EVENT_UPDATED
from .runtime import PlannerRuntime


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
        if self.platform == "switch":
            from .switch import AssignmentEnabledSwitch, ScheduleEnabledSwitch

            for schedule in self.runtime.data["schedules"]:
                entity = ScheduleEnabledSwitch(self.runtime, self.entry_id, schedule["id"])
                if entity.unique_id not in self._known:
                    self._known.add(entity.unique_id)
                    entities.append(entity)
                for assignment in schedule["assignments"]:
                    entity = AssignmentEnabledSwitch(
                        self.runtime, self.entry_id, schedule["id"], assignment["id"]
                    )
                    if entity.unique_id not in self._known:
                        self._known.add(entity.unique_id)
                        entities.append(entity)
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
                    if entity.unique_id not in self._known:
                        self._known.add(entity.unique_id)
                        entities.append(entity)
                for assignment in schedule["assignments"]:
                    entity = ActivateAssignmentButton(
                        self.runtime, self.entry_id, schedule["id"], assignment["id"]
                    )
                    if entity.unique_id not in self._known:
                        self._known.add(entity.unique_id)
                        entities.append(entity)
        if entities:
            self.async_add_entities(entities)
