"""Home Assistant Climate Planner integration."""

from __future__ import annotations

from pathlib import Path

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr

from .const import (
    DOMAIN,
    PANEL_ELEMENT,
    PANEL_MODULE,
    PANEL_NAME,
    PANEL_PATH,
    PLATFORMS,
    SERVICE_ACTIVATE_MODE,
    SERVICE_APPLY_ENABLED_MATCHING,
    SERVICE_APPLY_ENABLED_MODE_MATCHING,
    SERVICE_APPLY_MATCHED,
    SERVICE_CLEAR_OVERRIDE,
)
from .models import InvalidData
from .runtime import PlannerRuntime
from .websocket import register

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

_SERVICE_NAMES = (
    SERVICE_ACTIVATE_MODE,
    SERVICE_APPLY_MATCHED,
    SERVICE_APPLY_ENABLED_MATCHING,
    SERVICE_APPLY_ENABLED_MODE_MATCHING,
    SERVICE_CLEAR_OVERRIDE,
)


def _runtime(hass: HomeAssistant) -> PlannerRuntime:
    runtime = hass.data.get(DOMAIN, {}).get("runtime")
    if runtime is None:
        raise HomeAssistantError("Climate Planner is not configured")
    return runtime


async def _async_service_error(hass: HomeAssistant, operation) -> None:
    try:
        await operation(_runtime(hass))
    except InvalidData as err:
        raise HomeAssistantError(err.code) from err


async def _async_register_services(hass: HomeAssistant) -> None:
    """Expose automation-callable actions matching the ioBroker adapter."""

    if hass.services.has_service(DOMAIN, SERVICE_ACTIVATE_MODE):
        return

    required_ids = vol.Schema(
        {
            vol.Required("schedule_id"): cv.string,
            vol.Required("mode_id"): cv.string,
            vol.Optional("assignment_id"): cv.string,
        }
    )
    schedule_optional = vol.Schema({vol.Optional("schedule_id"): cv.string})
    schedule_required = vol.Schema({vol.Required("schedule_id"): cv.string})

    async def activate_mode(call: ServiceCall) -> None:
        await _async_service_error(
            hass,
            lambda runtime: runtime.async_activate_mode(
                call.data["schedule_id"],
                call.data["mode_id"],
                call.data.get("assignment_id"),
            ),
        )

    async def apply_matched(call: ServiceCall) -> None:
        await _async_service_error(
            hass,
            lambda runtime: runtime.async_apply_matching(
                SERVICE_APPLY_MATCHED, call.data.get("schedule_id")
            ),
        )

    async def apply_enabled_matching(call: ServiceCall) -> None:
        await _async_service_error(
            hass,
            lambda runtime: runtime.async_apply_matching(
                SERVICE_APPLY_ENABLED_MATCHING, call.data.get("schedule_id")
            ),
        )

    async def apply_enabled_mode_matching(call: ServiceCall) -> None:
        await _async_service_error(
            hass,
            lambda runtime: runtime.async_apply_matching(
                SERVICE_APPLY_ENABLED_MODE_MATCHING, call.data.get("schedule_id")
            ),
        )

    async def clear_override(call: ServiceCall) -> None:
        await _async_service_error(
            hass,
            lambda runtime: runtime.async_clear_manual_override(call.data["schedule_id"]),
        )

    hass.services.async_register(DOMAIN, SERVICE_ACTIVATE_MODE, activate_mode, schema=required_ids)
    hass.services.async_register(
        DOMAIN, SERVICE_APPLY_MATCHED, apply_matched, schema=schedule_optional
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_APPLY_ENABLED_MATCHING,
        apply_enabled_matching,
        schema=schedule_optional,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_APPLY_ENABLED_MODE_MATCHING,
        apply_enabled_mode_matching,
        schema=schedule_optional,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_CLEAR_OVERRIDE, clear_override, schema=schedule_required
    )


async def _async_setup_panel(hass: HomeAssistant, data: dict) -> None:
    """Register the sidebar panel when it is not currently present."""

    if data["panel"]:
        return
    from homeassistant.components.panel_custom import async_register_panel

    await async_register_panel(
        hass,
        PANEL_NAME,
        PANEL_ELEMENT,
        sidebar_title="Climate Planner",
        sidebar_icon="mdi:calendar-clock",
        module_url=PANEL_MODULE,
    )
    data["panel"] = True


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register the panel and WebSocket API once."""

    data = hass.data.setdefault(
        DOMAIN,
        {"runtime": None, "panel": False, "static": False, "websocket": False},
    )
    if not data["websocket"]:
        register(hass)
        data["websocket"] = True
    if not data["static"]:
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [StaticPathConfig(PANEL_PATH, str(Path(__file__).parent / "frontend"), False)]
        )
        data["static"] = True
    await _async_setup_panel(hass, data)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Load the persistent planner and start its one-shot scheduler."""

    await _async_setup_panel(hass, hass.data[DOMAIN])
    await _async_register_services(hass)
    runtime = PlannerRuntime(hass, entry.entry_id)
    await runtime.async_start()
    entry.runtime_data = runtime
    hass.data[DOMAIN]["runtime"] = runtime
    _remove_legacy_planner_device(hass, entry.entry_id)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


def _remove_legacy_planner_device(hass: HomeAssistant, entry_id: str) -> None:
    """Remove the pre-0.1.14 single-device grouping after migration."""

    registry = dr.async_get(hass)
    legacy = registry.async_get_device(identifiers={(DOMAIN, entry_id)})
    if legacy:
        registry.async_remove_device(legacy.id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Stop timers and release the runtime on entry unload/reload."""

    runtime: PlannerRuntime | None = entry.runtime_data
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if runtime is not None:
        await runtime.async_shutdown()
    if hass.data.get(DOMAIN, {}).get("runtime") is runtime:
        hass.data[DOMAIN]["runtime"] = None
        for service in _SERVICE_NAMES:
            hass.services.async_remove(DOMAIN, service)
    return unload_ok


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Keep persistent planner data; removing an entry must not silently erase it."""

    data = hass.data.get(DOMAIN)
    if not data or data.get("runtime") is not None:
        return
    from homeassistant.components.frontend import async_remove_panel

    async_remove_panel(hass, PANEL_NAME, warn_if_unknown=False)
    data["panel"] = False
