"""Persistent planner runtime and one-shot climate service application."""

from __future__ import annotations

import asyncio
import logging
from copy import deepcopy
from datetime import datetime
from typing import Any

from homeassistant.components.climate import DOMAIN as CLIMATE_DOMAIN
from homeassistant.const import (
    ATTR_ENTITY_ID,
    ATTR_FRIENDLY_NAME,
    ATTR_TEMPERATURE,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
    UnitOfTemperature,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.helpers.storage import Store
from homeassistant.loader import async_get_integrations
from homeassistant.util import dt as dt_util
from homeassistant.util.unit_conversion import TemperatureConverter

from .const import (
    EVENT_UPDATED,
    RUNTIME_STORAGE_KEY,
    SERVICE_APPLY_ENABLED_MATCHING,
    SERVICE_APPLY_ENABLED_MODE_MATCHING,
    SERVICE_APPLY_MATCHED,
    SERVICE_SET_TEMPERATURE,
    STORAGE_KEY,
    STORAGE_VERSION,
)
from .engine import (
    ActiveMatch,
    latest_auto_date_event,
    next_activation,
    next_auto_date,
    select_active_mode,
    week_view,
)
from .models import (
    InvalidData,
    RevisionConflict,
    clone_planner,
    empty_planner,
    migrate_storage,
    validate_planner,
)

_LOGGER = logging.getLogger(__name__)


class PlannerRuntime:
    """Own the authoritative planner document and its scheduled evaluation."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, STORAGE_KEY, atomic_writes=True
        )
        self.runtime_store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, RUNTIME_STORAGE_KEY, atomic_writes=True
        )
        self.data: dict[str, Any] = empty_planner()
        self.active: dict[str, ActiveMatch | None] = {}
        self._manual_overrides: dict[str, dict[str, Any]] = {}
        self._auto_date_actions: dict[str, str] = {}
        self._applied: dict[str, tuple[str, float, tuple[str, ...]] | None] = {}
        self._last_activated: dict[str, dict[str, Any]] = {}
        self._timer_unsub = None
        self._data_lock = asyncio.Lock()
        self._evaluation_lock = asyncio.Lock()
        self._started = False

    def _now(self):
        """Return current time in Home Assistant's configured local zone."""

        zone = dt_util.get_time_zone(self.hass.config.time_zone)
        return dt_util.now(zone) if zone else dt_util.now()

    async def async_start(self) -> None:
        raw = await self.store.async_load()
        self.data = migrate_storage(raw)
        if raw is None or self.data != raw:
            await self.store.async_save(self.data)
        await self._async_restore_runtime_state()
        self._started = True
        await self.async_evaluate()

    async def async_shutdown(self) -> None:
        self._started = False
        self._manual_overrides.clear()
        self._auto_date_actions.clear()
        self._last_activated.clear()
        self._clear_timer()

    def _assignment_for_mode(
        self,
        schedule: dict,
        mode_id: str,
        *,
        assignment_id: str | None = None,
        require_enabled: bool = True,
    ) -> dict | None:
        """Return the first matching assignment, optionally requiring automatic use."""

        return next(
            (
                assignment
                for assignment in schedule["assignments"]
                if assignment["mode_id"] == mode_id
                and (assignment_id is None or assignment["id"] == assignment_id)
                and (assignment["enabled"] or not require_enabled)
            ),
            None,
        )

    async def _async_restore_runtime_state(self) -> None:
        """Restore validated last-activation records without changing planner data."""

        raw = await self.runtime_store.async_load()
        self._auto_date_actions = {}
        assignment_ids = {
            assignment["id"]
            for schedule in self.data["schedules"]
            for assignment in schedule["assignments"]
        }
        raw_auto_date_actions = raw.get("auto_date_actions") if isinstance(raw, dict) else None
        if isinstance(raw_auto_date_actions, dict):
            self._auto_date_actions = {
                assignment_id: marker
                for assignment_id, marker in raw_auto_date_actions.items()
                if assignment_id in assignment_ids and isinstance(marker, str)
            }
        records = raw.get("last_activated") if isinstance(raw, dict) else None
        if not isinstance(records, dict):
            self._last_activated = {}
            return
        schedules = {schedule["id"]: schedule for schedule in self.data["schedules"]}
        modes = {mode["id"]: mode for mode in self.data["modes"]}
        restored: dict[str, dict[str, Any]] = {}
        for schedule_id, record in records.items():
            if not isinstance(schedule_id, str) or not isinstance(record, dict):
                continue
            schedule = schedules.get(schedule_id)
            mode_id = record.get("mode_id")
            assignment_id = record.get("assignment_id")
            activated_at = record.get("activated_at")
            target_temperature = record.get("target_temperature")
            assignment = (
                next(
                    (
                        item
                        for item in schedule["assignments"]
                        if item["id"] == assignment_id and item["mode_id"] == mode_id
                    ),
                    None,
                )
                if schedule
                else None
            )
            if (
                assignment is None
                or mode_id not in modes
                or not isinstance(activated_at, str)
                or dt_util.parse_datetime(activated_at) is None
                or isinstance(target_temperature, bool)
                or not isinstance(target_temperature, (int, float))
            ):
                continue
            phase_id = record.get("phase_id")
            restored[schedule_id] = {
                "mode_id": mode_id,
                "mode_name": modes[mode_id]["name"],
                "assignment_id": assignment_id,
                "phase_id": phase_id if isinstance(phase_id, str) else None,
                "target_temperature": float(target_temperature),
                "activated_at": activated_at,
            }
        self._last_activated = restored

    async def _async_save_runtime_state(self) -> None:
        """Persist the small runtime record separately from planner configuration."""

        await self.runtime_store.async_save(
            {
                "last_activated": deepcopy(self._last_activated),
                "auto_date_actions": deepcopy(self._auto_date_actions),
            }
        )

    def _temperature_to_celsius(self, value: Any, source_unit: UnitOfTemperature) -> float | None:
        """Normalize a climate state temperature for the panel data contract."""

        if value is None:
            return None
        try:
            return round(
                float(
                    TemperatureConverter.convert(
                        float(value), source_unit, UnitOfTemperature.CELSIUS
                    )
                ),
                1,
            )
        except (TypeError, ValueError):
            return None

    def _manual_match(
        self, schedule: dict, modes: list[dict], override: dict[str, Any], now: datetime
    ) -> ActiveMatch | None:
        """Build an active match for a temporary manual mode selection."""

        mode = next((item for item in modes if item["id"] == override["mode_id"]), None)
        assignment = self._assignment_for_mode(
            schedule,
            override["mode_id"],
            assignment_id=override.get("assignment_id"),
            require_enabled=False,
        )
        if mode is None or assignment is None:
            return None
        phase = {"id": "manual_override", "time": now.strftime("%H:%M")}
        if override.get("target_temperature") is not None:
            phase["target_temperature"] = override["target_temperature"]
        return ActiveMatch(
            mode=mode,
            assignment=assignment,
            phase=phase,
            occurrence=override["activated_at"],
        )

    async def snapshot(self) -> dict[str, Any]:
        """Return data safe to send to the panel."""

        now = self._now()
        modes = deepcopy(self.data["modes"])
        schedules = deepcopy(self.data["schedules"])
        active: dict[str, dict | None] = {}
        next_events: dict[str, str | None] = {}
        weeks: dict[str, dict] = {}
        for schedule in schedules:
            match = self.active.get(schedule["id"])
            override = self._manual_overrides.get(schedule["id"])
            active[schedule["id"]] = (
                {
                    "mode_id": match.mode["id"],
                    "mode_name": match.mode["name"],
                    "target_temperature": (
                        match.phase.get("target_temperature", match.mode["target_temperature"])
                        if isinstance(match.phase, dict)
                        else match.mode["target_temperature"]
                    ),
                    "assignment_id": match.assignment["id"],
                    "phase_id": match.phase.get("id") if isinstance(match.phase, dict) else None,
                    "occurrence": match.occurrence.isoformat(),
                    "manual": bool(override),
                    "override_until": (
                        override["until"].isoformat()
                        if override and override.get("until")
                        else None
                    ),
                }
                if match
                else None
            )
            upcoming_points = []
            automatic_date = next_auto_date(schedule, now)
            if automatic_date:
                upcoming_points.append(automatic_date)
            if schedule["enabled"]:
                upcoming = next_activation(schedule, modes, now)
                if upcoming:
                    upcoming_points.append(upcoming)
            next_event = min(upcoming_points) if upcoming_points else None
            next_events[schedule["id"]] = next_event.isoformat() if next_event else None
            weeks[schedule["id"]] = week_view(schedule, modes, now)
        climate_entities = await self._async_climate_entities()
        return {
            **clone_planner(self.data),
            "active": active,
            "last_activated": deepcopy(self._last_activated),
            "next_events": next_events,
            "week_views": weeks,
            "timezone": self.hass.config.time_zone,
            "ready": self._started,
            "climate_entities": climate_entities,
        }

    async def async_activate_mode(
        self, schedule_id: str, mode_id: str, assignment_id: str | None = None
    ) -> None:
        """Temporarily activate an assigned mode until the next schedule event."""

        async with self._data_lock:
            schedule = next(
                (item for item in self.data["schedules"] if item["id"] == schedule_id),
                None,
            )
            if schedule is None:
                raise InvalidData("unknown_schedule")
            mode = next((item for item in self.data["modes"] if item["id"] == mode_id), None)
            assignment = self._assignment_for_mode(
                schedule,
                mode_id,
                assignment_id=assignment_id,
                require_enabled=False,
            )
            if mode is None or assignment is None:
                raise InvalidData("unknown_mode_reference")
            now = self._now()
            until = next_activation(schedule, self.data["modes"], now)
            self._manual_overrides[schedule_id] = {
                "mode_id": mode_id,
                "assignment_id": assignment["id"],
                "activated_at": now,
                "until": until,
            }
            # An explicit activation must reassert the mode even when its
            # mode/temperature tuple matches the previous automatic result.
            self._applied[schedule_id] = None
        await self.async_evaluate()

    async def async_set_schedule_enabled(self, schedule_id: str, enabled: bool) -> None:
        """Persist the automatic enable state of one heating plan."""

        async with self._data_lock:
            candidate = deepcopy(self.data)
            schedule = next(
                (item for item in candidate["schedules"] if item["id"] == schedule_id), None
            )
            if schedule is None:
                raise InvalidData("unknown_schedule")
            reactivated = enabled and not schedule["enabled"]
            schedule["enabled"] = enabled
            normalized = validate_planner(candidate)
            normalized["revision"] = self.data["revision"] + 1
            await self.store.async_save(normalized)
            self.data = normalized
            if reactivated:
                self._manual_overrides.pop(schedule_id, None)
                self._applied[schedule_id] = None
        await self.async_evaluate()

    async def async_set_assignment_enabled(
        self, schedule_id: str, assignment_id: str, enabled: bool
    ) -> None:
        """Persist the automatic enable state of one plan/mode assignment."""

        async with self._data_lock:
            candidate = deepcopy(self.data)
            schedule = next(
                (item for item in candidate["schedules"] if item["id"] == schedule_id), None
            )
            if schedule is None:
                raise InvalidData("unknown_schedule")
            assignment = next(
                (item for item in schedule["assignments"] if item["id"] == assignment_id),
                None,
            )
            if assignment is None:
                raise InvalidData("unknown_assignment")
            assignment["enabled"] = enabled
            normalized = validate_planner(candidate)
            normalized["revision"] = self.data["revision"] + 1
            await self.store.async_save(normalized)
            self.data = normalized
        await self.async_evaluate()

    async def async_apply_matching(self, action: str, schedule_id: str | None = None) -> int:
        """Explicitly apply the currently matching configured mode.

        The three actions mirror the ioBroker adapter semantics:
        ``apply_matched`` ignores all enable switches, ``apply_enabled_matching``
        requires the schedule and per-plan mode assignment to be enabled, and
        ``apply_enabled_mode_matching`` ignores only the schedule switch.
        """

        if action not in {
            SERVICE_APPLY_MATCHED,
            SERVICE_APPLY_ENABLED_MATCHING,
            SERVICE_APPLY_ENABLED_MODE_MATCHING,
        }:
            raise InvalidData("invalid_apply_action")
        if schedule_id is not None and not any(
            schedule["id"] == schedule_id for schedule in self.data["schedules"]
        ):
            raise InvalidData("unknown_schedule")
        flags = {
            SERVICE_APPLY_MATCHED: (False, False),
            SERVICE_APPLY_ENABLED_MATCHING: (True, True),
            SERVICE_APPLY_ENABLED_MODE_MATCHING: (False, True),
        }[action]
        applied = 0
        changed = False
        async with self._evaluation_lock:
            now = self._now()
            for schedule in self.data["schedules"]:
                if schedule_id is not None and schedule["id"] != schedule_id:
                    continue
                match = select_active_mode(
                    schedule,
                    self.data["modes"],
                    now,
                    respect_schedule_enabled=flags[0],
                    respect_assignment_enabled=flags[1],
                )
                if match:
                    target_temperature = (
                        match.phase.get("target_temperature", match.mode["target_temperature"])
                        if isinstance(match.phase, dict)
                        else match.mode["target_temperature"]
                    )
                    self._manual_overrides[schedule["id"]] = {
                        "mode_id": match.mode["id"],
                        "assignment_id": match.assignment["id"],
                        "activated_at": now,
                        "until": next_activation(schedule, self.data["modes"], now),
                        "target_temperature": float(target_temperature),
                    }
                    self.active[schedule["id"]] = match
                    if await self._apply_temperature(schedule, match):
                        applied += 1
                        self._applied[schedule["id"]] = (
                            match.mode["id"],
                            float(target_temperature),
                            tuple(schedule["climate_entity_ids"]),
                        )
                    else:
                        self._applied[schedule["id"]] = None
                    changed = True
        if changed:
            self.hass.bus.async_fire(EVENT_UPDATED, {"entry_id": self.entry_id})
        _LOGGER.debug(
            "Climate Planner apply action %s applied %d heating plan(s)%s",
            action,
            applied,
            f" for {schedule_id}" if schedule_id else "",
        )
        return applied

    async def async_clear_manual_override(self, schedule_id: str) -> None:
        """Return a heating plan to its automatic schedule immediately."""

        async with self._data_lock:
            if not any(item["id"] == schedule_id for item in self.data["schedules"]):
                raise InvalidData("unknown_schedule")
            self._manual_overrides.pop(schedule_id, None)
        await self.async_evaluate()

    async def _async_climate_entities(self) -> list[dict[str, Any]]:
        """Return climate entities with integration, area, and device display names."""

        states = self.hass.states.async_all("climate")
        entity_registry = er.async_get(self.hass)
        device_registry = dr.async_get(self.hass)
        area_registry = ar.async_get(self.hass)
        registry_entries = {
            state.entity_id: entity_registry.async_get(state.entity_id) for state in states
        }
        platforms = {entry.platform for entry in registry_entries.values() if entry is not None}
        integrations = {}
        if platforms:
            try:
                integrations = await async_get_integrations(self.hass, platforms)
            except Exception:  # noqa: BLE001
                _LOGGER.debug("Could not load climate integration display names", exc_info=True)
        integration_names = {
            domain: (
                getattr(integration, "manifest", {}).get("name") or domain
                if not isinstance(integration, Exception)
                else domain
            )
            for domain, integration in integrations.items()
        }
        temperature_unit = getattr(
            getattr(self.hass.config, "units", None),
            "temperature_unit",
            UnitOfTemperature.CELSIUS,
        )
        result: list[dict[str, Any]] = []
        for state in states:
            entry = registry_entries[state.entity_id]
            platform = entry.platform if entry else ""
            integration_name = integration_names.get(platform, platform)
            device = (
                device_registry.async_get(entry.device_id) if entry and entry.device_id else None
            )
            device_name = (device.name_by_user or device.name) if device else ""
            area_id = getattr(entry, "area_id", None) or getattr(device, "area_id", None)
            area = area_registry.async_get_area(area_id) if area_id else None
            area_name = area.name if area else ""
            entity_name = (
                state.attributes.get(ATTR_FRIENDLY_NAME)
                or (entry.name if entry else None)
                or state.entity_id
            )
            label_candidates = [integration_name, device_name]
            if device_name and entity_name.casefold().startswith(device_name.casefold()):
                suffix = entity_name[len(device_name) :].strip(" ·-_")
                label_candidates.append(suffix)
            else:
                label_candidates.append(entity_name)
            label_parts = []
            seen_parts = set()
            for value in label_candidates:
                normalized = value.strip()
                key = normalized.casefold()
                if normalized and key not in seen_parts:
                    label_parts.append(normalized)
                    seen_parts.add(key)
            label = " · ".join(label_parts) or state.entity_id
            result.append(
                {
                    "entity_id": state.entity_id,
                    "label": label,
                    "name": entity_name,
                    "device_name": device_name,
                    "area_name": area_name,
                    "integration": integration_name,
                    "current_temperature": self._temperature_to_celsius(
                        state.attributes.get("current_temperature"), temperature_unit
                    ),
                    "target_temperature": self._temperature_to_celsius(
                        state.attributes.get(ATTR_TEMPERATURE), temperature_unit
                    ),
                }
            )
        return sorted(result, key=lambda item: (item["label"].casefold(), item["entity_id"]))

    async def async_replace(self, candidate: dict, expected_revision: int) -> int:
        """Validate and atomically replace the planner document."""

        async with self._data_lock:
            if expected_revision != self.data["revision"]:
                raise RevisionConflict()
            previous_enabled = {
                schedule["id"]: schedule["enabled"] for schedule in self.data["schedules"]
            }
            normalized = validate_planner(candidate)
            normalized["revision"] = self.data["revision"] + 1
            await self.store.async_save(normalized)
            self.data = normalized
            for schedule in normalized["schedules"]:
                if schedule["enabled"] and previous_enabled.get(schedule["id"]) is False:
                    self._manual_overrides.pop(schedule["id"], None)
                    self._applied[schedule["id"]] = None
        await self.async_evaluate()
        return self.data["revision"]

    def _clear_timer(self) -> None:
        if self._timer_unsub:
            self._timer_unsub()
            self._timer_unsub = None

    async def _async_apply_due_auto_dates(self, now: datetime) -> None:
        """Apply each reached assignment auto-date event once."""

        candidate = deepcopy(self.data)
        next_auto_date_actions = dict(self._auto_date_actions)
        assignment_ids: set[str] = set()
        configuration_changed = False
        runtime_state_changed = False
        current_date = now.date()
        for schedule in candidate["schedules"]:
            for assignment in schedule["assignments"]:
                assignment_id = assignment["id"]
                assignment_ids.add(assignment_id)
                event = latest_auto_date_event(assignment, current_date)
                if event is None:
                    if assignment_id in next_auto_date_actions:
                        del next_auto_date_actions[assignment_id]
                        runtime_state_changed = True
                    continue
                marker, enabled = event
                if next_auto_date_actions.get(assignment_id) == marker:
                    continue
                next_auto_date_actions[assignment_id] = marker
                runtime_state_changed = True
                if assignment["enabled"] != enabled:
                    assignment["enabled"] = enabled
                    configuration_changed = True
        for assignment_id in set(next_auto_date_actions) - assignment_ids:
            del next_auto_date_actions[assignment_id]
            runtime_state_changed = True

        if configuration_changed:
            normalized = validate_planner(candidate)
            normalized["revision"] = self.data["revision"] + 1
            await self.store.async_save(normalized)
            self.data = normalized
        if runtime_state_changed:
            self._auto_date_actions = next_auto_date_actions
            try:
                await self._async_save_runtime_state()
            except Exception:  # noqa: BLE001
                _LOGGER.warning(
                    "Climate Planner could not persist automatic mode-date state",
                    exc_info=True,
                )

    async def async_evaluate(self) -> None:
        """Apply only transitions and schedule the next relevant point."""

        async with self._evaluation_lock:
            if not self._started:
                return
            now = self._now()
            await self._async_apply_due_auto_dates(now)
            modes = self.data["modes"]
            self.active = {}
            next_points = []
            for schedule in self.data["schedules"]:
                override = self._manual_overrides.get(schedule["id"])
                if override and override.get("until") and now >= override["until"]:
                    self._manual_overrides.pop(schedule["id"], None)
                    override = None
                match = (
                    self._manual_match(schedule, modes, override, now)
                    if override
                    else select_active_mode(schedule, modes, now)
                )
                if override and match is None:
                    self._manual_overrides.pop(schedule["id"], None)
                    match = select_active_mode(schedule, modes, now)
                self.active[schedule["id"]] = match
                automatic_date = next_auto_date(schedule, now)
                if automatic_date:
                    next_points.append(automatic_date)
                if schedule["enabled"]:
                    upcoming = next_activation(schedule, modes, now)
                    if upcoming:
                        next_points.append(upcoming)
                desired = None
                if match and (schedule["enabled"] or override):
                    target_temperature = (
                        match.phase.get("target_temperature", match.mode["target_temperature"])
                        if isinstance(match.phase, dict)
                        else match.mode["target_temperature"]
                    )
                    desired = (
                        match.mode["id"],
                        float(target_temperature),
                        tuple(schedule["climate_entity_ids"]),
                    )
                if desired != self._applied.get(schedule["id"]):
                    if desired:
                        await self._apply_temperature(schedule, match)
                    self._applied[schedule["id"]] = desired
            configured_ids = {schedule["id"] for schedule in self.data["schedules"]}
            for schedule_id in set(self._applied) - configured_ids:
                self._applied.pop(schedule_id, None)
            configured_schedules = {schedule["id"]: schedule for schedule in self.data["schedules"]}
            runtime_state_changed = False
            for schedule_id, activated in list(self._last_activated.items()):
                schedule = configured_schedules.get(schedule_id)
                if schedule is None or not any(
                    assignment["id"] == activated["assignment_id"]
                    and assignment["mode_id"] == activated["mode_id"]
                    for assignment in schedule["assignments"]
                ):
                    self._last_activated.pop(schedule_id, None)
                    runtime_state_changed = True
            if runtime_state_changed:
                try:
                    await self._async_save_runtime_state()
                except Exception:  # noqa: BLE001
                    _LOGGER.warning(
                        "Climate Planner could not persist cleaned runtime state", exc_info=True
                    )
            self._clear_timer()
            if next_points and self._started:
                next_point = min(next_points)
                self._timer_unsub = async_track_point_in_time(
                    self.hass, self._async_timer_fired, next_point
                )
            self.hass.bus.async_fire(EVENT_UPDATED, {"entry_id": self.entry_id})

    async def _async_timer_fired(self, _when: datetime) -> None:
        self._timer_unsub = None
        await self.async_evaluate()

    async def _apply_temperature(self, schedule: dict, match: ActiveMatch) -> bool:
        entity_ids = schedule["climate_entity_ids"]
        available_entity_ids = [
            entity_id
            for entity_id in entity_ids
            if (state := self.hass.states.get(entity_id)) is not None
            and state.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE)
        ]
        if not available_entity_ids:
            _LOGGER.warning(
                "Climate Planner could not apply mode for %s because all climate entities are unavailable: %s",
                schedule["name"],
                ", ".join(entity_ids),
            )
            return False
        try:
            target_unit = getattr(
                getattr(self.hass.config, "units", None),
                "temperature_unit",
                UnitOfTemperature.CELSIUS,
            )
            target_temperature = (
                match.phase.get("target_temperature", match.mode["target_temperature"])
                if isinstance(match.phase, dict)
                else match.mode["target_temperature"]
            )
            service_temperature = TemperatureConverter.convert(
                float(target_temperature),
                UnitOfTemperature.CELSIUS,
                target_unit,
            )
            await self.hass.services.async_call(
                CLIMATE_DOMAIN,
                SERVICE_SET_TEMPERATURE,
                {ATTR_TEMPERATURE: service_temperature},
                target={
                    ATTR_ENTITY_ID: (
                        available_entity_ids[0]
                        if len(available_entity_ids) == 1
                        else available_entity_ids
                    )
                },
                blocking=True,
            )
            self._last_activated[schedule["id"]] = {
                "mode_id": match.mode["id"],
                "mode_name": match.mode["name"],
                "assignment_id": match.assignment["id"],
                "phase_id": match.phase.get("id") if isinstance(match.phase, dict) else None,
                "target_temperature": float(target_temperature),
                "activated_at": self._now().isoformat(),
            }
            try:
                await self._async_save_runtime_state()
            except Exception:  # noqa: BLE001
                _LOGGER.warning("Climate Planner could not persist runtime state", exc_info=True)
            return True
        except Exception:
            _LOGGER.exception(
                "Climate Planner failed to apply a temperature for schedule %s",
                schedule["name"],
            )
            return False
