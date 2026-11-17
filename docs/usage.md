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

Beim Ziehen zeigt ein noch verfügbarer Heizplan eine animierte Ablage-Markierung
an der Maus und wird farblich hervorgehoben. Enthält der Heizplan den Mode
bereits, erscheinen stattdessen ein rotes Verbotssymbol und eine rote
Heizplankachel; ein Ablegen ist dort nicht möglich.

Jeder Mode kann einem Heizplan genau einmal zugeordnet werden. Ein erneutes
Hinzufügen desselben Modes wird abgewiesen. Eine neu eingefügte Zuordnung ist
zunächst pausiert und muss über das Play/Pause-Symbol ausdrücklich aktiviert
werden. Die Zuordnung kann innerhalb des Heizplans pausiert oder aktiviert
werden; das Play/Pause-Symbol an der
Mode-Schaltfläche steuert diesen Zustand. Der rote Papierkorb direkt darunter
entfernt den Mode einschließlich seiner Wochenphasen aus diesem Heizplan, ohne
den zentralen Mode oder seine Zuordnungen in anderen Heizplänen zu verändern.
Bei älteren Daten mit mehreren Zuordnungen desselben Modes entfernt die Aktion
alle diese Zuordnungen gemeinsam.
Ein pausierter Mode wird in diesem Heizplan nicht mehr in der normalen
zeitgesteuerten Auswahl verwendet. Die Priorität wird als ganze Zahl
gespeichert. Bei gleichzeitig passenden Regeln gewinnt die höhere Priorität,
danach die zuletzt aktivierte Regel.

Über das Zahnrad rechts an einem verwendeten Mode lassen sich die Einstellungen
dieser Mode-Zuordnung im Heizplan öffnen. Unter **Automatische Regeln** wird
zuerst der Name der Regel eingetragen. Im Anschluss werden der **Anlass** und
mindestens eine Aktion (**Auto ein**, **Auto aus** oder beide) festgelegt.
Gespeicherte Regeln zeigen in der Übersicht zunächst nur ihren Namen; ein Klick
auf den Regelkopf oder auf **Bearbeiten** öffnet beziehungsweise schließt die
vollständige Regel wieder. Über den Griff links lässt sich die Reihenfolge per
Drag-and-Drop ändern; diese Reihenfolge wird beim Speichern beibehalten.

Als Anlass stehen ein einmaliges Datum, ausgewählte Feiertage und **Zyklisch**
zur Verfügung. Für Auto ein und Auto aus kann jeweils eine eigene Uhrzeit
angegeben werden. Bei Feiertagen ist die Uhrzeit ebenfalls frei wählbar.
Ostersamstag und Ostersonntag sind als einzelne Feiertage vorhanden; zusätzlich
gibt es den Sammeltermin „Ostern (Karfreitag–Ostermontag)“, die Adventstermine
und „Weihnachten (24.–26. Dezember)“. Die beweglichen Termine werden lokal
berechnet. Unter **Feiertagsregion (Deutschland)** wird festgelegt, ob nur
bundesweite Feiertage oder zusätzlich die gesetzlichen Feiertage eines
Bundeslands angeboten und berechnet werden. Gemeinde- oder ortsabhängige
Sonderfälle, etwa in Teilen Bayerns, Sachsens oder Thüringens, werden nicht
automatisch berücksichtigt. Das zuletzt erreichte Ereignis bestimmt den
Aktivierungszustand; bei gleichem Zeitpunkt hat **Auto aus** Vorrang. Die
manuellen Play-/Pause-Schalter bleiben unabhängig davon bedienbar. Wird eine
bisher pausierte Mode-Zuordnung manuell eingeschaltet, endet dabei eine aktive
manuelle Mode-Auswahl und die Automatik wird sofort neu ausgewertet.

Eine Regel mit dem Anlass **Zyklisch** verwendet eine Wiederholung. Auto ein und
Auto aus besitzen dabei jeweils eigene Uhrzeit-, Startdatum- und optionale
Enddatum-Felder. Ohne Startdatum wird der aktuelle Tag als Anker verwendet.
Optional kann ein Enddatum gesetzt werden; die letzte Wiederholung am Enddatum
ist eingeschlossen. Verfügbar sind stündlich, täglich, wöchentlich, monatlich,
quartalsweise und jährlich. Das Startdatum ist dabei der Anker: Es bestimmt bei
wöchentlichen Regeln den Wochentag und bei monatlichen, quartalsweisen sowie
jährlichen Regeln den Kalendertag. Eine automatische Regel schaltet die
Mode-Zuordnung frei; die Temperatur dieser Zuordnung wirkt am jeweiligen Tag
erst ab der dort eingetragenen Tageszeit. Soll ein automatisch freigeschalteter
Mode sofort wirken, muss für den betreffenden Tag **00:00** als Tageszeit
eingetragen sein. Die automatische Regel und die Tageszeit bilden damit
gemeinsam die zeitliche Gültigkeit.

