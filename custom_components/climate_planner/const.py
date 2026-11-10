"""Constants for the Climate Planner integration."""

from __future__ import annotations

DOMAIN = "climate_planner"
NAME = "Climate Planner"
VERSION = "0.1.43"

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.planner"
RUNTIME_STORAGE_KEY = f"{DOMAIN}.runtime"
DEFAULT_WINDOW_OPEN_TEMPERATURE = 18.5
WINDOW_OPEN_DELAY_SECONDS = 5
WINDOW_CLOSE_DELAY_SECONDS = 10
CONF_WINDOW_LABEL = "window_label"
PANEL_PATH = f"/{DOMAIN}-static"
PANEL_NAME = "climate-planner"
PANEL_ELEMENT = "climate-planner-panel"
PANEL_MODULE = f"{PANEL_PATH}/climate-planner-panel.js?v={VERSION}"

DEFAULT_ENTRY_UNIQUE_ID = "default"
DEFAULT_ENTRY_TITLE = NAME

WEEKDAYS: tuple[str, ...] = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)

CLIMATE_DOMAIN = "climate"
PLATFORMS: tuple[str, ...] = ("switch", "button")
SERVICE_SET_TEMPERATURE = "set_temperature"
SERVICE_ACTIVATE_MODE = "activate_mode"
SERVICE_APPLY_MATCHED = "apply_matched"
SERVICE_APPLY_ENABLED_MATCHING = "apply_enabled_matching"
SERVICE_APPLY_ENABLED_MODE_MATCHING = "apply_enabled_mode_matching"
SERVICE_CLEAR_OVERRIDE = "clear_override"
WS_ACTIVATE_MODE = f"{DOMAIN}/activate_mode"
WS_CLEAR_OVERRIDE = f"{DOMAIN}/clear_override"
EVENT_UPDATED = f"{DOMAIN}_updated"
