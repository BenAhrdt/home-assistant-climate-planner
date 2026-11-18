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
    assert metadata["source_url"].endswith("/Blueprint/calendar_event_filter.yaml")

    inputs = metadata["input"]
    assert inputs["calendar_entities"]["selector"]["entity"]["multiple"] is True
    assert inputs["calendar_entities"]["selector"]["entity"]["filter"] == [
        {"domain": "calendar"}
    ]
    assert inputs["matched_actions"]["selector"] == {"action": None}
    assert inputs["no_match_actions"]["selector"] == {"action": None}

    triggers = blueprint["triggers"]
    assert [trigger["id"] for trigger in triggers] == ["matched", "no_match"]
    assert triggers[0]["event"] == "start"
    assert triggers[1]["event"] == "end"

    assert blueprint["mode"] == "queued"