Für eine Mode-Zuordnung gibt es zentral die Option **Wochentagszeiten für
diese Mode-Zuordnung ignorieren**. Sie eignet sich besonders für Feiertage,
einmalige Termine und zyklische Regeln: Sobald die automatische Zuordnung
gültig ist, werden Wochentage und Tageszeiten nicht als zusätzliche Grenze
ausgewertet. Sie kann auch ohne automatische Regel verwendet werden; dann gilt
die aktivierte Mode-Zuordnung durchgehend. Die Wochentagsfelder werden im
Dialog ausgeblendet; die bereits gespeicherten Zeiten werden dabei nicht
gelöscht. Wird die Option später abgewählt, erscheinen sie wieder und gelten
erneut. Beim Anlegen der ersten Feiertagsregel wird die Option automatisch
aktiviert. Ohne diese Option bilden die Wochentagszeiten die zweite Zeitgrenze
nach dem automatischen Einschalten; so können beispielsweise mittwochs andere
Zeiten als an den übrigen Tagen verwendet werden.

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

Im Heizplan-Dialog kann für jede ausgewählte Klima-Entität zusätzlich ein
eigener Anzeigename hinterlegt werden. Dieser Name gilt nur in diesem Heizplan
und ändert weder die Home-Assistant-Entität noch ihre stabile ID. Ein Klick auf
die Entitätszeile im Heizplan öffnet den normalen Home-Assistant-More-Info-Dialog.

Unter **Allgemeine Einstellungen** wird zentral ein Home-Assistant-Label für
Fensterkontakte gewählt und die deutsche Feiertagsregion eingestellt. Beide
Einstellungen sind am Gerät **Climate Planner Grundeinstellungen** als
Home-Assistant-Select-Entitäten verfügbar. Dort stehen auch die Mode-Bibliothek
und ihre steuerbaren Werte als Entitäten bereit.
Für jede ausgewählte
Climate-Entität werden nur Fenster mit diesem Label aus demselben
Home-Assistant-Bereich berücksichtigt. Das ist auch bei einem Heizplan mit
Climate-Entitäten aus mehreren Bereichen eindeutig: Ein offenes Fenster senkt
nur die Climate-Entitäten desselben Bereichs ab. Die Absenktemperatur wird je
Heizplan eingestellt und ist standardmäßig auf 18,5 °C gesetzt. Die
Fenstererkennung ist je Heizplan standardmäßig aktiv und kann im Heizplan oder
über den zugehörigen Switch deaktiviert werden. Ohne zentrales Fenster-Label
ist die Fensterabsenkung deaktiviert.

Die Auswahl verwendet im Panel den nativen Home-Assistant-Label-Picker mit
Suche, Label-Farbe und optionalem Label-Icon. Der ausgewählte Eintrag wird als
native Label-Darstellung angezeigt; gespeichert wird weiterhin ausschließlich
die stabile Label-ID.

Wird ein Label in Home Assistant umbenannt, bleibt diese ID erhalten
und es muss nichts neu angelegt oder ausgewählt werden. Nur beim Löschen und
anschließenden Neuerstellen entsteht eine neue ID.

Mindestens ein sicher offenes Fenster löst nach der im Heizplan eingestellten
Verzögerung die Absenkung aus. Die Verzögerung kann zwischen 5 und 1800
Sekunden liegen; das Panel bietet dafür 5, 10, 30, 60, 120, 300, 600, 900 und
1800 Sekunden als Vorschläge an. Standardmäßig beträgt sie fünf Sekunden. Ältere
Werte unter fünf Sekunden werden beim Laden auf fünf Sekunden angehoben. Während
der Öffnungsverzögerung zeigt der Heizplan einen Countdown bis zur Absenkung an.
Sind
alle zugeordneten Fenster sicher geschlossen, wird die Temperatur des aktuell
aktiven Modes intern nach fünf Sekunden wiederhergestellt; diese
Schließverzögerung ist nicht einstellbar. Unbekannte oder nicht verfügbare
Fensterzustände lösen keine neue Umschaltung aus; der bisherige effektive
Zustand bleibt erhalten. Ein Modewechsel während eines offenen Fensters hält
die Absenkung aufrecht und wird beim späteren Schließen berücksichtigt.

