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
  zugeordnet. Beim Löschen eines Heizplans entfernt der dynamische
  Entitätsmanager die zugehörigen Entitäten und das leere Heizplan-Gerät auch
  aus den Home-Assistant-Registern.
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
  dauerhafte Planänderung gespeichert. Wird eine bisher pausierte Mode-
  Zuordnung eingeschaltet, endet ein aktiver manueller Override und die
  zeitgesteuerte Auswahl wird sofort neu bewertet.
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
    ├── window_open_enabled     # Fensterabsenkung für diesen Heizplan
    ├── window_open_temperature # Absenktemperatur bei offenem Fenster in °C
    ├── window_open_delay_seconds # Öffnungsverzögerung, 0 bis 1800 Sekunden
    ├── enabled
    └── assignments[]
        ├── id
        ├── mode_id              # stabile Referenz in modes[]
        ├── enabled
        ├── continuous?         # Wochentagszeiten für die Zuordnung ignorieren
        ├── auto_rules[]?        # beliebig viele automatische Regelgruppen
        │   ├── id
        │   ├── name              # Bezeichnung der Regel
        │   ├── kind              # date, holiday oder cycle
        │   ├── date?             # ISO-Datum für kind=date
        │   ├── holiday?          # unterstützter Feiertag für kind=holiday
        │   ├── recurrence?       # hourly, daily, weekly, monthly, quarterly, yearly
        │   └── actions           # mindestens on oder off
        │       ├── on?
        │       │   ├── time       # HH:mm
        │       │   ├── start_date? # ISO-Startdatum für kind=cycle
        │       │   └── end_date?   # inklusives ISO-Enddatum für kind=cycle
        │       └── off?           # gleiche Struktur wie on
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

Die Wochenansicht liefert zusätzlich pro aktivierter Mode-Zuordnung eine eigene
Spur, damit parallele Zuordnungen desselben Tages nebeneinander statt als eine
gemeinsame Gewinner-Timeline sichtbar sind. Diese Spuren verwenden nur die
Phasen des jeweiligen Tages und übernehmen keine Phase des Vortags vor der
ersten Tagesphase.

Die Umstellung von `climate_entity_id` auf `climate_entity_ids` bleibt innerhalb
von Schema 1 abwärtskompatibel: Beim Laden wird ein früherer Einzelwert in eine
Liste überführt und anschließend kanonisch gespeichert.

Eine Temperatur-Übersteuerung an einer Phase gehört zur jeweiligen
Mode-Zuordnung im Heizplan und verändert den globalen Mode nicht. Die
Heizplankachel zeigt diese Zuordnungstemperatur an, sofern sie für alle Phasen
gleich ist; bei einer manuellen Aktivierung wird die aktuell gültige
Phasen-Übersteuerung ebenfalls verwendet.

Der WebSocket-Snapshot ergänzt die gespeicherten Entity-IDs nur für die Anzeige
um Namen von Integration, Bereich und Gerät aus den entsprechenden
Home-Assistant-Registern. Diese Metadaten werden nicht Teil des persistenten
Planner-Dokuments und beim nächsten Snapshot erneut ermittelt.

Ein zwischenzeitlich verwendetes globales `modes[].enabled` wird beim Laden
abwärtskompatibel in `assignments[].enabled` des jeweiligen Heizplans
überführt; neue Daten führen den Aktivierungszustand ausschließlich an der
Mode-Zuordnung.

