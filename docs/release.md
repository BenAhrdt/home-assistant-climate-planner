# Veröffentlichung

## Vor dem ersten Release

1. `VERSION` in `custom_components/climate_planner/const.py` und `version` in
   `custom_components/climate_planner/manifest.json` auf dieselbe neue
   semantische Version setzen.
2. Die lokalen Prüfungen aus dem README ausführen.
3. Den Commit nach `main` pushen und abwarten, bis die Workflows **Tests**,
   **Hassfest** und **HACS validation** erfolgreich sind.

## Release ausführen

1. In GitHub **Actions → Release → Run workflow** öffnen.
2. Die Version ohne führendes `v` eintragen, zum Beispiel `0.1.23`.
3. Den Workflow starten.

Der Workflow akzeptiert nur die Version aus `manifest.json` und `const.py`.
Anschließend erzeugt er `climate_planner.zip`, legt den Tag `v<version>` an
und veröffentlicht eine GitHub-Release mit automatisch erzeugten Release Notes.
Eine Release wird nicht bei jedem Push erstellt.

## HACS-Hinweis

Das Repository enthält bereits `custom_components/climate_planner/brand/icon.png`
und wird im HACS-Workflow ohne ignorierte Prüfungen validiert. Für die Aufnahme
als Standard-Repository müssen zusätzlich die aktuellen HACS-Anforderungen
erfüllt und ein vollständiges GitHub-Release veröffentlicht werden.
