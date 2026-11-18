# Kalenderereignis-Blueprint

Der Blueprint
[`Blueprint/calendar_event_filter.yaml`](../Blueprint/calendar_event_filter.yaml)
überwacht einen oder mehrere Home-Assistant-Kalender und vergleicht den Titel
(`summary`) jedes ausgelösten Kalenderereignisses mit einem Filtertext.

Für ein passendes Ereignis und für das Ende der passenden Gültigkeit können
unabhängige Aktionen über den normalen Home-Assistant-Aktionseditor hinterlegt
werden.

## Installation

### Import über Home Assistant

Der Blueprint kann über den Home-Assistant-Blueprint-Importer installiert werden:

[Blueprint in Home Assistant importieren](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2FBenAhrdt%2Fhome-assistant-climate-planner%2Fmain%2FBlueprint%2Fcalendar_event_filter.yaml)

Der Import-Link funktioniert, sobald die Datei im öffentlich erreichbaren
Repository-Stand vorhanden ist.

### Manuelle Installation

Die Datei nach folgendem Pfad kopieren:

```text
/config/blueprints/automation/climate_planner/calendar_event_filter.yaml
```

Danach unter **Einstellungen → Automationen & Szenen → Blueprints** eine neue
Automation aus **Kalenderereignis mit Textfilter** erstellen.

## Beispiel: Urlaub

Für einen Termin mit dem Titel **Urlaub**:

1. Einen oder mehrere Kalender auswählen.
2. Als Filtertext `Urlaub` eintragen.
3. **Enthält** auswählen, damit auch Titel wie `Familienurlaub` passen.
4. Unter **Zeitpunkt für „Trifft zu“** `Bei Beginn` auswählen.
5. Unter **Zeitversatz für „Trifft zu“** `Vor 4 Stunden` einstellen.
6. Unter **Aktionen bei „Trifft zu“** die zu aktivierende Entität einschalten.
7. Unter **Zeitpunkt für „Trifft nicht mehr zu“** `Bei Ende` auswählen.
8. Unter **Zeitversatz für „Trifft nicht mehr zu“** `Vor 2 Tagen` einstellen.
9. Unter **Aktionen bei „Trifft nicht mehr zu“** die Entität ausschalten.

Damit wird die erste Aktionsfolge vier Stunden vor dem Beginn eines passenden
Ereignisses ausgeführt. Die zweite Aktionsfolge wird zwei Tage vor dem
geplanten Ende desselben passenden Ereignisses ausgeführt.

Der Filter wird case-insensitiv ausschließlich auf den Ereignistitel angewandt.
Ein leerer Filtertext führt absichtlich zu keiner Ausführung.

## Verhalten und Grenzen

- Der Blueprint liest Kalenderereignisse; er schreibt keine Termine und benötigt
  daher keine Schreibrechte für einen schreibgeschützten iCal-Kalender.
- „Trifft nicht mehr zu“ bedeutet im Standardfall: Der konfigurierte
  Ereigniszeitpunkt beziehungsweise das geplante Ende ist erreicht. Wird ein
  Termin vorzeitig aus dem externen iCal gelöscht, entsteht dadurch nicht
  automatisch ein normales Kalender-Ende-Ereignis. Eine Erkennung solcher
  Löschungen würde eine zusätzliche Abfrage- und Zustandslogik erfordern.
- Beginn und Ende sind unabhängig konfigurierbar. Dadurch sind zum Beispiel
  `Vor 4 Stunden` für den Beginn und `Vor 2 Tagen` für das Ende möglich.
- Wenn der Zeitversatz für „Trifft nicht mehr zu“ zeitlich vor dem Versatz für
  „Trifft zu“ liegt, werden die Aktionen in dieser tatsächlichen zeitlichen
  Reihenfolge ausgeführt. Die beiden Versätze sollten daher zur Dauer des
  jeweiligen Ereignisses passen.
- Bei mehreren gleichzeitig ausgelösten Terminen verwendet die Automation den
  Modus `queued`, damit die Aktionsfolgen nicht verworfen werden.
- Home Assistant aktualisiert Kalender nicht kontinuierlich. Laut offizieller
  Dokumentation werden Kalender typischerweise alle 15 Minuten gelesen; beim
  Testen sollte ein Ereignis daher nicht erst wenige Minuten in der Zukunft
  beginnen.

Weitere Informationen:

- [Home-Assistant-Kalender](https://www.home-assistant.io/integrations/calendar)
- [Kalender-Triggerdaten](https://www.home-assistant.io/docs/automation/trigger-data/)
- [Blueprint-Selektoren](https://www.home-assistant.io/docs/blueprint/selectors)