`auto_rules[]` gehört ausschließlich zur Mode-Zuordnung, sodass mehrere
Auto-ein-/Auto-aus-Ereignisse pro Zuordnung möglich sind. Einmalige Datumsregeln
werden nur am angegebenen Tag ausgelöst; berechnete Feiertage wiederholen sich
jährlich. Eine zyklische Regel erzeugt
Ereignisse anhand ihres Intervalls und Ankerdatums. Das zuletzt erreichte Ereignis
bestimmt den Zustand; bei gleichem Datum gewinnt Auto aus. Manuelle Änderungen
des Play-/Pause-Zustands bleiben unabhängig davon möglich. Die Laufzeit merkt
sich getrennt, welches Ereignis bereits angewendet wurde, damit ein manueller
Zustand nicht bei jeder Auswertung sofort wieder überschrieben wird.
Start- und Enddatum einer zyklischen Regel sind optional. Ohne Startdatum wird
der aktuelle lokale Tag als Anker verwendet. Das optionale Enddatum begrenzt die
erzeugten zyklischen Ereignisse einschließlich des Enddatums. Es kehrt die
Aktion nicht automatisch um; für ein automatisches Abschalten wird weiterhin
eine eigene Auto-aus-Regel benötigt. Wird eine Mode-Zuordnung durch eine
automatische Regel freigeschaltet, beginnt ihre Temperaturwirkung am jeweiligen
Tag erst mit der erreichten Wochenphase dieses Tages. Eine Tagesphase um
00:00 erlaubt die sofortige Wirkung bei Auto ein; Phasen vergangener Tage
werden für diese automatische Freigabe nicht übernommen. Setzt eine
Mode-Zuordnung `continuous: true`, bilden dagegen die automatischen Ereignisse
die Aktivierungs- und Deaktivierungsgrenzen; fehlen automatische Regeln, gilt
die Zuordnung während ihrer Aktivierung durchgehend. Die Wochentagsphasen
werden in diesem Zeitraum nicht benötigt und können leer sein. Sie bleiben bei
einer späteren Abwahl der Option als Konfiguration erhalten. Das frühere
`continuous`-Feld an einzelnen automatischen Regeln wird bei der Normalisierung
weiterhin als Abwärtskompatibilität unterstützt und in die zentrale Zuordnung
übernommen.
Jede Regel kann optional eine eigene Bezeichnung tragen. Die Reihenfolge der
Regeln ist die Reihenfolge der Liste und kann im Panel per Drag-and-Drop geändert
werden; sie wird beim Speichern zusammen mit den Regeln übernommen.

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

Für einen lokalen, zeitzonenbewussten Zeitpunkt werden bei normalen
Mode-Zuordnungen die Regeln des aktuellen Tages und der vergangenen sieben Tage
betrachtet. So bleibt der letzte Mode aus dem vorherigen Wochenzyklus über
Mitternacht und am Tagesanfang wirksam. Mode-Zuordnungen mit automatischen
Regeln bilden eine zeitlich begrenzte Freigabe: Für sie werden nur Phasen des
aktuellen Tages berücksichtigt, die bereits erreicht sind. Zuerst gewinnt der
Mode mit der höheren Priorität. Bei gleicher Priorität gewinnt die jüngste
passende Aktivierung; bei identischem Zeitpunkt entscheiden die konfigurierte
Zuordnungs- und Mode-Reihenfolge deterministisch. Pausierte Mode-Zuordnungen
werden in der normalen Auswahl übersprungen. Beginnt eine höher priorisierte
Zuordnung am aktuellen Tag erst später, wird ihr Carry-over aus dem Vortag bis
zu dieser ersten Tagesphase nicht vorgezogen; ein niedriger priorisierter
Carry-over kann in dieser Zeit weiter gültig bleiben.

Die drei expliziten Apply-Dienste bilden die ioBroker-Aktionen ab:

- `climate_planner.apply_matched` ignoriert Heizplan- und Zuordnungs-
  Schalter, berücksichtigt aber weiterhin die zeitlich gültige Tagesphase.
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

