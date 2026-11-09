# Climate Planner verwenden

## Einrichtung

1. Die Integration **Climate Planner** über die Home-Assistant-Integrationsseite
   hinzufügen.
2. Einen Namen für den zentralen Planner vergeben.
3. Das neue **Climate Planner**-Panel in der Seitenleiste öffnen.

Die Integration benötigt keinen externen Dienst und keine Zugangsdaten.

## Modes und Heizpläne

In der Mode-Bibliothek werden Name und Zieltemperatur zentral gepflegt. Die
Temperatur wird im Panel mit der in Home Assistant eingestellten Einheit (°C
oder °F) angezeigt und eingegeben; gespeichert wird sie intern einheitlich in
°C. Farbe und Icon sind optional, die Farbauswahl bietet zusätzlich ein
Hex-Feld und das Icon kann über den Home-Assistant-Icon-Picker gewählt werden.
Änderungen an einem Mode gelten automatisch für jede Zuordnung, die seine
stabile Mode-ID verwendet.

Die Mode-Bibliothek ist alphabetisch sortiert und liegt mit flachen Kacheln
oberhalb der Heizpläne. Dadurch bleiben die Modes als Drag-and-Drop-Quelle
sichtbar, während bei vielen Heizplänen ausschließlich der darunterliegende
Heizplanbereich vertikal scrollt. Beim Ziehen nahe an dessen oberem oder unterem
Rand scrollt die Liste automatisch weiter. Auf schmalen Mobilansichten bleibt
der normale Seitenlauf erhalten, damit kein enger verschachtelter
Touch-Scrollbereich entsteht.

Jeder Mode kann einem Heizplan genau einmal zugeordnet werden. Ein erneutes
Hinzufügen desselben Modes wird abgewiesen. Die Zuordnung kann innerhalb des
Heizplans pausiert oder aktiviert werden; das Play/Pause-Symbol an der
Mode-Schaltfläche steuert diesen Zustand. Der rote Papierkorb direkt darunter
entfernt den Mode einschließlich seiner Wochenphasen aus diesem Heizplan, ohne
den zentralen Mode oder seine Zuordnungen in anderen Heizplänen zu verändern.
Bei älteren Daten mit mehreren Zuordnungen desselben Modes entfernt die Aktion
alle diese Zuordnungen gemeinsam.
Ein pausierter Mode wird in diesem Heizplan nicht mehr in der normalen
zeitgesteuerten Auswahl verwendet. Die Priorität wird als ganze Zahl
gespeichert. Bei gleichzeitig passenden Regeln gewinnt die höhere Priorität,
danach die zuletzt aktivierte Regel.

Ein Heizplan kann eine oder mehrere `climate`-Entitäten enthalten. Alle
ausgewählten Geräte erhalten beim Mode-Wechsel denselben Sollwert.
Die Auswahl verwendet den normalen durchsuchbaren Home-Assistant-
Entitätspicker und ist auf `climate`-Entitäten beschränkt. Zur eindeutigen
Unterscheidung gleich benannter Thermostate steht in der zweiten Zeile zuerst
die bereitstellende Integration, danach folgen – soweit in Home Assistant
hinterlegt – Bereich und Gerät, zum Beispiel
`LoRaWAN › Rikas Kinderzimmer › Thermostat Kinderzimmer Rika`. Im Formular
erscheinen nur die tatsächlich ausgewählten Entitäten; die vollständige
Entitätsliste mit Checkboxen wird nicht dauerhaft angezeigt. Beim Anlegen
eines neuen Heizplans ist zunächst keine Entität vorausgewählt.

Mit dem Duplizieren-Symbol rechts oben, direkt unter Play/Pause, wird ein
vollständiger Heizplan einschließlich Klima-Entitäten, Mode-Zuordnungen,
Wochenphasen und lokalen Temperaturwerten kopiert. Heizplan, Zuordnungen und
Phasen erhalten neue stabile IDs. Die Kopie heißt zunächst `<Name> (Kopie)`
und ist aus Sicherheitsgründen pausiert, damit sie nicht sofort parallel zum
Original dieselben Thermostate steuert.

