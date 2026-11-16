"""Constants for the Climate Planner integration."""

from __future__ import annotations

DOMAIN = "climate_planner"
NAME = "Climate Planner"
VERSION = "0.1.87"

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.planner"
RUNTIME_STORAGE_KEY = f"{DOMAIN}.runtime"
DEFAULT_WINDOW_OPEN_TEMPERATURE = 18.5
WINDOW_OPEN_DELAY_SECONDS = 5
WINDOW_CLOSE_DELAY_SECONDS = 10
CONF_WINDOW_LABEL = "window_label"
CONF_HOLIDAY_REGION = "holiday_region"
DEFAULT_HOLIDAY_REGION = "national"
HOLIDAY_REGIONS: tuple[str, ...] = (
    DEFAULT_HOLIDAY_REGION,
    "bw",
    "by",
    "be",
    "bb",
    "hb",
    "hh",
    "he",
    "mv",
    "ni",
    "nw",
    "rp",
    "sl",
    "sn",
    "st",
    "sh",
    "th",
)
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

AUTO_RULE_KINDS: tuple[str, ...] = (
    "date",
    "holiday",
    "cycle",
)
AUTO_RULE_RECURRENCES: tuple[str, ...] = (
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
)
AUTO_RULE_HOLIDAYS: tuple[str, ...] = (
    "new_year",
    "epiphany",
    "international_womens_day",
    "good_friday",
    "easter_saturday",
    "easter_monday",
    "easter_sunday",
    "whit_sunday",
    "labour_day",
    "ascension",
    "whit_monday",
    "corpus_christi",
    "maria_himmelfahrt",
    "world_children_day",
    "german_unity",
    "reformation_day",
    "all_saints_day",
    "repentance_day",
    "christmas_eve",
    "christmas_day",
    "boxing_day",
    "new_years_eve",
    "advent_1",
    "advent_2",
    "advent_3",
    "advent_4",
    "all_advent",
    "easter_period",
    "christmas_period",
)

HOLIDAY_NATIONAL: frozenset[str] = frozenset(
    {
        "new_year",
        "good_friday",
        "easter_saturday",
        "easter_monday",
        "easter_sunday",
        "labour_day",
        "ascension",
        "whit_monday",
        "german_unity",
        "christmas_day",
        "boxing_day",
    }
)
HOLIDAY_STATE_AVAILABILITY: dict[str, frozenset[str]] = {
    "epiphany": frozenset({"bw", "by", "st"}),
    "international_womens_day": frozenset({"be", "mv"}),
    "whit_sunday": frozenset({"bb"}),
    "corpus_christi": frozenset({"bw", "by", "he", "nw", "rp", "sl"}),
    "maria_himmelfahrt": frozenset({"sl"}),
    "world_children_day": frozenset({"th"}),
    "reformation_day": frozenset({"bb", "hb", "hh", "mv", "ni", "sn", "st", "sh", "th"}),
    "all_saints_day": frozenset({"bw", "by", "nw", "rp", "sl"}),
    "repentance_day": frozenset({"sn"}),
}

CLIMATE_DOMAIN = "climate"
PLATFORMS: tuple[str, ...] = ("switch", "button", "select", "number", "text", "sensor")
SERVICE_SET_TEMPERATURE = "set_temperature"
SERVICE_ACTIVATE_MODE = "activate_mode"
SERVICE_APPLY_MATCHED = "apply_matched"
SERVICE_APPLY_ENABLED_MATCHING = "apply_enabled_matching"
SERVICE_APPLY_ENABLED_MODE_MATCHING = "apply_enabled_mode_matching"
SERVICE_CLEAR_OVERRIDE = "clear_override"
WS_ACTIVATE_MODE = f"{DOMAIN}/activate_mode"
WS_CLEAR_OVERRIDE = f"{DOMAIN}/clear_override"
EVENT_UPDATED = f"{DOMAIN}_updated"