Mit dem Duplizieren-Symbol rechts oben, direkt unter Play/Pause, wird ein
vollständiger Heizplan einschließlich Klima-Entitäten, Mode-Zuordnungen,
Wochenphasen und lokalen Temperaturwerten kopiert. Heizplan, Zuordnungen und
Phasen erhalten neue stabile IDs. Die Kopie heißt zunächst `<Name> (Kopie)`
und ist aus Sicherheitsgründen pausiert, damit sie nicht sofort parallel zum
Original dieselben Thermostate steuert.

Als Administrator können die Schaltflächen **Alles exportieren** und
**Importieren** die vollständige Climate-Planner-Konfiguration als JSON sichern
und wiederherstellen. Auf jeder Heizplankachel gibt es außerdem einen Export
für genau diesen Heizplan; dabei werden nur die verwendeten Modes mitgenommen.
Die gespeicherten Phasen werden unverändert exportiert. Das schließt lokale
`target_temperature`-Überschreibungen ein, auch wenn sie von der zentralen
Mode-Temperatur abweichen.

Beim Import werden die Heizpläne zunächst nicht gespeichert. Für jeden Plan
werden vorhandene Climate-Entitäten ausgewählt oder neu zugeordnet. Erst wenn
jeder importierte Plan mindestens eine Ziel-Entität besitzt, kann der Import
abgeschlossen werden; ein vorhandener Heizplan ist dafür nicht erforderlich.
Ein vollständiger Import ersetzt die aktuelle Konfiguration nach einer
Bestätigung. Ein Einzelimport fügt den Plan und seine Modes hinzu, vergibt
neue IDs und bleibt zunächst pausiert, damit die neuen Zielgeräte nicht
unbeabsichtigt sofort gesteuert werden.

Ein Heizplan kann pro Wochentag mehrere Phasen enthalten. Die erste Ansicht
zeigt Heizpläne und Modes als Kacheln; ausschließlich **Details öffnen** öffnet
die Wochen-Timeline. Die übrige Kachelfläche löst keinen Ansichtswechsel aus,
damit die direkt bedienbaren Schaltflächen zuverlässig und ohne versehentliche
Navigation reagieren. In der Detailansicht stehen die im Heizplan verwendeten
Modes direkt neben der Heizplanauswahl. Ein Klick auf einen dieser Modes öffnet
**Mode bearbeiten**; **Mode hinzufügen** ordnet einen noch nicht verwendeten
Mode zu. Beim Hinzufügen dient die obere Uhrzeit als Sammelwert für alle
ausgewählten Wochentage. Über **Mode hinzufügen** wählen neue Zuordnungen
standardmäßig alle sieben Wochentage; mit **Alle anwählen** und **Alle
abwählen** lässt sich die Auswahl schnell ändern. Unter jedem ausgewählten Tag bleibt ein eigenes
Uhrzeitfeld sichtbar und kann danach unabhängig angepasst werden. Eine
Änderung der Sammelzeit betrifft ausschließlich die in diesem Moment
ausgewählten Tage; später erneut ausgewählte Tage behalten ihre zuvor
eingetragene Zeit. Bereits vorhandene mehrere Zeiten desselben Modes an einem
Tag bleiben als getrennte Felder erhalten. Das Plus-Symbol unter den Zeiten
eines Tages fügt eine weitere Zeit desselben Modes hinzu; beim Speichern wird
sie als zusätzliche Phase dieses Wochentags angelegt. Über das Papierkorb-Symbol
können zusätzliche Zeiten wieder entfernt werden. Wird die letzte Zeit eines
Tages entfernt, wird der Wochentag automatisch deaktiviert; beim erneuten
Aktivieren wird wieder eine Zeit mit der Sammelzeit angelegt. Wird eine bestehende Startzeit
verschoben, bleibt die bisherige Blockdauer erhalten und der unmittelbar
folgende Wechsel wird entsprechend mitverschoben. Die verwendeten Modes neben
der Heizplanauswahl sind ebenfalls ziehbar: Beim Ablegen auf einen Tag und eine
Uhrzeit wird direkt eine weitere Phase derselben Mode-Zuordnung angelegt.
Neben jedem verwendeten Mode steht außerdem der Play-/Pause-Schalter für diese
Zuordnung zur Verfügung.