Ein Heizplan kann pro Wochentag mehrere Phasen enthalten. Die erste Ansicht
zeigt Heizpläne und Modes als Kacheln; ausschließlich **Details öffnen** öffnet
die Wochen-Timeline. Die übrige Kachelfläche löst keinen Ansichtswechsel aus,
damit die direkt bedienbaren Schaltflächen zuverlässig und ohne versehentliche
Navigation reagieren. In der Detailansicht stehen die im Heizplan verwendeten
Modes direkt neben der Heizplanauswahl. Ein Klick auf einen dieser Modes öffnet
**Mode bearbeiten**; **Mode hinzufügen** ordnet einen noch nicht verwendeten
Mode zu. Beim Hinzufügen dient die obere Uhrzeit als Sammelwert für alle
ausgewählten Wochentage. Unter jedem ausgewählten Tag bleibt ein eigenes
Uhrzeitfeld sichtbar und kann danach unabhängig angepasst werden. Bereits
vorhandene mehrere Zeiten desselben Modes an einem Tag bleiben als getrennte
Felder erhalten.

Modes lassen sich außerdem auf einen konkreten Tag und eine Uhrzeit ziehen; die
Vorschau zeigt dabei die Zielzeit und öffnet denselben Dialog **Mode
hinzufügen** mit vorausgewähltem Tag. Ein Klick auf einen einzelnen Block der
Wochenansicht öffnet dagegen **Phase bearbeiten** ausschließlich für diesen
Block. Der Wochentag wird nur angezeigt und es erscheinen keine
Wochentags-Checkboxen, sodass die Bearbeitung keine weiteren Phasen erzeugt.
Der globale Mode bleibt dabei unverändert.

Zusätzlich zeigt jede Heizplan-Kachel die dort zugeordneten Modes mit ihrer
Zieltemperatur. Ein Klick auf einen dieser Modes aktiviert ihn sofort als
manuelle Auswahl für die zugeordneten Klima-Entitäten. Die manuelle Auswahl
hat Vorrang bis zum nächsten geplanten Wechsel; danach übernimmt der
Zeitplan wieder automatisch. Die Kachel bleibt dabei bewusst kompakt und zeigt
den zuletzt erfolgreich vom Climate Planner aktivierten Mode. Das gilt auch,
wenn eine Automation einen Climate-Planner-Dienst oder Aktivierungs-Button
verwendet.

Für jede Klima-Entität stehen drei Werte nebeneinander: **Soll ↗** ist die
aktuelle Vorgabe der Home-Assistant-Climate-Entität (`temperature`) und ändert
sich deshalb auch bei einem fremden `climate.set_temperature`-Aufruf.
**Soll ↘** ist die separate, vom Gerät zurückgemeldete Zieltemperatur
(`target_temperature`), **Ist** die aktuelle Temperatur. Stellt eine
Climate-Integration keine separate Zieltemperatur-Rückmeldung bereit, erscheint
für **Soll ↘** ein Gedankenstrich. Weicht **Soll ↗** unter Berücksichtigung der
Thermostat-Schrittweite von der letzten Climate-Planner-Vorgabe ab, erscheint
beim zuletzt aktivierten Mode der Hinweis **extern**. Der Hinweis löst keine
automatische Nachregelung aus. Der zuletzt aktivierte Mode bleibt auch nach
einem Neustart der Integration erhalten.

Phasen lassen sich im 15-Minuten-Raster verschieben, über die sichtbaren
Zeitgriffe bis zur nächsten Phase verlängern oder verkürzen und einzeln
löschen. Beim Verschieben bleibt die bisherige Blockdauer erhalten; die
folgende Zeitgrenze wird entsprechend mitverschoben. Für neue Eingaben dient
eine Dauer von acht Stunden als Richtwert, während der letzte Block eines
Tages immer bis 24:00 reicht. Echte Sollwertwechsel bleiben an die
konfigurierten Aktivierungszeiten gebunden.
Das kleine Duplizieren-Symbol rechts oben in einer Phase erzeugt die Kopie mit
gleichem Mode und lokalem Temperaturwert eine Stunde vor dem gewählten Block.
Beginnt der Block innerhalb der ersten Stunde des Tages, wird die Kopie am
Vorabend angelegt. Ist die errechnete Startzeit bereits durch einen Wechsel
belegt, öffnet sich stattdessen die Zeitauswahl; dieselbe Startzeit kann dann
nicht erneut gespeichert werden. Zusätzlich kann eine Phase mit Alt/Option
(beziehungsweise Strg/Cmd) auf einen anderen Tag oder eine andere Uhrzeit
gezogen werden, um sie dort zu kopieren; auch dabei verhindert die Zeitauswahl
doppelte Startzeiten.

