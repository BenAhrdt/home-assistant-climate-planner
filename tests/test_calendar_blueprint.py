from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml")


class BlueprintLoader(yaml.SafeLoader):
    """Load Home Assistant blueprint !input tags as scalar placeholders."""


BlueprintLoader.add_constructor(
    "!input",
    lambda loader, node: loader.construct_scalar(node),
)


BLUEPRINT_PATH = (
    Path(__file__).resolve().parents[1]
    / "Blueprint"
    / "calendar_event_filter.yaml"
)


def test_calendar_blueprint_has_installable_structure() -> None:
    blueprint = yaml.load(BLUEPRINT_PATH.read_text(encoding="utf-8"), Loader=BlueprintLoader)

    metadata = blueprint["blueprint"]
    assert metadata["domain"] == "automation"
    assert metadata["homeassistant"]["min_version"] == "2026.2.0"
    assert metadata["source_url"].endswith("/Blueprint/calendar_event_filter.yaml")

    inputs = metadata["input"]
    assert inputs["calendar_entities"]["selector"]["entity"]["multiple"] is True
    assert inputs["calendar_entities"]["selector"]["entity"]["filter"] == [
        {"domain": "calendar"}
    ]
    assert inputs["matched_actions"]["selector"] == {"action": None}
    assert inputs["no_match_actions"]["selector"] == {"action": None}
    assert inputs["matched_actions"]["default"] == []
    assert inputs["no_match_actions"]["default"] == []

    triggers = blueprint["triggers"]
    assert [trigger["id"] for trigger in triggers] == [
        "matched_start",
        "matched_end",
        "no_match_start",
        "no_match_end",
    ]
    assert [trigger["trigger"] for trigger in triggers] == [
        "calendar.event_started",
        "calendar.event_ended",
        "calendar.event_started",
        "calendar.event_ended",
    ]
    assert all(
        trigger["target"] == {"entity_id": "calendar_entities"}
        for trigger in triggers
    )
    assert triggers[0]["options"]["offset"] == "match_offset"
    assert triggers[1]["options"]["offset"] == "match_offset"
    assert triggers[2]["options"]["offset"] == "no_match_offset"
    assert triggers[3]["options"]["offset"] == "no_match_offset"

    assert blueprint["mode"] == "queued"
