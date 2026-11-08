# Climate Planner für Home Assistant

Climate Planner ist eine lokale Home-Assistant-Custom-Integration für mehrere
zeitgesteuerte Heizpläne. Jeder Heizplan referenziert eine oder mehrere
`climate`-Entitäten und verwendet zentral gepflegte Modes mit Zieltemperaturen.

## Funktionen

- zentrale Mode-Bibliothek mit stabilen IDs
- flache Mode-Kacheln oberhalb der Heizpläne für direktes Drag-and-Drop; bei
  vielen Plänen scrollt ausschließlich der Heizplanbereich
- per Heizplan steuerbarer Mode-Zustand mit Play/Pause und konfigurierbarer Priorität
- beliebig viele Heizpläne und Mode-Zuordnungen
- vollständige Heizplan-Duplikation mit neuen stabilen IDs und zunächst
  pausierter Kopie
- mehrere Klima-Entitäten pro Heizplan über den nativen, durchsuchbaren
  Home-Assistant-Entitätspicker; Integration, Bereich und Gerät bleiben in der
  Auswahl sichtbar
- Anzeige des zuletzt erfolgreich aktivierten Modes sowie getrennter Werte für
  Sollwertvorgabe, Sollwert-Rückmeldung und Isttemperatur; abweichende externe
  Vorgaben werden zeitlich korrekt markiert und die letzte Aktivierung bleibt
  über Integrationsneustarts erhalten
- direkte Mode-Auswahl auf der Heizplan-Kachel mit temporärem manuellen Override,
  auch wenn die automatische Heizplan-Auswertung pausiert ist
- mehrere Phasen pro Wochentag mit Drag-and-Drop und lokalen Temperatur-Overrides
- gleiche oder individuelle Uhrzeiten je Wochentag
- prioritätsbasierte, deterministische Auswahl aktivierter Modes über Wochenwechsel
- einmalige Sollwertsetzung über `climate.set_temperature`
- gezielte Terminplanung ohne kurzes Dauer-Polling
- helle Kachel-Übersicht für Heizpläne und Modes sowie eine Detailansicht je
  Heizplan, deren konfigurierte Zeitblöcke auch bei pausierter Ausführung
  sichtbar bleiben
- responsive Wochen-Timeline mit 15-Minuten-Drag-and-Drop, Zeitgriffen,
  Zielzeitvorschau, 8-Stunden-Richtwert für neue Eingaben und festem Tagesende
  des letzten Blocks,
  Mehrfach-Wochentagen und Phasen-Duplikation per Icon eine Stunde vor dem
  gewählten Block
- versionierte, atomare Persistenz und serverseitige Validierung
- automationstaugliche Dienste für direkte Mode-Aktivierung und die drei
  ioBroker-kompatiblen Apply-Varianten (`apply_matched`,
  `apply_enabled_matching`, `apply_enabled_mode_matching`)
- steuerbare Home-Assistant-Switches und -Buttons pro Heizplan und pro
  Mode-Zuordnung
- eigene Home-Assistant-Gerätegruppierung je Heizplan

Bewusst nicht enthalten sind Feedback-Regelkreise, zyklische Nachregelung,
HVAC-Moduswechsel und ioBroker-State- oder Device-Manager-Strukturen.

## Installation und Nutzung

Die Integration wird über die Home-Assistant-Integrationsseite eingerichtet.
Anschließend steht das **Climate Planner**-Panel in der Seitenleiste bereit.
Details zu Datenmodell, Zustandsübergängen und Bedienung stehen in
[docs/architecture.md](docs/architecture.md) und [docs/usage.md](docs/usage.md).

### Installation über HACS

Das Repository kann in HACS zunächst als **Custom repository** vom Typ
**Integration** hinzugefügt werden. Nach einer veröffentlichten GitHub-Release
steht die Integration über das Release-Archiv zur Verfügung. Nach der
Installation ist Home Assistant neu zu starten.

### Manuelle Installation

Den Ordner `custom_components/climate_planner` in das gleichnamige Verzeichnis
der Home-Assistant-Konfiguration kopieren und Home Assistant neu starten.

## Entwicklung

Zur reproduzierbaren Prüfung werden die Entwicklungsabhängigkeiten aus
`requirements_test.txt` installiert:

```bash
python -m pip install -r requirements_test.txt
ruff check .
ruff format --check .
python -m compileall -q custom_components tests
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=. python -m pytest -p pytest_asyncio.plugin -q
```

`AGENTS.md` und `secondBrain/` bleiben lokale, von Git ignorierte Projektnotizen.

## Veröffentlichung

Die Versionsnummer muss in `custom_components/climate_planner/const.py` und
`custom_components/climate_planner/manifest.json` übereinstimmen. Nach einem
erfolgreichen Validierungs- und Testlauf kann der Workflow **Release** unter
GitHub Actions manuell mit dieser Versionsnummer gestartet werden. Er prüft
beide Dateien, erstellt das HACS-Archiv `climate_planner.zip` sowie den Tag
`v<version>` und veröffentlicht eine GitHub-Release mit automatisch erzeugten
Release Notes. Das HACS-Archiv enthält ausschließlich die Integration.
