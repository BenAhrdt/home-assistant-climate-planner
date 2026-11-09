# Climate Planner: Datenmodell und Zustandsübergänge

## Fachliche Grundlage

Die fachlichen Grundideen wurden am 7. November 2026 aus dem öffentlichen
[ioBroker-Adapter heating-scheduler](https://github.com/BenAhrdt/ioBroker.heating-scheduler)
geprüft: wiederverwendbare Heizmodi, Zeitregeln pro Heizplan,
deterministische Auswahl bei Überschneidungen und Auswertung zum Start sowie
zum nächsten relevanten Zeitpunkt. ioBroker-Geräte, States, Device Manager und
Feedback-Regelkreise sind nicht Bestandteil dieser Integration.

## Home-Assistant-Architektur

- Eine lokale Config Entry installiert die Integration. Eine feste Unique-ID
  verhindert mehrere konkurrierende zentrale Planner.
- Die zentrale Config Entry erzeugt ein separates Home-Assistant-Gerät pro
  Heizplan. Modes bleiben gemeinsame Planner-Daten; Heizplan- und
  Zuordnungsentitäten werden ausschließlich dem jeweiligen Heizplan-Gerät
  zugeordnet.
- `homeassistant.helpers.storage.Store` speichert den vollständigen Planner als
  versioniertes JSON-Dokument mit atomaren Schreibvorgängen.
- Das Backend validiert jeden vollständigen Snapshot, prüft eine Revision gegen
  veraltete Panel-Schreibvorgänge und speichert Änderungen in einem Schritt.
- Die Laufzeit plant mit `async_track_point_in_time` nur den nächsten
  Aktivierungszeitpunkt. Es gibt kein kurzes Dauer-Polling.
- Beim Start und bei Konfigurationsänderungen wird der aktuelle Mode bestimmt.
  Ein Sollwert wird nur bei einer neuen Signatur aus Mode-ID, Zieltemperatur
  oder Klima-Entitäten an `climate.set_temperature` übergeben. Mehrere
  ausgewählte Entitäten erhalten denselben Sollwert in einem Serviceaufruf.
- Nach jedem erfolgreichen `climate.set_temperature` merkt sich die Runtime
  pro Heizplan den zuletzt tatsächlich aktivierten Mode, die Vorgabe und den
  Zeitpunkt. Das gilt gleichermaßen für Zeitplan, Panel, Aktivierungs-Button
  und Automationsdienste. Der letzte Aktivierungsdatensatz wird getrennt vom
  konfigurierten Planner-Dokument gespeichert und nach einem
  Integrationsneustart wiederhergestellt.
- Eine manuelle Mode-Auswahl aus der Heizplan-Kachel wird nur zur Laufzeit
  gehalten, erhält Vorrang bis zum nächsten geplanten Aktivierungszeitpunkt
  und wird danach automatisch verworfen. Sie kann auch bei pausierter
  automatischer Heizplan-Auswertung gesetzt werden und wird nicht als
  dauerhafte Planänderung gespeichert.
- Der benutzerdefinierte Panel-Code nutzt ausschließlich das authentifizierte
  Home-Assistant-WebSocket und den vorhandenen `panel_custom`-Mechanismus.

## Persistentes Datenmodell (Schema 1)

```text
Planner
├── schema_version
├── revision
├── modes[]
│   ├── id
│   ├── name
│   ├── target_temperature      # intern kanonisch in °C
│   ├── priority                 # höhere Zahl gewinnt bei Überschneidungen
│   ├── color?                   # validierter Hex-Farbwert
│   └── icon?                  # validierter MDI-Name
└── schedules[]
    ├── id
    ├── name
    ├── climate_entity_ids[]    # eine oder mehrere climate.<object_id>
    ├── enabled
    └── assignments[]
        ├── id
        ├── mode_id              # stabile Referenz in modes[]
        ├── enabled
        └── weekday_rules        # weekday -> Liste von Phasen
            ├── id
            ├── time              # HH:mm
            └── target_temperature? # lokaler Override in °C
```

Jeder Wochentag kann mehrere Phasen enthalten. Eine Phase referenziert den Mode
der übergeordneten Zuordnung und kann die Temperatur lokal überschreiben. Ohne
Override gilt die Temperatur des Modes.

Für neue Zeitangaben dient eine achtstündige Dauer als Richtwert. Ein letzter
Bereich ohne folgende Aktivierungsgrenze reicht in der Wochenansicht jedoch
immer bis zum festen Tagesende 24:00. Beim Verschieben eines Blocks wird die
nächste Zeitgrenze mitverschoben, damit die bisherige Blockdauer erhalten
bleibt; die Laufzeit wendet weiterhin nur die konfigurierten Aktivierungszeiten
an.

Die Umstellung von `climate_entity_id` auf `climate_entity_ids` bleibt innerhalb
von Schema 1 abwärtskompatibel: Beim Laden wird ein früherer Einzelwert in eine
Liste überführt und anschließend kanonisch gespeichert.

Der WebSocket-Snapshot ergänzt die gespeicherten Entity-IDs nur für die Anzeige
um Namen von Integration, Bereich und Gerät aus den entsprechenden
Home-Assistant-Registern. Diese Metadaten werden nicht Teil des persistenten
Planner-Dokuments und beim nächsten Snapshot erneut ermittelt.

Ein zwischenzeitlich verwendetes globales `modes[].enabled` wird beim Laden
abwärtskompatibel in `assignments[].enabled` des jeweiligen Heizplans
überführt; neue Daten führen den Aktivierungszustand ausschließlich an der
Mode-Zuordnung.

Das Panel erzeugt pro Heizplan und Mode höchstens eine Zuordnung und verwendet
sie für weitere Phasen wieder. Bereits vorhandene Mehrfachzuordnungen bleiben
aus Kompatibilitätsgründen lesbar; beim Entfernen des Modes aus dem Heizplan
werden sie gemeinsam gelöscht.

Die Detailansicht trennt die Bearbeitung der Zuordnung von der Bearbeitung
einer einzelnen Phase. Der Zuordnungsdialog verwaltet die ausgewählten
Wochentage und alle dazugehörigen Uhrzeiten; eine obere Sammelzeit wird jeweils
in das erste Zeitfeld der aktuell ausgewählten Tage übernommen. Das spätere
Aktivieren eines Tages überschreibt dessen vorhandenes Zeitfeld nicht. Beim
Verschieben einer bestehenden Zuordnungsphase bleibt ihre bisherige Dauer wie
beim Timeline-Drag erhalten, indem die direkt folgende Grenze mitwandert. Der
Phasendialog verändert dagegen ausschließlich die über ihre stabile ID
ausgewählte Phase und bietet deshalb keine Wochentags-Mehrfachauswahl. So
entstehen beim Bearbeiten eines sichtbaren Tagesblocks keine zusätzlichen
Phasen.

Beim Duplizieren eines Heizplans werden Heizplan-, Zuordnungs- und Phasen-IDs
neu erzeugt. Mode-Referenzen und fachliche Werte bleiben erhalten. Die Kopie
startet mit `enabled: false`, damit Original und Kopie nicht unbeabsichtigt
parallel dieselben Klima-Entitäten steuern.

## Auswahl des aktiven Modes

`target_temperature` wird im persistenten Modell unabhängig von der
Home-Assistant-Anzeigeeinheit kanonisch in °C gespeichert. Das Panel rechnet
den Wert für Eingaben und Anzeigen in die konfigurierte Einheit °C oder °F um.
Beim Aufruf von `climate.set_temperature` konvertiert die Laufzeit ebenfalls
in die von Home Assistant erwartete Einheit.

Für einen lokalen, zeitzonenbewussten Zeitpunkt werden die aktivierten Regeln
des aktuellen Tages und der vergangenen sieben Tage betrachtet. Zuerst gewinnt
der Mode mit der höheren Priorität. Bei gleicher Priorität gewinnt die jüngste
passende Aktivierung; bei identischem Zeitpunkt entscheiden die konfigurierte
Zuordnungs- und Mode-Reihenfolge deterministisch. So bleibt der letzte Mode aus
dem vorherigen Wochenzyklus über Mitternacht und am Tagesanfang wirksam. Pausierte
Mode-Zuordnungen werden in der normalen Auswahl übersprungen.

Die drei expliziten Apply-Dienste bilden die ioBroker-Aktionen ab:

- `climate_planner.apply_matched` ignoriert Heizplan- und Zuordnungs-
  Schalter.
- `climate_planner.apply_enabled_matching` verlangt, dass Heizplan und
  Mode-Zuordnung aktiviert sind.
- `climate_planner.apply_enabled_mode_matching` ignoriert nur den Heizplan-
  Schalter und verlangt eine aktivierte Mode-Zuordnung.

Alle drei Dienste können optional auf eine `schedule_id` eingeschränkt werden;
ohne diese Angabe werden alle Heizpläne ausgewertet. Zusätzlich stehen
`activate_mode` für eine temporäre manuelle Auswahl und `clear_override` zur
Rückkehr in die Automatik zur Verfügung. Eine Apply-Aktion setzt den
ausgewählten Match ebenfalls als Laufzeit-Override und aktualisiert nach einem
erfolgreichen Serviceaufruf den zuletzt aktivierten Mode im Panel; der Override
wird nicht dauerhaft gespeichert. Der Button-State zeigt separat, wie viele
Temperatur-Serviceaufrufe erfolgreich waren.

Das Panel stellt den Sollwert der Climate-Entität (`temperature`, `Soll`) und
die aktuelle Temperatur (`Ist`) getrennt dar. Weicht der Sollwert unter
Berücksichtigung der Thermostat-Schrittweite von der letzten
Climate-Planner-Vorgabe ab, wird der zuletzt aktivierte Mode als `extern`
markiert. Dadurch aktualisiert ein fremder `climate.set_temperature`-Aufruf
den angezeigten Sollwert, ohne fälschlich einem Planner-Mode zugeordnet zu
werden. Das ist reine Zustandsdarstellung: Es gibt weder Polling noch
automatische Nachregelung.

Beim Übergang eines Heizplans von pausiert zu aktiviert wird ein vorhandener
manueller Override beendet, der zu diesem Zeitpunkt passende Zeitplan-Mode
sofort ausgewertet und dessen Sollwert erneut angewendet. Dies gilt für das
Panel und den Home-Assistant-Switch gleichermaßen.

Sommer- und Winterzeit werden durch die lokale Home-Assistant-Zeitzone und
aware `datetime`-Werte berücksichtigt. Ein ungültiger oder nicht vorhandener
Mode-Verweis kann nicht gespeichert werden.

Die Wochenansicht ist eine Konfigurationsvorschau und ignoriert deshalb nur den
globalen `schedules[].enabled`-Schalter. Die Laufzeitauswertung respektiert ihn
weiterhin. Pausierte Mode-Zuordnungen bleiben auch in der Vorschau ausgeblendet,
weil sie innerhalb des Heizplans selbst deaktiviert sind.

## Zustandsübergänge

1. Config Entry startet: Store laden, Schema validieren/migrieren, aktuelle
   Regel berechnen und den Sollwert einmalig anwenden.
2. Panel speichert: vollständigen Snapshot serverseitig validieren, Revision
   prüfen, atomar speichern, aktuelle Regeln neu bewerten.
3. Timer erreicht nächsten Termin: alle Heizpläne neu bewerten, nur geänderte
   Sollwert-Signaturen anwenden, den nächsten Termin planen.
4. Entität nicht verfügbar oder Servicefehler: warnen beziehungsweise loggen,
   den Scheduler weiterlaufen lassen und keine aggressive Wiederholung starten.
5. Config Entry unload: Timer abbrechen und Runtime freigeben. Persistierte
   Daten werden beim Entfernen des Entries nicht still gelöscht.

