# Climate Planner for Home Assistant

Climate Planner is a local Home Assistant custom integration for multiple
time-based heating plans. Each heating plan references one or more `climate`
entities and uses centrally managed modes with target temperatures.

## Features

- central mode library with stable IDs
- flat mode cards above the heating plans for direct drag-and-drop; valid
  targets use an animated drop indicator, while plans that already contain the
  mode show a red blocked indicator; with many plans, only the heating-plan
  area scrolls
- per-plan mode state with play/pause and configurable priority
- any number of heating plans and mode assignments
- complete heating-plan duplication with new stable IDs and a paused copy
- multiple climate entities per plan through the native searchable Home
  Assistant entity picker; integration, area and device remain visible
- display of the last mode successfully activated by the planner, with
  separate requested target, reported target and current temperature values
- external-target indication and persistence of the last activation across
  integration restarts
- direct mode selection on a heating-plan card with a temporary manual override,
  including while automatic schedule evaluation is paused
- multiple phases per weekday with drag-and-drop and local temperature
  overrides
- new mode assignments select all weekdays by default, with quick select-all
  and clear-all controls
- used modes in the detail view can be dragged directly onto a day and time to
  add another phase to their existing assignment
- same or individual times for each weekday
- priority-based, deterministic selection of enabled modes across week changes
- one-time target-temperature application through `climate.set_temperature`
- point-in-time scheduling without short-interval polling
- responsive heating-plan and mode overview plus a detail view for each plan
- 15-minute timeline controls, target-time preview, an eight-hour guideline for
  new entries, and a fixed 24:00 end for the final daily phase
- phase duplication one hour before the selected phase
- versioned atomic persistence and server-side validation
- automation services for direct mode activation and the three ioBroker-
  compatible Apply variants (`apply_matched`, `apply_enabled_matching`, and
  `apply_enabled_mode_matching`)
- controllable Home Assistant switches and buttons per heating plan and mode
  assignment
- a dedicated Home Assistant device for each heating plan

The integration intentionally does not implement feedback control loops,
cyclic re-adjustment, HVAC mode changes or ioBroker state/device-manager
structures.

## Installation and use

Install the **Climate Planner** integration through the Home Assistant
integration setup. After setup, the **Climate Planner** panel is available in
the sidebar.

The complete English installation, user, automation, data-model and
troubleshooting guide is maintained in the
[Climate Planner Wiki](https://github.com/BenAhrdt/home-assistant-climate-planner/wiki).

### Installation through HACS

Until the repository is available in the default HACS catalog, add it as a
**Custom repository** with type **Integration**:

`https://github.com/BenAhrdt/home-assistant-climate-planner`

After a GitHub release has been published, install or update the integration
from the release archive and restart Home Assistant.

### Manual installation

Copy `custom_components/climate_planner` into the matching
`custom_components` directory of the Home Assistant configuration and restart
Home Assistant.

## Development

Install the reproducible development dependencies from `requirements_test.txt`:

```bash
python -m pip install -r requirements_test.txt
ruff check .
ruff format --check .
python -m compileall -q custom_components tests
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=. python -m pytest -p pytest_asyncio.plugin -q
```

`AGENTS.md` and `secondBrain/` are local project notes and are intentionally
ignored by Git.

## Release

The version in `custom_components/climate_planner/const.py` must match the
`version` in `custom_components/climate_planner/manifest.json`. After the
validation and test workflows succeed, start the **Release** workflow manually
under GitHub Actions with that version. It verifies both files, creates the
HACS archive `climate_planner.zip`, creates the tag `v<version>` and publishes a
GitHub release with generated release notes. The archive contains only the
integration.
