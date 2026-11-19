from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml")


class BlueprintLoader(yaml.SafeLoader):
    """Load Home Assistant blueprint !input tags as scalar placeholders."""


BlueprintLoader.add_constructor(
    "!input",
    lambda loader, node: loader.construct_scalar(node),
)


BLUEPRINT_PATH = Path(__file__).resolve().parents[1] / "Blueprint" / "calendar_event_filter.yaml"


def test_calendar_blueprint_has_installable_structure() -> None:
    blueprint = yaml.load(BLUEPRINT_PATH.read_text(encoding="utf-8"), Loader=BlueprintLoader)

    metadata = blueprint["blueprint"]
    assert metadata["domain"] == "automation"
    assert metadata["homeassistant"]["min_version"] == "2026.2.0"
    assert metadata["source_url"].endswith("/Blueprint/calendar_event_filter.yaml")

    inputs = metadata["input"]
    assert inputs["filter_text"]["default"] == []
    assert inputs["filter_text"]["selector"]["text"]["multiple"] is True
    assert inputs["filter_logic"]["default"] == "or"
    assert inputs["filter_logic"]["selector"]["select"]["options"] == [
        {"label": "Ein Textfilter muss zutreffen (ODER)", "value": "or"},
        {"label": "Alle Textfilter müssen zutreffen (UND)", "value": "and"},
    ]
    assert inputs["calendar_entities"]["selector"]["entity"]["multiple"] is True
    assert inputs["calendar_entities"]["selector"]["entity"]["filter"] == [{"domain": "calendar"}]
    assert inputs["matched_actions"]["selector"] == {"action": None}
    assert inputs["no_match_actions"]["selector"] == {"action": None}
    assert inputs["matched_actions"]["default"] == []
    assert inputs["no_match_actions"]["default"] == []

    for offset_input in (inputs["match_offset"], inputs["no_match_offset"]):
        assert offset_input["name"].startswith("Zeitversatz")
        assert "Zeitversatz" in offset_input["description"]
        selector = offset_input["selector"]["object"]
        assert set(selector["fields"]) == {"offset_type", "offset"}
        assert selector["fields"]["offset_type"]["label"] == "Richtung"
        assert selector["fields"]["offset_type"]["selector"]["select"]["options"] == [
            {"label": "Vorher", "value": "before"},
            {"label": "Nachher", "value": "after"},
        ]
        assert selector["fields"]["offset"]["label"] == "Zeitversatz"
        assert set(selector["fields"]["offset"]["selector"]["object"]["fields"]) == {
            "days",
            "hours",
            "minutes",
            "seconds",
        }

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
    assert all(trigger["target"] == {"entity_id": "calendar_entities"} for trigger in triggers)
    assert triggers[0]["options"] == "match_offset"
    assert triggers[1]["options"] == "match_offset"
    assert triggers[2]["options"] == "no_match_offset"
    assert triggers[3]["options"] == "no_match_offset"

    assert blueprint["mode"] == "queued"