Die Wochenansicht zeigt parallele Mode-Zuordnungen eines Tages in getrennten
nebeneinanderliegenden Spuren. Eine Spur beginnt erst mit der ersten an diesem
Tag konfigurierten Phase; ein Mode mit hoher Priorität, dessen erste Phase um
01:00 beginnt, wird daher nicht bereits für 00:00–01:00 angezeigt oder
aktiviert. Bei der Laufzeitauswahl kann in diesem Zeitraum weiterhin ein
niedriger priorisierter Carry-over-Mode des Vortags gültig sein.

Das Duplizieren-Symbol eines Tagesblocks übernimmt die Dauer dieses Blocks und
setzt das Duplikat direkt davor. Reicht der Platz bis zum Tagesanfang nicht,
wird die Startzeit so weit nach hinten verschoben, dass der vorherige Mode
mindestens eine Stunde behält; ohne vorherigen Mode ist 01:00 die früheste
Startzeit.

Modes lassen sich außerdem auf einen konkreten Tag und eine Uhrzeit ziehen; die
Vorschau zeigt dabei die Zielzeit und öffnet denselben Dialog **Mode
hinzufügen** mit vorausgewähltem Tag. Ein Klick auf einen einzelnen Block der
Wochenansicht öffnet dagegen **Phase bearbeiten** ausschließlich für diesen
Block. Der Wochentag wird nur angezeigt und es erscheinen keine
Wochentags-Checkboxen, sodass die Bearbeitung keine weiteren Phasen erzeugt.
Der globale Mode bleibt dabei unverändert.

Zusätzlich zeigt jede Heizplan-Kachel die dort zugeordneten Modes mit ihrer
wirksamen Zieltemperatur. Ein Klick auf einen dieser Modes öffnet **Mode
bearbeiten**. Die dort eingetragene Temperatur überschreibt die zentrale
Mode-Temperatur für die Phasen dieser Zuordnung; der globale Mode bleibt dabei
unverändert. Der
rechte Schalter steuert nur, ob die Mode-Zuordnung in der Automatik verwendet
wird; das Play-Symbol links oben aktiviert den Mode dagegen sofort als manuelle
Auswahl für die zugeordneten Klima-Entitäten. Die manuelle Auswahl hat Vorrang
bis zum nächsten geplanten Wechsel; danach übernimmt der Zeitplan wieder
automatisch. Wird anschließend eine andere pausierte Mode-Zuordnung über ihren
rechten Schalter eingeschaltet, endet die manuelle Auswahl ebenfalls sofort und
die zeitlich passende Zuordnung mit der höchsten Priorität wird angewendet. Das
funktioniert auch bei pausiertem Heizplan.
Die Kachel bleibt dabei bewusst kompakt und zeigt den zuletzt erfolgreich vom
Climate Planner aktivierten Mode. Das gilt auch, wenn eine Automation einen
Climate-Planner-Dienst oder Aktivierungs-Button verwendet.

Für jede Klima-Entität stehen **Soll** und **Ist** nebeneinander. **Soll** ist
der aktuelle Sollwert der Climate-Entität aus dem Attribut `temperature`.
Weicht dieser unter Berücksichtigung der Thermostat-Schrittweite von der
letzten Planner-Vorgabe ab, erscheint der Hinweis **extern** ohne zusätzlichen
Temperaturwert. Während der Fenster-Absenkung wird der tatsächliche
Absenk-Sollwert angezeigt, aber nicht als **extern** markiert. Der Hinweis löst
keine automatische Nachregelung aus. Interne Sollwertwechsel des Planners
werden während der laufenden Service-Anfrage und für eine kurze Rückmeldezeit
nicht als extern markiert; bleibt die Abweichung danach bestehen, wird sie
angezeigt. **Zuletzt aktiviert** bleibt der zuletzt
vom Climate Planner aktivierte Mode; die Anzeige **Fenster offen – Absenkung
aktiv** bleibt dabei erhalten. Der zuletzt aktivierte Mode bleibt auch nach
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

Bei einer normalen Mode-Zuordnung bleibt ein Mode ab seiner Aktivierung bis zur
nächsten passenden Aktivierung aktiv. Nur aktivierte Heizpläne und
Mode-Zuordnungen werden in der normalen
Auswahl berücksichtigt. Bei Überschneidungen gewinnt zunächst die
höhere Priorität, bei Gleichstand die jüngere Aktivierung und anschließend die
stabile Konfigurationsreihenfolge. Die Priorität schaltet einen Mode nicht ein
und ersetzt keine Uhrzeit: Sie entscheidet nur, welcher bereits zeitlich
gültige Mode gewinnt. Bei Mode-Zuordnungen mit automatischen Regeln wird nur
eine bereits erreichte Phase des aktuellen lokalen Tages berücksichtigt.

