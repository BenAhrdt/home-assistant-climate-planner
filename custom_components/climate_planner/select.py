"""Select entities for the integration-wide Climate Planner settings."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DEFAULT_HOLIDAY_REGION, HOLIDAY_REGIONS
from .entity import PlannerEntity, PlannerEntityManager
from .models import InvalidData
from .runtime import PlannerRuntime

_NO_LABEL = "Kein Label"
_REGION_LABELS = {
    DEFAULT_HOLIDAY_REGION: "Nur bundesweite Feiertage",
    "bw": "Baden-Württemberg",
    "by": "Bayern",
    "be": "Berlin",
    "bb": "Brandenburg",
    "hb": "Bremen",
    "hh": "Hamburg",
    "he": "Hessen",
    "mv": "Mecklenburg-Vorpommern",
    "ni": "Niedersachsen",
    "nw": "Nordrhein-Westfalen",
    "rp": "Rheinland-Pfalz",
    "sl": "Saarland",
    "sn": "Sachsen",
    "st": "Sachsen-Anhalt",
    "sh": "Schleswig-Holstein",
    "th": "Thüringen",
}


class HolidayRegionSelect(PlannerEntity, SelectEntity):
    """Select the German state used for holiday rules."""

    _attr_icon = "mdi:map-marker-radius-outline"

    def __init__(self, runtime: PlannerRuntime, entry_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_holiday_region")
        self._attr_name = "Holiday region"

    @property
    def options(self) -> list[str]:
        return [_REGION_LABELS[region] for region in HOLIDAY_REGIONS]

    @property
    def current_option(self) -> str:
        return _REGION_LABELS[self.runtime.holiday_region]

    async def async_select_option(self, option: str) -> None:
        region = next(
            (code for code, label in _REGION_LABELS.items() if label == option),
            None,
        )
        if region is None:
            raise InvalidData("invalid_holiday_region")
        await self.runtime.async_set_holiday_region(region)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {"region_id": self.runtime.holiday_region}


class WindowLabelSelect(PlannerEntity, SelectEntity):
    """Select the Home Assistant label used for window detection."""

    _attr_icon = "mdi:label-outline"

    def __init__(self, runtime: PlannerRuntime, entry_id: str) -> None:
        super().__init__(runtime, entry_id, f"{entry_id}_window_label")
        self._attr_name = "Window label"

    def _options(self) -> list[tuple[str, str]]:
        result: list[tuple[str, str]] = [(_NO_LABEL, "")]
        used = {_NO_LABEL}
        for item in self.runtime._window_label_options():
            option = item["name"]
            if option in used:
                option = f"{option} ({item['id']})"
            used.add(option)
            result.append((option, item["id"]))
        return result

    @property
    def options(self) -> list[str]:
        return [option for option, _label_id in self._options()]

    @property
    def current_option(self) -> str:
        for option, label_id in self._options():
            if label_id == self.runtime.window_label:
                return option
        return _NO_LABEL

    async def async_select_option(self, option: str) -> None:
        label_id = next(
            (label_id for label_option, label_id in self._options() if label_option == option),
            None,
        )
        if label_id is None:
            raise InvalidData("invalid_window_label")
        await self.runtime.async_set_window_label(label_id)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {
            "label_id": self.runtime.window_label,
            "label_name": self.runtime.window_label_name,
        }


class AssignmentModeSelect(PlannerEntity, SelectEntity):
    """Select which mode library entry a heating-plan assignment uses."""

    _attr_icon = "mdi:thermostat-auto"

    def __init__(
        self, runtime: PlannerRuntime, entry_id: str, schedule_id: str, assignment_id: str
    ) -> None:
        super().__init__(
            runtime,
            entry_id,
            f"{entry_id}_schedule_{schedule_id}_assignment_{assignment_id}_mode",
        )
        self.schedule_id = schedule_id
        self.assignment_id = assignment_id
        self._attr_name = "Mode"

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

    def _options(self) -> list[tuple[str, str]]:
        result = []
        used: set[str] = set()
        for mode in self.runtime.data["modes"]:
            option = mode["name"]
            if option in used:
                option = f"{option} ({mode['id']})"
            used.add(option)
            result.append((option, mode["id"]))
        return result

    @property
    def options(self) -> list[str]:
        return [option for option, _mode_id in self._options()]

    @property
    def current_option(self) -> str | None:
        assignment = self._assignment()
        mode_id = assignment["mode_id"] if assignment else None
        return next(
            (option for option, candidate_id in self._options() if candidate_id == mode_id),
            None,
        )

    @property
    def available(self) -> bool:
        return super().available and self._assignment() is not None

    async def async_select_option(self, option: str) -> None:
        mode_id = next(
            (candidate_id for label, candidate_id in self._options() if label == option),
            None,
        )
        if mode_id is None:
            raise InvalidData("invalid_mode_reference")
        await self.runtime.async_set_assignment_mode(self.schedule_id, self.assignment_id, mode_id)

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        assignment = self._assignment()
        return {
            "schedule_id": self.schedule_id,
            "assignment_id": self.assignment_id,
            "mode_id": assignment["mode_id"] if assignment else "",
        }


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities) -> None:
    """Create global and heating-plan configuration selects."""

    runtime: PlannerRuntime = entry.runtime_data
    async_add_entities(
        [
            HolidayRegionSelect(runtime, entry.entry_id),
            WindowLabelSelect(runtime, entry.entry_id),
        ]
    )
    manager = PlannerEntityManager(hass, runtime, entry.entry_id, "select", async_add_entities)
    hass.data.setdefault("climate_planner", {}).setdefault("entity_managers", {})[
        (entry.entry_id, "select")
    ] = manager
    await manager.async_setup()


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload select entities with the config entry."""

    manager = (
        hass.data.get("climate_planner", {})
        .get("entity_managers", {})
        .pop((entry.entry_id, "select"), None)
    )
    if manager:
        await manager.async_shutdown()
    return True