Das Panel stellt den aktuellen Sollwert der Climate-Entität aus `temperature`
als `Soll` und die aktuelle Temperatur als `Ist` dar. Der Sollwert wird mit der
letzten Planner-Vorgabe verglichen. Weicht er unter Berücksichtigung der
Thermostat-Schrittweite ab, erscheint der wertlose Hinweis `extern`; der zuletzt
aktivierte Mode bleibt davon getrennt als Verlauf erhalten. Während einer
Fenster-Absenkung wird der tatsächliche Absenk-Sollwert angezeigt, ohne den
Hinweis `extern` zu setzen. Laufende interne Planner-Aufträge werden im
Snapshot kenntlich gemacht; zusätzlich wartet die Anzeige kurz auf die
Rückmeldung der Climate-Entität. Erst eine danach weiterhin bestehende
Abweichung wird als `extern` markiert. Das ist reine Zustandsdarstellung: Es
gibt weder Polling noch automatische Nachregelung.

Beim Übergang eines Heizplans von pausiert zu aktiviert wird ein vorhandener
manueller Override beendet, der zu diesem Zeitpunkt passende Zeitplan-Mode
sofort ausgewertet und dessen Sollwert erneut angewendet. Dies gilt für das
Panel und den Home-Assistant-Switch gleichermaßen. Das Einschalten einer
bisher pausierten Mode-Zuordnung hat dieselbe Wirkung auf einen manuellen
Override, ohne den Heizplan-Schalter zu verändern.

Für die Fensterabsenkung wird das Home-Assistant-Label zentral im Panel unter
„Allgemeine Einstellungen“ ausgewählt; die deutsche Feiertagsregion wird dort
ebenfalls festgelegt. Beide Werte sind am Gerät „Climate Planner
Grundeinstellungen“ als Select-Entitäten verfügbar. Die Mode-Bibliothek und
ihre skalaren Werte werden dort ebenfalls als Text- und Number-Entitäten
angeboten. Je Heizplan gibt es zusätzlich Text- und Number-Entitäten für Name,
Klima-Entitätsliste, Anzeigenamen und Absenktemperatur; `window_open_enabled`
ist standardmäßig `true` und kann über einen Switch deaktiviert werden. Die
Öffnungsverzögerung wird ausschließlich im Heizplan-Dialog eingestellt und
nicht als eigene Entität angeboten.
Konfigurations-Sensoren stellen die vollständigen globalen, planbezogenen und
zuordnungsbezogenen Daten einschließlich Wochenphasen und automatischer Regeln
als Attribute bereit.
Deaktivierte Heizpläne erhalten keine Fenster-Listener und keine
Fensterabsenkung.
Das Panel zeigt dabei den Namen aus der Label-Registry, während die
Konfiguration die stabile Label-ID speichert. Eine Umbenennung des Labels
ändert die ID nicht; nur Löschen und Neuerstellen erzeugt eine neue ID.
Ein Fensterkontakt wird nur dann einer
Climate-Entität zugeordnet, wenn beide im selben Home-Assistant-Bereich liegen.
Dadurch können Climate-Entitäten aus mehreren Bereichen im selben Heizplan
unabhängig behandelt werden. Mindestens ein sicher offener Kontakt im Bereich
löst nach der planbezogenen Öffnungsverzögerung die Absenkung aus; standardmäßig
sind das fünf Sekunden. Erst wenn alle Kontakte sicher geschlossen sind, wird
nach einer festen internen Verzögerung von fünf Sekunden die Temperatur des
aktuell aktiven Modes wieder angewendet. Unbekannte oder nicht verfügbare
Kontakte lösen keine neue Umschaltung aus und halten den bisherigen effektiven Zustand. Ein
Modewechsel ändert die Absenkung nicht, aktualisiert aber den Mode, dessen
Temperatur beim Schließen wiederhergestellt wird.

Die Feiertagsberechnung verwendet die globale Einstellung
`holiday_region`. `national` beschränkt die gesetzlichen Feiertage auf die
bundesweit geltenden Termine; eine Auswahl der 16 deutschen Bundesländer ergänzt
die jeweiligen landesweiten Feiertage. Gemeindeabhängige Sonderfälle werden
nicht aufgelöst.

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