Ein Mode kann auf einen Heizplan gezogen werden. Auf mobilen Geräten oder per
Tastatur ist die Schaltfläche **Mode hinzufügen** in der Detailansicht die
gleichwertige Alternative. Vor dem Speichern müssen mindestens ein Wochentag
und für jeden ausgewählten Tag eine Zeit im Format `HH:mm` angegeben sein. Eine
Uhrzeit darf innerhalb eines Modes am selben Wochentag nicht doppelt
vorkommen.

## Zeitverhalten

Ein Mode bleibt ab seiner Aktivierung bis zur nächsten passenden Aktivierung
aktiv. Nur aktivierte Heizpläne und Mode-Zuordnungen werden in der normalen
Auswahl berücksichtigt. Bei Überschneidungen gewinnt zunächst die
höhere Priorität, bei Gleichstand die jüngere Aktivierung und anschließend die
stabile Konfigurationsreihenfolge.

Wird ein pausierter Heizplan wieder aktiviert, endet eine manuelle
Mode-Übersteuerung. Climate Planner ermittelt und setzt sofort den Mode, der
gemäß Wochenplan zu diesem Zeitpunkt gültig ist.

Beim Wechsel setzt Climate Planner ausschließlich die Zieltemperatur mit
`climate.set_temperature`. HVAC-Modus, Betriebszustand, Istwerte und
Sollwert-Rückmeldung werden nicht verändert. Die Rückmeldung wird nur für die
beschriebene Anzeige verglichen; es gibt keinen Feedback-Regelkreis.

## Automationen und externe Umschaltung

Für Automationen sind folgende Dienste verfügbar:

- `climate_planner.activate_mode` mit `schedule_id` und `mode_id`: temporäre
  manuelle Auswahl bis zum nächsten geplanten Wechsel; das funktioniert auch,
  wenn die automatische Auswertung des Heizplans pausiert ist.
- `climate_planner.clear_override` mit `schedule_id`: sofort zurück zur
  Automatik.
- `climate_planner.apply_matched`, `climate_planner.apply_enabled_matching`
  und `climate_planner.apply_enabled_mode_matching`: explizites Anwenden der
  jeweils passenden Regel gemäß der beschriebenen Enable-Semantik. Optional
  kann jeweils `schedule_id` angegeben werden. Der gewählte Mode wird dabei
  als Laufzeit-Override und nach erfolgreicher Sollwertübergabe als zuletzt
  aktivierter Mode angezeigt; der Button-State weist zusätzlich die Zahl
  erfolgreicher Temperatur-Serviceaufrufe aus.

Zusätzlich legt die Integration steuerbare Entitäten an:

- einen Switch pro Heizplan für dessen automatische Aktivierung/Pause,
- einen separaten Switch pro Mode-Zuordnung innerhalb eines Heizplans,
- einen Button pro Zuordnung zur manuellen Aktivierung bis zum nächsten
  automatischen Wechsel,
- drei Buttons pro Heizplan für `apply_matched`,
  `apply_enabled_matching` und `apply_enabled_mode_matching`.

Home Assistant gruppiert diese Entitäten in einem eigenen Gerät pro Heizplan.
Die Climate-Planner-Konfiguration bleibt zentral, aber jeder Heizplan erscheint
im Gerätebereich separat mit seinen Schaltern und Buttons.

Die Zuordnungs-ID ist Teil der stabilen Unique-ID. Pro Mode und Heizplan gibt es
in der Oberfläche nur eine Zuordnung und damit einen Switch sowie einen
Aktivierungs-Button. Ein Aktivierungs-Button kann auch eine pausierte Zuordnung
manuell aktivieren.

## Wochenansicht

Die Wochenansicht zeigt für den ausgewählten Heizplan Montag bis Sonntag,
Zeitbereiche bis zum nächsten Mode-Wechsel und eine Markierung der aktuellen
Zeit. Pausierte Heizpläne behalten ihre konfigurierten Zeitblöcke in dieser
Ansicht; die Pause unterbindet nur die automatische Ausführung. Die Ansicht ist
für breite und schmale Ansichten ausgelegt.

