"""Config flow for the local, single-instance Climate Planner."""

from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import DEFAULT_ENTRY_TITLE, DEFAULT_ENTRY_UNIQUE_ID, DOMAIN


class ClimatePlannerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Create the one local planner instance."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        return ClimatePlannerOptionsFlow()

    async def async_step_user(self, user_input: dict | None = None):
        """Show the initial planner name."""

        await self.async_set_unique_id(DEFAULT_ENTRY_UNIQUE_ID)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            title = str(user_input["name"]).strip() or DEFAULT_ENTRY_TITLE
            return self.async_create_entry(title=title, data={})
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required("name", default=DEFAULT_ENTRY_TITLE): selector.TextSelector(
                        selector.TextSelectorConfig(type=selector.TextSelectorType.TEXT)
                    )
                }
            ),
        )


class ClimatePlannerOptionsFlow(config_entries.OptionsFlow):
    """The planner has no connection options; data is edited in its panel."""

    async def async_step_init(self, user_input: dict | None = None):
        if user_input is not None:
            return self.async_create_entry(title="", data=self.config_entry.options)
        return self.async_show_form(step_id="init", data_schema=vol.Schema({}))