Beispiel: Ein normaler Mode mit 21 °C hat Priorität 0 und beginnt um 06:00.
Ein Geburtstags-Mode mit 22 °C hat Priorität 10, wird am Geburtstag per Auto
ein freigeschaltet und beginnt an diesem Wochentag um 07:00. Bis 07:00 bleiben
21 °C aktiv; von 07:00 bis Auto aus gewinnt der Geburtstags-Mode mit 22 °C.
Soll der Geburtstags-Mode direkt bei Auto ein wirken, wird für den Tag 00:00
eingetragen. Auto aus beendet die Freigabe; danach greift wieder der passende
Mode mit niedrigerer Priorität.

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
  jeweils passenden Regel gemäß der beschriebenen Enable-Semantik. Die
  zeitliche Gültigkeit der Tagesphasen wird auch bei `apply_matched`
  berücksichtigt; dieser Dienst ignoriert zusätzlich weiterhin alle
  Enable-Schalter. Optional kann jeweils `schedule_id` angegeben werden. Der
  gewählte Mode wird dabei als Laufzeit-Override und nach erfolgreicher
  Sollwertübergabe als zuletzt aktivierter Mode angezeigt; der Button-State
  weist zusätzlich die Zahl erfolgreicher Temperatur-Serviceaufrufe aus.

Zusätzlich legt die Integration steuerbare Entitäten an:

- ein eigenes Gerät **Climate Planner Grundeinstellungen** mit den globalen
  Select-Entitäten für Fenster-Label und Feiertagsregion,
- je Mode Number-Entitäten für Zieltemperatur und Priorität sowie Text-
  Entitäten für Name, Icon und Farbe,
- einen Switch pro Heizplan für dessen automatische Aktivierung/Pause,
- einen Switch pro Heizplan für die Fenstererkennung,
- je Heizplan Text-Entitäten für Name, Klima-Entitätsliste und lokale
  Anzeigenamen sowie eine Number-Entität für die Absenktemperatur,
- einen separaten Switch pro Mode-Zuordnung innerhalb eines Heizplans,
- einen Select pro Mode-Zuordnung zur Auswahl des verwendeten Modes,
- einen Button pro Zuordnung zur manuellen Aktivierung bis zum nächsten
  automatischen Wechsel,
- drei Buttons pro Heizplan für `apply_matched`,
  `apply_enabled_matching` und `apply_enabled_mode_matching`.

Zusätzlich gibt es Konfigurations-Sensoren: Der globale Sensor enthält die
vollständige Mode-Bibliothek, der Heizplan-Sensor alle Planwerte einschließlich
Klima-Entitäten und Anzeigenamen, und der Sensor jeder Zuordnung enthält die
Wochenphasen und automatischen Regeln. Damit sind auch verschachtelte
Einstellungen über Zustandsattribute adressierbar.

Home Assistant gruppiert globale Entitäten im Gerät **Climate Planner
Grundeinstellungen** und plan- beziehungsweise zuordnungsbezogene Entitäten im
jeweiligen Heizplan-Gerät.

Die Zuordnungs-ID ist Teil der stabilen Unique-ID. Pro Mode und Heizplan gibt es
in der Oberfläche nur eine Zuordnung und damit einen Switch sowie einen
Aktivierungs-Button. Ein Aktivierungs-Button kann auch eine pausierte Zuordnung
manuell aktivieren.

## Wochenansicht

Die Wochenansicht zeigt für den ausgewählten Heizplan Montag bis Sonntag,
Zeitbereiche bis zum nächsten Mode-Wechsel und eine Markierung der aktuellen
Zeit. Pausierte Heizpläne behalten ihre konfigurierten Zeitblöcke in dieser
Ansicht; die Pause unterbindet nur die automatische Ausführung. Das Symbol zum
Duplizieren erscheint nur am tatsächlichen Beginn einer Phase; bei einer über
Mitternacht fortgesetzten Phase erscheint es nicht erneut. Beginnt eine Phase
um 00:00, bleibt das Symbol am aktuellen Tag. Die Ansicht ist für breite und
schmale Ansichten ausgelegt.

