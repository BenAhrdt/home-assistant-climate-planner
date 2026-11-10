"""Authenticated Home Assistant WebSocket API for the custom panel."""

from __future__ import annotations

import logging
from copy import deepcopy

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .models import InvalidData, RevisionConflict
from .runtime import PlannerRuntime

_LOGGER = logging.getLogger(__name__)


def _runtime(hass: HomeAssistant) -> PlannerRuntime | None:
    return hass.data.get(DOMAIN, {}).get("runtime")


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/data"})
@websocket_api.async_response
async def ws_data(hass: HomeAssistant, connection, msg: dict) -> None:
    """Return the current validated planner snapshot."""

    runtime = _runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_ready", "Climate Planner is not configured")
        return
    connection.send_result(msg["id"], await runtime.snapshot())


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/configure",
        vol.Required("revision"): vol.Coerce(int),
        vol.Required("modes"): list,
        vol.Required("schedules"): list,
    }
)
@websocket_api.async_response
async def ws_configure(hass: HomeAssistant, connection, msg: dict) -> None:
    """Replace the planner after server-side validation and revision checking."""

    if not connection.user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Administrator required")
        return
    runtime = _runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_ready", "Climate Planner is not configured")
        return
    candidate = {
        "schema_version": runtime.data["schema_version"],
        "revision": msg["revision"],
        "modes": deepcopy(msg["modes"]),
        "schedules": deepcopy(msg["schedules"]),
    }
    try:
        revision = await runtime.async_replace(candidate, msg["revision"])
    except RevisionConflict:
        connection.send_error(msg["id"], "conflict", "The planner changed; reload it first")
    except InvalidData as err:
        _LOGGER.warning("Rejected Climate Planner configuration (%s)", err.code)
        connection.send_error(msg["id"], "invalid_input", err.code)
    except Exception:
        _LOGGER.exception("Climate Planner configuration could not be saved")
        connection.send_error(msg["id"], "save_failed", "The planner could not be saved")
    else:
        connection.send_result(msg["id"], {"saved": True, "revision": revision})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/set_window_label",
        vol.Optional("label_id", default=""): str,
    }
)
@websocket_api.async_response
async def ws_set_window_label(hass: HomeAssistant, connection, msg: dict) -> None:
    """Save the integration-wide window label from the panel."""

    if not connection.user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Administrator required")
        return
    runtime = _runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_ready", "Climate Planner is not configured")
        return
    try:
        await runtime.async_set_window_label(msg["label_id"])
    except InvalidData as err:
        connection.send_error(msg["id"], "invalid_input", err.code)
    except Exception:
        _LOGGER.exception("Climate Planner window label could not be saved")
        connection.send_error(msg["id"], "save_failed", "The window label could not be saved")
    else:
        connection.send_result(msg["id"], {"saved": True, "window_label": runtime.window_label})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/activate_mode",
        vol.Required("schedule_id"): str,
        vol.Required("mode_id"): str,
        vol.Optional("assignment_id"): str,
    }
)
@websocket_api.async_response
async def ws_activate_mode(hass: HomeAssistant, connection, msg: dict) -> None:
    """Apply a mode manually until the next scheduled activation."""

    if not connection.user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Administrator required")
        return
    runtime = _runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_ready", "Climate Planner is not configured")
        return
    try:
        await runtime.async_activate_mode(
            msg["schedule_id"], msg["mode_id"], msg.get("assignment_id")
        )
    except InvalidData as err:
        connection.send_error(msg["id"], "invalid_input", err.code)
    except Exception:
        _LOGGER.exception("Climate Planner manual mode activation failed")
        connection.send_error(msg["id"], "activation_failed", "The mode could not be activated")
    else:
        connection.send_result(msg["id"], {"activated": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/clear_override",
        vol.Required("schedule_id"): str,
    }
)
@websocket_api.async_response
async def ws_clear_override(hass: HomeAssistant, connection, msg: dict) -> None:
    """Return a heating plan to automatic schedule control."""

    if not connection.user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Administrator required")
        return
    runtime = _runtime(hass)
    if runtime is None:
        connection.send_error(msg["id"], "not_ready", "Climate Planner is not configured")
        return
    try:
        await runtime.async_clear_manual_override(msg["schedule_id"])
    except InvalidData as err:
        connection.send_error(msg["id"], "invalid_input", err.code)
    except Exception:
        _LOGGER.exception("Climate Planner automatic mode restore failed")
        connection.send_error(
            msg["id"], "activation_failed", "Automatic mode could not be restored"
        )
    else:
        connection.send_result(msg["id"], {"cleared": True})


def register(hass: HomeAssistant) -> None:
    """Register all panel commands once per Home Assistant instance."""

    for command in (
        ws_data,
        ws_configure,
        ws_set_window_label,
        ws_activate_mode,
        ws_clear_override,
    ):
        websocket_api.async_register_command(hass, command)
