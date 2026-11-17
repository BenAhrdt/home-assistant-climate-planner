/* Climate Planner panel: authenticated Home Assistant WebSocket only. */
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const newId = (prefix) => {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const EXTERNAL_TARGET_GRACE_MS = 1200;
const WINDOW_LABEL_FORM_SCHEMA = [{
  name: "window_label",
  required: false,
  selector: { label: {} },
}];
const labels = {
  de: {
    title: "Zeitgesteuerte Heizpläne", overview: "Übersicht", modes: "Mode-Bibliothek", schedules: "Heizpläne",
    week: "Wochenansicht", addMode: "Mode anlegen", addSchedule: "Heizplan anlegen",
    addAssignment: "Mode hinzufügen", editAssignment: "Mode bearbeiten", editPhase: "Phase bearbeiten", usedModes: "Verwendete Modes", details: "Details öffnen", edit: "Bearbeiten", remove: "Löschen", save: "Speichern",
    cancel: "Abbrechen", name: "Name", temperature: "Zieltemperatur", priority: "Priorität", priorityHint: "Höhere Zahl = gewinnt bei Überschneidung. Beispiel: Normal 21 °C (Priorität 0), Geburtstag 22 °C (Priorität 10): Sobald beide zeitlich gültig sind, gilt 22 °C. Die Priorität ersetzt keine Uhrzeit.", color: "Farbe (optional)",
    icon: "Icon (optional, z. B. mdi:leaf)", hexColor: "Hex-Farbwert", iconPlaceholder: "mdi:leaf", climate: "Klima-Entitäten", entityDisplayName: "Anzeigename (optional)", entityDisplayNamePlaceholder: "Name in diesem Heizplan", enabled: "Aktiviert", generalSettings: "Allgemeine Einstellungen", windowSettings: "Fenster-Erkennung", windowLabel: "Fenster-Label", noWindowLabel: "Kein Label", windowLabelHint: "Zentrale Auswahl für Fensterkontakte in allen Heizplänen.", saveWindowLabel: "Speichern", holidayRegion: "Feiertagsregion (Deutschland)", holidayRegionHint: "Filtert regionale gesetzliche Feiertage. Lokale Sonderfälle werden nicht berücksichtigt.", holidayRegionNational: "Nur bundesweite Feiertage", unavailableRegion: "in dieser Region nicht aktiv", regionBw: "Baden-Württemberg", regionBy: "Bayern", regionBe: "Berlin", regionBb: "Brandenburg", regionHb: "Bremen", regionHh: "Hamburg", regionHe: "Hessen", regionMv: "Mecklenburg-Vorpommern", regionNi: "Niedersachsen", regionNw: "Nordrhein-Westfalen", regionRp: "Rheinland-Pfalz", regionSl: "Saarland", regionSn: "Sachsen", regionSt: "Sachsen-Anhalt", regionSh: "Schleswig-Holstein", regionTh: "Thüringen", windowDetection: "Fensteröffnung berücksichtigen", windowDetectionOff: "Fenstererkennung deaktiviert", enableWindowDetection: "Fenstererkennung aktivieren", disableWindowDetection: "Fenstererkennung deaktivieren", windowOpenTemperature: "Absenktemperatur bei offenem Fenster", windowOpenTemperatureHint: "Standard: 18,5 °C; gilt für Fenster mit dem zentral ausgewählten Label im selben Raum wie die Climate-Entität.", windowOpen: "Fenster offen – Absenkung aktiv",
    sameTime: "Gleiche Uhrzeit", individualTime: "Individuelle Uhrzeiten", weekdays: "Wochentage", addTime: "Weitere Zeit", removeTime: "Zeit entfernen", autoRules: "Automatische Regeln", autoDailyStartHint: "Wenn du hier eine automatische Regel anlegst, schaltet sie die Zuordnung frei. Die Temperatur wirkt an diesem Tag erst ab der eingetragenen Tageszeit. Soll der Mode sofort bei Auto ein wirken, wähle 00:00 Uhr.", addAutoRule: "Weitere Regel", removeAutoRule: "Regel entfernen", autoAction: "Aktion", autoActionEmpty: "Aktion auswählen", autoOn: "Auto ein", autoOff: "Auto aus", autoKind: "Anlass", autoKindEmpty: "Anlass auswählen", autoKindDate: "Einmaliges Datum", autoKindHoliday: "Feiertag", autoKindCycle: "Zyklisch", autoRuleName: "Name", autoRuleNamePlaceholder: "z. B. Mittwochs lang", autoDrag: "Regel verschieben", autoRuleIncomplete: "Bitte Name, Anlass und mindestens Auto ein oder Auto aus ausfüllen.", autoRuleCollapse: "Einklappen", autoRuleEndBeforeStart: "Das Enddatum darf nicht vor dem Startdatum liegen.", autoRecurrence: "Wiederholung", recurrenceHourly: "Stündlich", recurrenceDaily: "Täglich", recurrenceWeekly: "Wöchentlich", recurrenceMonthly: "Monatlich", recurrenceQuarterly: "Quartalsweise", recurrenceYearly: "Jährlich", autoStartDate: "Startdatum (optional)", autoEndDate: "Enddatum (optional)", autoStartTime: "Startzeit", autoOnTime: "Uhrzeit Auto ein", autoOffTime: "Uhrzeit Auto aus", autoOnStartDate: "Startdatum Auto ein", autoOnEndDate: "Enddatum Auto ein", autoOffStartDate: "Startdatum Auto aus", autoOffEndDate: "Enddatum Auto aus", autoCycleHint: "Ohne Startdatum wird der aktuelle Tag als Anker verwendet.", autoContinuous: "Wochentagszeiten für diese Mode-Zuordnung ignorieren", autoContinuousHint: "Die Mode-Zuordnung verwendet dann keine zusätzlichen Wochentage oder Tageszeiten. Gespeicherte Zeiten bleiben erhalten.", autoContinuousNeedsRule: "Bitte zuerst mindestens eine automatische Regel anlegen.", autoDate: "Datum", autoHoliday: "Feiertag", autoRecurringHint: "Wiederholt sich jährlich.", autoCalculatedHint: "Wird automatisch berechnet.", autoHolidayNewYear: "Neujahr", autoHolidayEpiphany: "Heilige Drei Könige", autoHolidayInternationalWomensDay: "Internationaler Frauentag", autoHolidayGoodFriday: "Karfreitag", autoHolidayEasterSaturday: "Ostersamstag", autoHolidayEasterMonday: "Ostermontag", autoHolidayEasterSunday: "Ostersonntag", autoHolidayWhitSunday: "Pfingstsonntag", autoHolidayLabourDay: "Tag der Arbeit", autoHolidayAscension: "Christi Himmelfahrt", autoHolidayWhitMonday: "Pfingstmontag", autoHolidayCorpusChristi: "Fronleichnam", autoHolidayMariaHimmelfahrt: "Mariä Himmelfahrt", autoHolidayWorldChildrenDay: "Weltkindertag", autoHolidayGermanUnity: "Tag der Deutschen Einheit", autoHolidayReformationDay: "Reformationstag", autoHolidayAllSaintsDay: "Allerheiligen", autoHolidayRepentanceDay: "Buß- und Bettag", autoHolidayAdvent1: "1. Advent", autoHolidayAdvent2: "2. Advent", autoHolidayAdvent3: "3. Advent", autoHolidayAdvent4: "4. Advent", autoHolidayAllAdvent: "Alle Adventssonntage", autoHolidayEasterPeriod: "Ostern (Karfreitag–Ostermontag)", autoHolidayChristmasEve: "Heiligabend", autoHolidayChristmasDay: "1. Weihnachtsfeiertag", autoHolidayBoxingDay: "2. Weihnachtsfeiertag", autoHolidayChristmasPeriod: "Weihnachten (24.–26. Dezember)", autoHolidayNewYearsEve: "Silvester",
    time: "Uhrzeit", bulkTime: "Uhrzeit für ausgewählte Tage", weekday: "Wochentag", transition: "Übergang verschieben", phase: "Phase", duplicate: "Duplizieren", duplicating: "Heizplan wird dupliziert …", placeDuplicate: "Duplikat platzieren", duplicateTimeOccupied: "Eine Stunde vor diesem Mode liegt bereits ein Wechsel. Bitte eine andere Uhrzeit wählen.", duplicateNoRoom: "Vor diesem Mode ist nicht genug Platz für die Duplikatdauer. Der vorherige Mode behält mindestens eine Stunde.", selectAllDays: "Alle anwählen", clearAllDays: "Alle abwählen", copySuffix: "Kopie", defaultDuration: "Richtwert: 8 Stunden · letzter Block bis 24:00", drop: "Mode auf die Heizplankachel ziehen", chooseMode: "Mode direkt aktivieren", noModes: "Noch keine Modes angelegt.",
    bulkTimeHint: "Wird auf die angehakten Wochentage angewendet.",
    noSchedules: "Noch keine Heizpläne angelegt.", active: "Aktiver Mode", lastActivated: "Zuletzt aktiviert", external: "extern", manual: "Manuell", automatic: "Automatik verwenden", manualUntil: "Automatik ab", activateSchedule: "Heizplan aktivieren", pauseSchedule: "Heizplan pausieren", activateMode: "Mode direkt aktivieren", activateAssignment: "Mode-Zuordnung für Automatik aktivieren", pauseMode: "Mode-Zuordnung pausieren", targetRequestShort: "Soll", targetRequest: "Aktueller Sollwert der Klima-Entität", currentShort: "Ist", next: "Nächster Wechsel",
    none: "Noch kein Mode aktiviert", refresh: "Aktualisieren", exportAll: "Alles exportieren", exportSchedule: "Heizplan exportieren", import: "Importieren", loading: "Wird geladen …",
    importTitle: "Climate-Planner-Import", importHint: "Ordne jeden importierten Heizplan mindestens einer vorhandenen Climate-Entität zu. Beim vollständigen Import wird die aktuelle Konfiguration ersetzt; ein einzelner Heizplan wird zusätzlich angelegt und zunächst pausiert.", importEntities: "Ziel-Entitäten", importNoSelection: "Bitte wähle für jeden Heizplan mindestens eine Climate-Entität.", importInvalid: "Die Datei ist kein gültiger Climate-Planner-Export.", importReplaceConfirm: "Die aktuelle Climate-Planner-Konfiguration wird durch den vollständigen Import ersetzt. Fortfahren?", importSettingsSkipped: "Die exportierten globalen Einstellungen konnten nicht vollständig übernommen werden.", imported: "Import abgeschlossen.", importedSchedule: "Heizplan importiert und pausiert.",
    saveError: "Speichern fehlgeschlagen", conflict: "Die Daten wurden geändert. Ansicht wird neu geladen.",
    invalid: "Bitte prüfe die Eingaben.", localTemperature: "Temperatur für diese Phase überschreiben", inherited: "Mode-Temperatur", deleteMode: "Mode wirklich löschen? Zugehörige Zuordnungen werden entfernt.", deletePhase: "Phase wirklich löschen?",
    deleteSchedule: "Heizplan wirklich löschen?", deleteAssignment: "Mode aus diesem Heizplan entfernen? Alle zugehörigen Phasen werden gelöscht.", modeAlreadyAssigned: "Dieser Mode ist bereits in diesem Heizplan enthalten.",
    missingDay: "Mindestens ein Wochentag ist erforderlich.", invalidTime: "Jede ausgewählte Regel braucht eine gültige Uhrzeit (HH:mm).", duplicateDayTime: "Jede Uhrzeit darf pro Wochentag nur einmal vorkommen.",
    noClimate: "Keine climate-Entität gefunden.", selectSchedule: "Heizplan auswählen", noWeek: "Keine Zeitbereiche vorhanden.",
    dragHint: "Ziehe einen Mode aus der Bibliothek auf eine beliebige Stelle der Heizplankachel.", dropReady: "Mode ablegen", dropBlocked: "Bereits enthalten", unavailable: "nicht verfügbar",
    monday: "Montag", tuesday: "Dienstag", wednesday: "Mittwoch", thursday: "Donnerstag", friday: "Freitag", saturday: "Samstag", sunday: "Sonntag",
  },
  en: {
    title: "Time-based heating plans", overview: "Overview", modes: "Mode library", schedules: "Heating plans", week: "Week view",
    addMode: "Add mode", addSchedule: "Add heating plan", addAssignment: "Add mode", editAssignment: "Edit mode", editPhase: "Edit phase", usedModes: "Used modes", details: "Open details", edit: "Edit", remove: "Delete",
    save: "Save", cancel: "Cancel", name: "Name", temperature: "Target temperature", priority: "Priority", priorityHint: "Higher number wins when valid modes overlap. Example: Normal 21 °C (priority 0), Birthday 22 °C (priority 10): once both are valid in time, 22 °C applies. Priority does not replace a time.", color: "Color (optional)",
    icon: "Icon (optional, e.g. mdi:leaf)", hexColor: "Hex color", iconPlaceholder: "mdi:leaf", climate: "Climate entities", entityDisplayName: "Display name (optional)", entityDisplayNamePlaceholder: "Name in this heating plan", enabled: "Enabled", generalSettings: "General settings", windowSettings: "Window detection", windowLabel: "Window label", noWindowLabel: "No label", windowLabelHint: "Central selection for window contacts in all heating plans.", saveWindowLabel: "Save", holidayRegion: "Holiday region (Germany)", holidayRegionHint: "Filters regional public holidays. Local exceptions are not included.", holidayRegionNational: "Nationwide holidays only", unavailableRegion: "not active in this region", regionBw: "Baden-Württemberg", regionBy: "Bavaria", regionBe: "Berlin", regionBb: "Brandenburg", regionHb: "Bremen", regionHh: "Hamburg", regionHe: "Hesse", regionMv: "Mecklenburg-Western Pomerania", regionNi: "Lower Saxony", regionNw: "North Rhine-Westphalia", regionRp: "Rhineland-Palatinate", regionSl: "Saarland", regionSn: "Saxony", regionSt: "Saxony-Anhalt", regionSh: "Schleswig-Holstein", regionTh: "Thuringia", windowDetection: "Use window detection", windowDetectionOff: "Window detection disabled", enableWindowDetection: "Enable window detection", disableWindowDetection: "Disable window detection", windowOpenTemperature: "Setback temperature with window open", windowOpenTemperatureHint: "Default: 18.5 °C; applies to windows with the centrally selected label in the same area as the climate entity.", windowOpen: "Window open – setback active",
    sameTime: "Same time", individualTime: "Individual times", weekdays: "Weekdays", addTime: "Add another time", removeTime: "Remove time", autoRules: "Automatic rules", autoDailyStartHint: "When you add an automatic rule here, it enables the mode assignment. On that day, the temperature takes effect only after the configured daily time. To apply the mode immediately with Auto on, choose 00:00.", addAutoRule: "Add another rule", removeAutoRule: "Remove rule", autoAction: "Action", autoActionEmpty: "Select action", autoOn: "Auto on", autoOff: "Auto off", autoKind: "Occasion", autoKindEmpty: "Select occasion", autoKindDate: "One-time date", autoKindHoliday: "Holiday", autoKindCycle: "Cyclic", autoRuleName: "Name", autoRuleNamePlaceholder: "e.g. Wednesday long", autoDrag: "Move rule", autoRuleIncomplete: "Please enter a name, occasion, and at least Auto on or Auto off.", autoRuleCollapse: "Collapse", autoRuleEndBeforeStart: "The end date must not be before the start date.", autoRecurrence: "Repeat", recurrenceHourly: "Hourly", recurrenceDaily: "Daily", recurrenceWeekly: "Weekly", recurrenceMonthly: "Monthly", recurrenceQuarterly: "Quarterly", recurrenceYearly: "Yearly", autoStartDate: "Start date (optional)", autoEndDate: "End date (optional)", autoStartTime: "Start time", autoOnTime: "Auto on time", autoOffTime: "Auto off time", autoOnStartDate: "Auto on start date", autoOnEndDate: "Auto on end date", autoOffStartDate: "Auto off start date", autoOffEndDate: "Auto off end date", autoCycleHint: "Without a start date, the current day is used as the anchor.", autoContinuous: "Ignore weekdays and daily times for this mode assignment", autoContinuousHint: "The mode assignment then uses no additional weekdays or daily times. Saved times remain available.", autoDate: "Date", autoHoliday: "Holiday", autoRecurringHint: "Repeats every year.", autoCalculatedHint: "Calculated automatically.", autoHolidayNewYear: "New Year's Day", autoHolidayEpiphany: "Epiphany", autoHolidayInternationalWomensDay: "International Women's Day", autoHolidayGoodFriday: "Good Friday", autoHolidayEasterSaturday: "Holy Saturday", autoHolidayEasterMonday: "Easter Monday", autoHolidayEasterSunday: "Easter Sunday", autoHolidayWhitSunday: "Whit Sunday", autoHolidayLabourDay: "Labour Day", autoHolidayAscension: "Ascension Day", autoHolidayWhitMonday: "Whit Monday", autoHolidayCorpusChristi: "Corpus Christi", autoHolidayMariaHimmelfahrt: "Assumption Day", autoHolidayWorldChildrenDay: "World Children's Day", autoHolidayGermanUnity: "German Unity Day", autoHolidayReformationDay: "Reformation Day", autoHolidayAllSaintsDay: "All Saints' Day", autoHolidayRepentanceDay: "Day of Prayer and Repentance", autoHolidayAdvent1: "1st Advent", autoHolidayAdvent2: "2nd Advent", autoHolidayAdvent3: "3rd Advent", autoHolidayAdvent4: "4th Advent", autoHolidayAllAdvent: "All Advent Sundays", autoHolidayEasterPeriod: "Easter (Good Friday–Easter Monday)", autoHolidayChristmasEve: "Christmas Eve", autoHolidayChristmasDay: "Christmas Day", autoHolidayBoxingDay: "Boxing Day", autoHolidayChristmasPeriod: "Christmas (24–26 December)", autoHolidayNewYearsEve: "New Year's Eve",
    bulkTimeHint: "Applied to the checked weekdays.",
    drop: "Drop mode on the heating plan", chooseMode: "Activate mode directly", noModes: "No modes have been created yet.", noSchedules: "No heating plans have been created yet.", duplicating: "Duplicating heating plan …", autoContinuousNeedsRule: "Add at least one automatic rule first.",
    active: "Active mode", lastActivated: "Last activated", external: "external", manual: "Manual", automatic: "Use schedule", manualUntil: "Automatic from", activateSchedule: "Activate heating plan", pauseSchedule: "Pause heating plan", activateMode: "Activate mode directly", activateAssignment: "Enable mode assignment for automatic schedule", pauseMode: "Pause mode assignment", targetRequestShort: "Target", targetRequest: "Current target temperature of the climate entity", currentShort: "Current", next: "Next change", none: "No mode activated yet", refresh: "Refresh", exportAll: "Export everything", exportSchedule: "Export heating plan", import: "Import", loading: "Loading …",
    importTitle: "Climate Planner import", importHint: "Assign every imported heating plan to at least one existing climate entity. A full import replaces the current configuration; an individual heating plan is added and initially paused.", importEntities: "Target entities", importNoSelection: "Select at least one climate entity for every heating plan.", importInvalid: "The file is not a valid Climate Planner export.", importReplaceConfirm: "The current Climate Planner configuration will be replaced by the full import. Continue?", importSettingsSkipped: "The exported global settings could not be applied completely.", imported: "Import completed.", importedSchedule: "Heating plan imported and paused.",
    saveError: "Save failed", conflict: "The data changed. Reloading the view.", invalid: "Please check the input.", localTemperature: "Override temperature for this phase", inherited: "Mode temperature",
    deleteMode: "Delete this mode? Its assignments will be removed.", deleteSchedule: "Delete this heating plan?",
    deleteAssignment: "Remove this mode from the heating plan? All of its phases will be deleted.", modeAlreadyAssigned: "This mode is already part of this heating plan.", deletePhase: "Delete this phase?", missingDay: "Select at least one weekday.",
    invalidTime: "Every selected rule needs a valid time (HH:mm).", duplicateDayTime: "Each time may only occur once per weekday.", noClimate: "No climate entity found.",
    selectSchedule: "Select a heating plan", noWeek: "No time ranges are configured.",
    dragHint: "Drag a mode from the library onto any part of a heating-plan card.", dropReady: "Drop mode", dropBlocked: "Already included", unavailable: "unavailable",
    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
  },
};

class ClimatePlannerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.data = null;
    this.selectedSchedule = this.storageGet("climate-planner-schedule");
    this.detailOpen = false;
    this.dialogKind = null;
    this.dialogContext = null;
    this.dialogBackdropMouseDown = false;
    this.dragActive = false;
    this.phaseResizeActive = false;
    this.pendingRender = false;
    this.suppressPhaseClickUntil = 0;
    this.lastScheduleRenderSignature = "";
    this.scheduleInteractionActive = false;
    this.scheduleRenderPending = false;
    this.scheduleRenderTimer = null;
    this.loadInFlight = null;
    this.loadQueued = false;
    this.saveQueue = Promise.resolve();
    this.externalTargetMismatches = new Map();
    this.externalTargetTimers = new Map();
    this.optimisticActivations = new Map();
    this.windowLabelDraft = "";
    this.windowLabelDirty = false;
    this.windowLabelNativeLoadPending = false;
    this.windowLabelSaveTimer = null;
    this.windowLabelSavePending = false;
    this.autoRuleDragRow = null;
    this.holidayRegionDraft = "national";
    this.holidayRegionDirty = false;
    this.holidayRegionSavePending = false;
    this.duplicateSchedulePending = "";
  }

  set hass(value) {
    this._hass = value;
    if (this.isConnected && !this.started) this.start();
    else if (this.started && this.data && !this.detailOpen && !this.dragActive
      && this.scheduleRenderSignature() !== this.lastScheduleRenderSignature) {
      if (this.scheduleInteractionActive) this.scheduleRenderPending = true;
      else this.queueScheduleRender();
    }
  }

  connectedCallback() {
    if (this._hass) this.start();
  }

  disconnectedCallback() {
    clearInterval(this.clockTimer);
    clearTimeout(this.scheduleRenderTimer);
    this.scheduleRenderTimer = null;
    this.removeModeDragCursor();
    this.eventUnsub?.();
    this.eventUnsub = null;
    for (const timer of this.externalTargetTimers.values()) clearTimeout(timer);
    this.externalTargetTimers.clear();
    this.externalTargetMismatches.clear();
    this.optimisticActivations.clear();
    this.loadQueued = false;
    this.started = false;
  }

  get t() {
    return labels[this._hass?.language?.startsWith("de") ? "de" : "en"];
  }

  async start() {
    if (this.started) return;
    this.started = true;
    this.renderShell();
    try {
      this.eventUnsub = await this._hass.connection.subscribeEvents(
        () => { void this.load(); }, "climate_planner_updated",
      );
    } catch (_) { /* Manual refresh remains available if events are unavailable. */ }
    await this.load();
    this.clockTimer = setInterval(() => this.renderWeek(), 60_000);
  }

  $(id) { return this.shadowRoot.getElementById(id); }

  storageGet(key) {
    try { return globalThis.sessionStorage?.getItem(key) || ""; } catch (_) { return ""; }
  }

  storageSet(key, value) {
    try { globalThis.sessionStorage?.setItem(key, value); } catch (_) { /* Storage can be blocked by browser privacy settings. */ }
  }

  temperatureUnit() {
    const value = this._hass?.config?.unit_system?.temperature
      || this._hass?.config?.unit_system?.temperature_unit;
    return value === "°F" || value === "F" ? "°F" : "°C";
  }

  displayTemperature(value) {
    const celsius = Number(value);
    const converted = this.temperatureUnit() === "°F" ? celsius * 9 / 5 + 32 : celsius;
    return Number(converted.toFixed(1));
  }

  storedTemperature(value) {
    const display = Number(value);
    return this.temperatureUnit() === "°F" ? (display - 32) * 5 / 9 : display;
  }

  temperatureText(value) {
    return `${this.displayTemperature(value)} ${this.temperatureUnit()}`;
  }

  scheduleRenderSignature() {
    const entityIds = [...new Set((this.data?.schedules || []).flatMap((schedule) => schedule.climate_entity_ids || []))].sort();
    return JSON.stringify({
      language: this._hass?.language || "",
      unit: this.temperatureUnit(),
      admin: Boolean(this._hass?.user?.is_admin),
      entities: entityIds.map((entityId) => {
        const state = this._hass?.states?.[entityId];
        return [entityId, state?.state, state?.last_updated, state?.attributes?.temperature, state?.attributes?.current_temperature, state?.attributes?.target_temp_step];
      }),
    });
  }

  queueScheduleRender() {
    if (this.scheduleRenderTimer) return;
    this.scheduleRenderTimer = setTimeout(() => {
      this.scheduleRenderTimer = null;
      if (this.started && this.data && !this.detailOpen && !this.dragActive) {
        this.renderSchedules(Boolean(this._hass.user?.is_admin));
      }
    }, 0);
  }

  renderShell() {
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;min-height:100vh;color:var(--primary-text-color);background:var(--primary-background-color);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif)}
      *{box-sizing:border-box}main{max-width:1500px;margin:auto;padding:24px}header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}h1{font-size:26px;flex:1;margin:0}h2{font-size:20px;margin:26px 0 12px}h3{font-size:17px;margin:0 0 8px}button,input,select{font:inherit;color:inherit}button{cursor:pointer;border:1px solid var(--divider-color);background:var(--card-background-color);border-radius:8px;padding:9px 13px}button.primary{color:var(--text-primary-color,#fff);background:var(--primary-color);border-color:var(--primary-color)}button.danger{color:var(--error-color,#db4437)}button:disabled{opacity:.55;cursor:not-allowed}input,select{width:100%;padding:9px;border:1px solid var(--divider-color);border-radius:7px;background:var(--card-background-color)}label{display:grid;gap:5px;font-size:13px}.muted{color:var(--secondary-text-color)}.error{color:var(--error-color,#db4437)}.notice{min-height:24px;padding:8px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.card{background:var(--ha-card-background,var(--card-background-color));border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,12px);padding:16px;overflow-wrap:anywhere}.card.dragging{opacity:.55}.card.drop-target{border:2px dashed var(--primary-color);background:color-mix(in srgb,var(--primary-color) 10%,var(--card-background-color))}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.mode-color{width:14px;height:14px;display:inline-block;border-radius:50%;vertical-align:-2px;margin-right:6px;border:1px solid var(--divider-color)}.mode-meta{display:flex;align-items:center;gap:8px;color:var(--secondary-text-color);font-size:13px}.assignment{border-top:1px solid var(--divider-color);padding-top:10px;margin-top:10px}.assignment:first-child{border-top:0;padding-top:0}.assignment .actions{margin-top:8px}.status-dot{font-size:18px;color:var(--success-color,#43a047)}.status-dot.off{color:var(--secondary-text-color)}.drop-zone{border:1px dashed var(--divider-color);border-radius:8px;padding:10px;text-align:center;color:var(--secondary-text-color);margin-top:12px}.drop-zone:focus,.drop-zone:hover{border-color:var(--primary-color);color:var(--primary-text-color)}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.full{grid-column:1/-1}.days{display:grid;grid-template-columns:repeat(7,minmax(70px,1fr));gap:7px}.day-check{display:flex;align-items:center;gap:5px;padding:7px;border:1px solid var(--divider-color);border-radius:7px}.day-check input{width:auto}.time-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.time-fields[hidden]{display:none}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.dialog-form{min-width:min(720px,90vw)}dialog{color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:12px;max-width:calc(100vw - 24px)}dialog::backdrop{background:rgba(0,0,0,.45)}fieldset{border:0;padding:0;margin:12px 0}legend{font-weight:600;margin-bottom:8px}.week-controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap}.week-controls label{min-width:260px}.week-scroll{overflow-x:auto;padding-bottom:10px}.week-grid{display:grid;grid-template-columns:repeat(7,minmax(150px,1fr));gap:8px;min-width:1050px}.day-column{position:relative}.day-column h3{text-align:center;background:var(--secondary-background-color);padding:8px;border-radius:7px;font-size:14px}.day-track{height:720px;position:relative;border:1px solid var(--divider-color);border-radius:7px;background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(25% - 1px),var(--divider-color) 25%);overflow:hidden}.segment{position:absolute;left:3px;right:3px;border-radius:6px;padding:5px;font-size:12px;overflow:hidden;border-left:4px solid var(--primary-color);background:color-mix(in srgb,var(--primary-color) 20%,var(--card-background-color))}.segment strong,.segment small{display:block}.now-line{position:absolute;left:0;right:0;height:2px;background:var(--error-color,#db4437);z-index:2}.time-labels{position:absolute;inset:0;pointer-events:none;color:var(--secondary-text-color);font-size:10px}.time-labels span{position:absolute;left:4px}.empty{padding:14px;text-align:center;color:var(--secondary-text-color)}:focus-visible{outline:3px solid var(--primary-color);outline-offset:2px}@media(max-width:700px){main{padding:14px}h1{font-size:22px}.form-grid,.time-fields{grid-template-columns:1fr}.days{grid-template-columns:repeat(2,1fr)}.full{grid-column:auto}}
    </style><main><header><ha-icon icon="mdi:calendar-clock"></ha-icon><h1>Climate Planner</h1><button id="refresh" class="primary">↻</button><button id="export-all"></button><button id="import-file"></button><input id="import-file-input" type="file" accept="application/json,.json" hidden><button id="add-mode" class="primary"></button><button id="add-schedule"></button></header><div id="notice" class="notice" role="status" aria-live="polite"></div><section id="overview-top"><section id="general-settings"><h2 id="general-settings-title"></h2><div class="settings-grid"><section id="planner-settings" class="planner-settings"><h2 id="window-settings-title"></h2><p id="window-settings-hint" class="muted"></p><div id="window-label-control" class="window-label-control"></div></section><section id="holiday-settings" class="planner-settings"><h2 id="holiday-region-title"></h2><p id="holiday-region-hint" class="muted"></p><div id="holiday-region-control" class="holiday-region-control"></div></section></div></section><section><h2 id="modes-title"></h2><p id="drag-hint" class="muted"></p><div id="modes" class="grid"></div></section></section><section><h2 id="schedules-title"></h2><div id="schedules" class="grid"></div></section><section><h2 id="week-title"></h2><div id="week"></div></section><dialog id="dialog"></dialog></main>`;
    const style = this.shadowRoot.querySelector("style");
    const overviewTop = this.$("overview-top");
    const modesSection = this.$("modes-title").closest("section");
    const schedulesSection = this.$("schedules-title").closest("section");
    const weekSection = this.$("week-title").closest("section");
    modesSection.id = "modes-section";
    modesSection.classList.add("mode-palette");
    schedulesSection.id = "schedules-section";
    weekSection.id = "week-section";
    const summarySection = document.createElement("section");
    summarySection.id = "summary-section";
    summarySection.innerHTML = '<div id="summary" class="summary-grid"></div>';
    this.$("notice").after(summarySection);
    const backButton = document.createElement("button");
    backButton.id = "back-overview";
    backButton.type = "button";
    backButton.textContent = "←";
    backButton.title = "Übersicht";
    backButton.hidden = true;
    backButton.onclick = () => { this.detailOpen = false; this.render(); window.scrollTo({ top: 0, behavior: "smooth" }); };
    this.$("refresh").before(backButton);
    style.textContent += ".input-with-unit{display:flex;position:relative}.input-with-unit input{padding-right:42px}.unit-suffix{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--secondary-text-color);pointer-events:none}.color-controls{display:flex;align-items:center;gap:8px}.color-controls input[type=color]{width:48px;height:40px;padding:3px}.color-controls input[name=color_hex]{flex:1}.full ha-icon-picker{display:block;min-height:40px}.full input[name=icon_text]{margin-top:8px}.mode-icon{--mdc-icon-size:20px;flex:none}.climate-select{min-height:160px}.climate-select option{padding:5px}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.summary-card{background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:12px;padding:14px}.summary-card strong{display:block;font-size:24px;margin-top:4px}.schedule-card{cursor:pointer}.schedule-card.selected{border-color:var(--primary-color);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color) 22%,transparent)}.phase-list{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.phase-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--divider-color);border-radius:999px;padding:5px 8px;background:var(--secondary-background-color);font-size:12px}.timeline-hint{margin:0 0 10px}.mode-palette{position:sticky;top:12px}.mode-palette .grid{grid-template-columns:1fr}.week-toolbar{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap}.week-toolbar label{min-width:260px}.segment{cursor:grab;transition:filter .15s,transform .15s}.segment:hover{filter:brightness(.97);transform:translateY(-1px)}.segment.dragging{opacity:.45}.day-track.drop-target{outline:3px dashed var(--primary-color);outline-offset:-4px;background-color:color-mix(in srgb,var(--primary-color) 8%,var(--card-background-color))}.segment .segment-icon{--mdc-icon-size:16px;vertical-align:middle;margin-right:3px}.climate-select option{white-space:normal}@media(max-width:1100px){main{display:block!important}.mode-palette{position:static}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.summary-grid{grid-template-columns:1fr}.form-grid,.time-fields{grid-template-columns:1fr}.days{grid-template-columns:repeat(2,1fr)}.full{grid-column:auto}}";
    style.textContent += ".week-toolbar{margin-bottom:16px}";
    style.textContent += ".mode-day-time-row{display:flex;align-items:center;gap:4px}.mode-day-time-row input{flex:1}.mode-day-remove-time{width:32px;min-width:32px;padding:5px 0;color:var(--error-color);line-height:1}.mode-day-remove-time ha-icon{--mdc-icon-size:16px}";
    style.textContent += ".auto-date-grid{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.auto-rules{grid-column:1/-1;display:grid;gap:7px;margin-top:2px}.auto-rules>legend{margin-bottom:0}.auto-rules-list{display:grid;gap:7px}.auto-rule-row{display:grid;grid-template-columns:minmax(118px,1fr) minmax(150px,1.15fr) minmax(170px,1.35fr) 34px;align-items:end;gap:7px;padding:7px;border:1px solid var(--divider-color);border-radius:8px;background:var(--secondary-background-color)}.auto-rule-row label{min-width:0}.auto-rule-row select,.auto-rule-row input{padding:7px}.auto-rule-value{min-width:0}.auto-rule-row.auto-rule-cycle .auto-rule-value{grid-column:1/-1;grid-row:2}.auto-rule-row.auto-rule-cycle .auto-rule-remove{grid-column:4;grid-row:1}.auto-rule-cycle-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.auto-rule-cycle-fields .auto-rule-hint{grid-column:1/-1;color:var(--secondary-text-color);font-size:11px}.auto-rule-value .auto-rule-calculated{display:flex;align-items:center;min-height:35px;color:var(--secondary-text-color);font-size:12px}.auto-rule-remove{width:34px;height:35px;padding:5px;color:var(--error-color,#db4437)}.auto-rule-remove ha-icon{--mdc-icon-size:17px}.auto-rule-add{justify-self:start;padding:6px 10px;font-size:12px}.auto-rule-remove ha-icon,.auto-rule-add ha-icon{--mdc-icon-size:17px}.mode-day-add-time{width:100%;padding:5px 8px;border:1px dashed var(--divider-color);color:var(--secondary-text-color);background:transparent;font-size:12px;line-height:1}.mode-day-add-time:not(:disabled):hover{border-color:var(--primary-color);color:var(--primary-text-color);background:color-mix(in srgb,var(--primary-color) 8%,transparent)}.mode-day-add-time:disabled{cursor:not-allowed}@media(max-width:700px){.auto-date-grid{grid-template-columns:1fr}.auto-rule-row{grid-template-columns:1fr 1fr}.auto-rule-value,.auto-rule-row.auto-rule-cycle .auto-rule-value{grid-column:1/-1;grid-row:2}.auto-rule-remove,.auto-rule-row.auto-rule-cycle .auto-rule-remove{grid-column:2;grid-row:1;justify-self:end}.auto-rule-cycle-fields{grid-template-columns:1fr}}";
    style.textContent += ".window-status{color:var(--warning-color,#b06a00)}";
    style.textContent += ".assignment-continuous{display:flex;align-items:flex-start;gap:6px;padding:8px 0}.assignment-continuous input{width:auto;margin-top:2px}.assignment-continuous-copy{display:grid;gap:2px}.assignment-continuous-copy small{color:var(--secondary-text-color);font-size:11px}.assignment-bulk-time[hidden]{display:none}";
    style.textContent += ".day-lanes{position:absolute;inset:0;display:flex}.day-lane{position:relative;flex:1;min-width:0;border-right:1px solid color-mix(in srgb,var(--divider-color) 70%,transparent)}.day-lane:last-child{border-right:0}.day-lane .segment{left:3px;right:3px}";
    style.textContent += ".auto-rule-row{position:relative;grid-template-columns:minmax(118px,1fr) minmax(150px,1.15fr) minmax(150px,1fr) minmax(170px,1.35fr) 34px;padding-left:31px}.auto-rule-row.auto-rule-cycle .auto-rule-value{grid-column:1/-1;grid-row:2}.auto-rule-row.auto-rule-cycle .auto-rule-remove{grid-column:5;grid-row:1}.auto-rule-drag{position:absolute;left:7px;top:50%;display:flex;align-items:center;justify-content:center;width:18px;height:24px;transform:translateY(-50%);color:var(--secondary-text-color);cursor:grab;border-radius:5px}.auto-rule-drag:hover{color:var(--primary-text-color);background:color-mix(in srgb,var(--primary-color) 10%,transparent)}.auto-rule-drag:active{cursor:grabbing}.auto-rule-drag ha-icon{--mdc-icon-size:17px}.auto-rule-row.dragging{opacity:.55}.auto-rule-row.drag-over{border-color:var(--primary-color);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color) 18%,transparent)}.auto-rule-name{min-width:0}.auto-rule-name input{min-width:0}@media(max-width:700px){.auto-rule-row{grid-template-columns:1fr 1fr;padding-left:31px}.auto-rule-row .auto-rule-name{grid-column:1/-1;grid-row:2}.auto-rule-row .auto-rule-value,.auto-rule-row.auto-rule-cycle .auto-rule-value{grid-column:1/-1;grid-row:3}.auto-rule-remove,.auto-rule-row.auto-rule-cycle .auto-rule-remove{grid-column:2;grid-row:1;justify-self:end}}";
    style.textContent += ".week-mode-chip[draggable=true]{cursor:grab}.week-mode-chip[draggable=true].dragging{opacity:.55}.mode-day-actions{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 8px}.mode-day-actions button{padding:6px 9px;font-size:12px}";
    style.textContent += ".week-mode-chip-wrap{display:inline-flex;align-items:stretch}.week-mode-chip-wrap .week-mode-chip{border-radius:8px 0 0 8px}.week-mode-chip-toggle{display:inline-flex;align-items:center;justify-content:center;min-width:30px;padding:6px 8px;border-left:0;border-radius:0 8px 8px 0;line-height:1}.week-mode-chip-toggle ha-icon{--mdc-icon-size:18px}.week-mode-chip.paused+.week-mode-chip-toggle{opacity:.65}";
    this.shadowRoot.querySelector("main").style.display = "grid";
    this.shadowRoot.querySelector("main").style.gridTemplateColumns = "minmax(0,1fr)";
    this.shadowRoot.querySelector("main").style.gridTemplateAreas = '"header" "overview-top" "schedules"';
    this.shadowRoot.querySelector("main").style.gap = "8px";
    style.textContent += ".mode-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.mode-card-top h3{margin:0}.mode-toggle{padding:5px 8px;font-size:13px;line-height:1}.mode-card.disabled{opacity:.68}.mode-card .mode-meta{flex-wrap:wrap}.mode-priority{font-size:11px;margin-left:auto}.quick-mode-wrap{display:flex;align-items:stretch;min-width:178px;border:1px solid var(--divider-color);border-radius:10px;background:var(--secondary-background-color);overflow:hidden;transition:border-color .12s,box-shadow .12s,background .12s}.quick-mode-wrap.active{border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 12%,var(--card-background-color));box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color) 18%,transparent)}.quick-mode-wrap.paused{opacity:.72}.quick-mode-wrap .quick-mode{min-width:0;flex:1;border:0;border-radius:0;background:transparent}.quick-mode-wrap .quick-mode:not(:disabled):hover{transform:none;border-color:transparent;box-shadow:none}.assignment-toggle{align-self:flex-start;padding:7px 8px;font-size:13px;line-height:1;color:var(--secondary-text-color);border:0;border-left:1px solid var(--divider-color);border-radius:0;background:transparent}.assignment-toggle:hover{color:var(--primary-text-color);border-color:var(--primary-color)}";
    style.textContent += ".assignment-tools{display:grid;align-self:stretch;border-left:1px solid var(--divider-color)}.assignment-toggle,.assignment-settings,.assignment-delete{display:flex;align-items:center;justify-content:center;min-width:30px;padding:5px 7px;font-size:13px;line-height:1;border:0;border-radius:0;background:transparent}.assignment-toggle{color:var(--secondary-text-color)}.assignment-toggle:hover,.assignment-settings:hover{color:var(--primary-text-color);background:color-mix(in srgb,var(--primary-color) 8%,transparent)}.assignment-settings{color:var(--primary-color)}.assignment-delete{border-top:1px solid var(--divider-color);color:var(--error-color,#db4437)}.assignment-delete:hover{background:color-mix(in srgb,var(--error-color,#db4437) 12%,transparent)}.assignment-settings ha-icon,.assignment-delete ha-icon{--mdc-icon-size:16px}";
    style.textContent += ".quick-mode-wrap{position:relative}.quick-mode-wrap .quick-mode{padding-left:40px}.quick-mode-activate{position:absolute;z-index:2;top:4px;left:4px;display:flex;align-items:center;justify-content:center;width:30px;height:30px;padding:5px;border:0;border-radius:7px;background:transparent;color:var(--primary-color);line-height:1}.quick-mode-activate:hover{background:color-mix(in srgb,var(--primary-color) 10%,transparent)}.quick-mode-activate ha-icon{--mdc-icon-size:18px}.assignment-toggle ha-icon{--mdc-icon-size:18px}";
    style.textContent += ".mode-palette{position:static}.day-track{z-index:0;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent calc(1.041666% - 1px),color-mix(in srgb,var(--divider-color) 24%,transparent) 1.041666%),repeating-linear-gradient(to bottom,transparent 0,transparent calc(25% - 1px),color-mix(in srgb,var(--divider-color) 60%,transparent) 25%)}.segment{z-index:1;min-height:28px;padding:8px 8px 9px 10px;box-shadow:0 2px 5px rgba(0,0,0,.08)}.segment-head{display:flex;align-items:center;gap:4px}.segment-time{color:var(--secondary-text-color);font-size:11px}.transition-handle{position:absolute;left:0;right:0;height:18px;transform:translateY(-50%);z-index:6;cursor:ns-resize;touch-action:none}.transition-handle::after{content:\"\";position:absolute;left:18%;right:18%;top:8px;border-top:2px solid color-mix(in srgb,var(--primary-text-color) 45%,transparent);opacity:.65;transition:opacity .12s}.transition-handle:hover::after,.transition-handle:focus::after{opacity:1}.drop-indicator{position:absolute;left:0;right:0;height:2px;background:var(--primary-color);z-index:5;pointer-events:none}.drop-indicator span{position:absolute;right:5px;top:-22px;padding:3px 6px;border-radius:5px;background:var(--primary-color);color:var(--text-primary-color,#fff);font-size:11px;white-space:nowrap}.phase-chip{cursor:pointer}.phase-chip:hover{border-color:var(--primary-color);background:var(--primary-color);color:var(--text-primary-color,#fff)}.schedule-card.compact{padding:14px}.schedule-card.compact h3{margin:0 0 4px}.schedule-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.schedule-card-top-tools{display:flex;align-items:center;gap:8px}.schedule-toggle{padding:5px 8px;font-size:13px;line-height:1}.schedule-count{white-space:nowrap;font-size:12px}.schedule-entities{display:grid;gap:5px;margin-top:5px;font-size:12px}.schedule-entity-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:8px;min-width:0}.schedule-entity-name{min-width:0;overflow-wrap:anywhere}.schedule-entity-values{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px 10px;min-width:0;color:var(--secondary-text-color)}.schedule-entity-values b{color:var(--primary-text-color);font-weight:600}.schedule-entities-empty{margin:0}.schedule-summary{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;font-size:13px}.schedule-summary span{min-width:0}.schedule-override{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 0;font-size:12px;color:var(--warning-color,#b06a00)}.schedule-override button{padding:5px 8px;font-size:12px}.quick-mode-title{display:flex;justify-content:space-between;align-items:center;margin-top:14px;margin-bottom:7px;font-size:12px;font-weight:600}.quick-modes{display:flex;gap:7px;flex-wrap:wrap}.quick-mode{display:flex;align-items:center;gap:7px;min-width:132px;padding:8px 10px;border:1px solid var(--divider-color);border-radius:10px;background:var(--secondary-background-color);text-align:left;transition:transform .12s,box-shadow .12s,border-color .12s,background .12s}.quick-mode:not(:disabled):hover{transform:translateY(-1px);border-color:var(--primary-color);box-shadow:0 3px 10px color-mix(in srgb,var(--primary-color) 18%,transparent)}.quick-mode.active{border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 12%,var(--card-background-color));box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color) 18%,transparent)}.quick-mode.manual{background:color-mix(in srgb,var(--warning-color,#b06a00) 12%,var(--card-background-color));border-color:var(--warning-color,#b06a00)}.quick-mode:disabled{opacity:.5}.quick-mode-dot{width:10px;height:10px;flex:none;border-radius:50%;border:1px solid var(--divider-color)}.quick-mode-dot.default{background:var(--primary-color)}.quick-mode-icon{--mdc-icon-size:18px;color:var(--secondary-text-color);flex:none}.quick-mode-copy{display:grid;gap:2px;min-width:0}.quick-mode-copy strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.quick-mode-copy small{font-size:11px;color:var(--secondary-text-color)}.quick-mode-check{margin-left:auto;color:var(--primary-color);font-weight:700}.schedule-modes{margin:10px 0 0;font-size:12px}.assignment-tool-list{display:grid;gap:6px;margin-top:8px}.assignment-tool{display:flex;align-items:center;justify-content:space-between;gap:8px}.assignment-tool-actions{display:flex;gap:4px;flex-wrap:wrap}.assignment-tool-actions button{padding:5px 8px;font-size:12px}.compact-drop{padding:7px;margin-top:10px;font-size:12px}.mode-card{padding:12px}.mode-card h3{margin-bottom:6px}.mode-card .actions{margin-top:9px}.climate-picker{border:1px solid var(--divider-color);border-radius:10px;overflow:hidden;background:var(--card-background-color)}.climate-picker-search{border:0;border-bottom:1px solid var(--divider-color);border-radius:0}.climate-options{max-height:280px;overflow:auto}.climate-option{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:1px solid var(--divider-color);cursor:pointer}.climate-option:last-child{border-bottom:0}.climate-option:hover{background:color-mix(in srgb,var(--primary-color) 8%,var(--card-background-color))}.climate-option input{width:auto;margin-top:3px}.climate-option-copy{display:grid;gap:2px;min-width:0}.climate-option-copy strong{font-size:13px;overflow:hidden;text-overflow:ellipsis}.climate-option-copy small{font-size:11px;color:var(--secondary-text-color)}.climate-option-empty{padding:12px;margin:0}";
    style.textContent += ".mode-palette{position:sticky;top:12px;align-self:start;max-height:calc(100vh - 24px);overflow:auto;scrollbar-gutter:stable}@media(max-width:1100px){.mode-palette{position:static;max-height:none;overflow:visible}}";
    style.textContent += ".schedule-card{cursor:default}.segment-head{padding-right:25px}.segment-duplicate{position:absolute;z-index:4;top:3px;right:3px;width:24px;height:24px;padding:3px;border:0;background:color-mix(in srgb,var(--card-background-color) 72%,transparent);line-height:1}.segment-duplicate ha-icon{--mdc-icon-size:16px}.schedule-card-top-tools{align-items:flex-start}.schedule-card-icon-tools{display:grid;gap:4px}.schedule-toggle,.schedule-duplicate{width:30px;height:30px;padding:5px;font-size:13px;line-height:1}.schedule-export{display:inline-flex;align-items:center;justify-content:center;padding:7px 9px;color:var(--primary-color)}.schedule-export ha-icon{--mdc-icon-size:18px}.schedule-duplicate.pending{color:var(--primary-color)}.schedule-duplicate.pending ha-icon{animation:climate-planner-spin 1s linear infinite}@keyframes climate-planner-spin{to{transform:rotate(360deg)}}.window-detection-toggle.off{color:var(--secondary-text-color);opacity:.62}.schedule-duplicate ha-icon{--mdc-icon-size:18px}";
    style.textContent += ".external-badge{display:inline-block;margin-left:5px;padding:2px 6px;border-radius:999px;color:var(--warning-color,#b06a00);background:color-mix(in srgb,var(--warning-color,#b06a00) 14%,transparent);font-size:11px;font-weight:600}";
    style.textContent += ".schedule-entity-row{width:100%;padding:0;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.schedule-entity-row:hover{background:color-mix(in srgb,var(--primary-color) 8%,transparent)}.schedule-entity-values{align-items:start;flex-wrap:nowrap}.climate-value{display:flex;align-items:baseline;gap:2px;white-space:nowrap;flex:none}.climate-target{display:grid;justify-items:end;gap:2px}.climate-target .external-badge{margin-left:0}";
    style.textContent += ".climate-selector-field{min-height:56px}.climate-selector-label{display:block;margin-bottom:8px;font-size:13px}.climate-entity-picker-row{display:grid;grid-template-columns:minmax(240px,1fr) minmax(180px,1fr);gap:8px;align-items:end}.climate-entity-picker-row+.climate-entity-picker-row{margin-top:8px}.climate-entity-display-name{min-width:0}.climate-entity-add{display:block;margin-top:8px}.checkbox-field{align-content:start}.checkbox-field input[type=checkbox]{width:auto;justify-self:start;margin:0}.field-label-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.inline-checkbox{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--secondary-text-color)}.inline-checkbox input[type=checkbox]{width:auto;margin:0}.window-temperature-field{min-width:0}@media(max-width:700px){.climate-entity-picker-row{grid-template-columns:1fr}}";
    style.textContent += ".week-toolbar-main{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap}.week-used-modes{display:grid;gap:5px}.week-used-modes-label{font-size:12px;color:var(--secondary-text-color)}.week-mode-list{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.week-mode-chip,.week-mode-add{display:inline-flex;align-items:center;gap:5px;min-height:38px;padding:7px 9px;font-size:12px}.week-mode-chip.paused{opacity:.6}.week-mode-chip .quick-mode-dot{width:9px;height:9px}.week-mode-chip ha-icon{--mdc-icon-size:16px}.mode-day-grid{display:grid;grid-template-columns:repeat(7,minmax(92px,1fr));gap:7px}.mode-day-card{display:grid;align-content:start;gap:7px;padding:8px;border:1px solid var(--divider-color);border-radius:7px}.mode-day-card>label{display:flex;align-items:center;gap:5px;font-weight:600}.mode-day-card input[type=checkbox]{width:auto}.mode-day-times{display:grid;gap:5px}.mode-day-times[hidden]{display:none}.mode-day-times input{min-width:0;padding:7px}.fixed-weekday{display:block;padding:10px;border:1px solid var(--divider-color);border-radius:7px;background:var(--secondary-background-color)}@media(max-width:900px){.mode-day-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.mode-day-grid{grid-template-columns:1fr}}";
    style.textContent += ".schedule-card.drop-target{cursor:copy;animation:schedule-drop-ready .75s ease-in-out infinite alternate}.schedule-card.drop-invalid{cursor:not-allowed;border:2px solid var(--error-color,#db4437);background:color-mix(in srgb,var(--error-color,#db4437) 10%,var(--card-background-color));box-shadow:0 0 0 3px color-mix(in srgb,var(--error-color,#db4437) 18%,transparent)}.mode-drag-cursor{position:fixed;z-index:10000;display:flex;align-items:center;gap:8px;max-width:240px;padding:8px 11px;border:1px solid var(--divider-color);border-radius:12px;background:color-mix(in srgb,var(--card-background-color) 94%,transparent);box-shadow:0 8px 24px rgba(0,0,0,.24);opacity:0;transform:translate(18px,18px) scale(.92);pointer-events:none;transition:opacity .12s,transform .12s,border-color .12s,background .12s}.mode-drag-cursor.visible{opacity:1;transform:translate(18px,18px) scale(1)}.mode-drag-cursor.allowed{border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 12%,var(--card-background-color));animation:drag-cursor-float .7s ease-in-out infinite alternate}.mode-drag-cursor.blocked{border-color:var(--error-color,#db4437);color:var(--error-color,#db4437);background:color-mix(in srgb,var(--error-color,#db4437) 12%,var(--card-background-color))}.mode-drag-cursor ha-icon{--mdc-icon-size:24px;flex:none}.mode-drag-cursor.allowed ha-icon{animation:drag-cursor-icon .55s ease-in-out infinite alternate}.mode-drag-cursor-copy{display:grid;gap:1px;min-width:0}.mode-drag-cursor-copy strong,.mode-drag-cursor-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mode-drag-cursor-copy strong{font-size:12px}.mode-drag-cursor-copy small{font-size:11px;color:var(--secondary-text-color)}@keyframes schedule-drop-ready{from{box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color) 16%,transparent)}to{box-shadow:0 0 0 6px color-mix(in srgb,var(--primary-color) 28%,transparent)}}@keyframes drag-cursor-float{from{margin-top:0}to{margin-top:-5px}}@keyframes drag-cursor-icon{from{transform:translateY(-2px)}to{transform:translateY(2px)}}";
    style.textContent += ".mode-palette{position:static;max-height:none;overflow:visible}.mode-palette h2{margin:4px 0}.mode-palette #drag-hint{margin:0 0 8px;font-size:12px}.mode-palette .grid{grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px}.mode-palette .mode-card{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;column-gap:12px;row-gap:3px;min-height:58px;padding:10px 12px;cursor:grab}.mode-palette .mode-card-top{grid-column:1;grid-row:1}.mode-palette .mode-meta{grid-column:1;grid-row:2;min-width:0;flex-wrap:nowrap}.mode-palette .mode-priority{margin-left:0}.mode-palette .mode-card .actions{grid-column:2;grid-row:1/3;align-self:center;margin:0;flex-wrap:nowrap}.mode-palette .mode-card .actions button{padding:7px 9px;font-size:12px}#overview-top{display:grid;grid-template-columns:minmax(250px,.85fr) minmax(0,2fr);gap:18px;align-items:start;min-height:0}#overview-top.no-settings{grid-template-columns:1fr}#overview-top #modes-section{min-width:0;margin:0}#overview-top .planner-settings{width:auto;max-width:none}main.overview-layout{height:100vh;overflow:hidden}main.overview-layout #schedules-section{display:flex;min-height:0;flex-direction:column}main.overview-layout #schedules-title{flex:none;margin:8px 0 10px}main.overview-layout #schedules{flex:1 1 auto;min-height:0;overflow-y:auto;align-content:start;padding:2px 10px 12px 2px;scrollbar-gutter:stable}@media(max-width:1100px){main.overview-layout{display:grid!important}}@media(max-width:1000px){#overview-top{grid-template-columns:1fr}}@media(max-width:700px){main.overview-layout{height:auto;min-height:100vh;overflow:visible;grid-template-rows:auto!important}main.overview-layout #schedules{overflow:visible}.mode-palette .grid{grid-template-columns:1fr}.mode-palette .mode-meta{flex-wrap:wrap}}";
    style.textContent += ".mode-palette .grid,#schedules{grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}@media(max-width:1100px){.mode-palette .grid,#schedules{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.mode-palette .grid,#schedules{grid-template-columns:1fr}}";
    style.textContent += ".quick-modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:7px}.quick-mode-wrap{width:auto;min-width:0;min-height:54px}.quick-mode-wrap .quick-mode{display:flex;align-items:center;justify-content:center;width:100%;min-width:0;gap:6px;padding:7px 8px 7px 34px;text-align:left}.quick-mode-copy{display:flex;align-items:baseline;gap:5px;min-width:0}.quick-mode-copy strong,.quick-mode-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.quick-mode-copy strong{flex:none}.quick-mode-copy small{flex:none}.quick-mode-check{margin-left:0;flex:none}.quick-mode-dot{width:10px;height:10px;flex:none}.quick-mode-icon{--mdc-icon-size:18px;flex:none}.mode-icon{--mdc-icon-size:20px}.quick-mode-activate ha-icon{--mdc-icon-size:18px}.assignment-toggle ha-icon{--mdc-icon-size:18px}.assignment-settings ha-icon,.assignment-delete ha-icon{--mdc-icon-size:16px}.schedule-toggle{display:flex;align-items:center;justify-content:center}.schedule-toggle ha-icon{--mdc-icon-size:19px}";
    style.textContent += ".planner-settings{width:fit-content;max-width:100%;padding:10px 12px;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color)}.planner-settings h2{margin:0 0 2px;font-size:15px}.planner-settings p{margin:0 0 6px}.planner-settings-row{display:flex;align-items:end;gap:10px;flex-wrap:wrap}.planner-settings-form{flex:1 1 240px;min-width:0}.planner-settings-form label{min-width:0}.planner-settings-actions{margin:0}.planner-settings-actions button{white-space:nowrap}.window-label-control{min-width:0}.window-label-control ha-form,.window-label-control ha-label-picker{display:block}.holiday-region-control{margin-top:8px}.holiday-region-control label{gap:4px}.holiday-region-control small{font-size:11px}";
    style.textContent += "#overview-top .mode-palette .grid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}#overview-top .mode-palette .mode-card{min-height:0;padding:8px 9px}#overview-top .mode-palette .mode-card h3{font-size:15px}#overview-top .mode-palette .mode-meta{font-size:12px;gap:5px}#overview-top .mode-palette .mode-card .actions button{padding:5px 7px;font-size:11px}";
    style.textContent += "@media(min-width:1001px){#overview-top{grid-template-columns:minmax(320px,390px) minmax(0,1fr)}}#overview-top .mode-palette .grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}#overview-top .mode-palette .mode-card{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto;column-gap:0;row-gap:6px}#overview-top .mode-palette .mode-card-top{grid-column:1;grid-row:1}#overview-top .mode-palette .mode-meta{grid-column:1;grid-row:2;flex-wrap:wrap;line-height:1.2}#overview-top .mode-palette .mode-card .actions{grid-column:1;grid-row:3;align-self:start;justify-content:flex-start}.quick-modes{grid-template-columns:repeat(auto-fit,minmax(178px,1fr))}.quick-mode-wrap{min-height:58px}.quick-mode-wrap .quick-mode{justify-content:flex-start}.quick-mode-copy{display:grid;align-items:start}.quick-mode-copy strong{white-space:normal;overflow-wrap:anywhere;line-height:1.2}.quick-mode-check{margin-left:auto}";
    style.textContent += "#overview-top .mode-palette .grid{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}.compact-mode-row{display:flex;align-items:center;gap:7px;min-height:42px;padding:7px 8px;cursor:grab}.compact-mode-row:focus-visible{cursor:grab}.compact-mode-leading{display:flex;align-items:center;gap:5px;flex:none}.compact-mode-leading .mode-color{margin:0}.compact-mode-leading .mode-icon{--mdc-icon-size:18px}.compact-mode-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.compact-mode-temperature,.compact-mode-priority{white-space:nowrap;font-size:11px}.compact-mode-priority{color:var(--secondary-text-color)}.compact-mode-delete{display:flex;align-items:center;justify-content:center;flex:none;width:26px;height:26px;padding:3px;border:0;border-radius:6px;background:transparent;color:var(--error-color,#db4437)}.compact-mode-delete:hover{background:color-mix(in srgb,var(--error-color,#db4437) 12%,transparent)}.compact-mode-delete ha-icon{--mdc-icon-size:17px}@media(max-width:700px){#overview-top .mode-palette .grid{grid-template-columns:1fr}}";
    style.textContent += "#overview-top .mode-palette .compact-mode-row{display:flex;grid-template-columns:none;grid-template-rows:none;align-items:center;min-height:36px;padding:5px 7px}#overview-top .mode-palette h2{margin-top:0;margin-bottom:2px}#overview-top .mode-palette #drag-hint{margin-bottom:6px}#overview-top .mode-palette .grid{margin-top:-4px;gap:6px}.compact-mode-row .compact-mode-name{min-width:0}.compact-mode-row .compact-mode-temperature,.compact-mode-row .compact-mode-priority{flex:none}#schedules .schedule-entity-row{grid-template-columns:minmax(0,1fr) max-content}#schedules .schedule-entity-values{width:max-content;min-width:max-content;flex-wrap:nowrap}@media(min-width:1001px){#overview-top .mode-palette{position:relative;top:-16px;margin-top:-16px}}";
    style.textContent += ".settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#overview-top{display:block}#general-settings{margin:0 0 18px}#general-settings>h2{margin:0 0 12px}#overview-top .planner-settings{width:auto;max-width:none;margin:0;padding:12px}#overview-top .planner-settings h2{margin:0 0 3px;font-size:15px}#overview-top .planner-settings p{margin:0 0 8px}#overview-top .mode-palette{position:static;top:auto;margin:0;max-height:none;overflow:visible}#overview-top .mode-palette h2{margin:0 0 2px}@media(max-width:700px){.settings-grid{grid-template-columns:1fr}}";
    style.textContent += "#general-settings{max-width:1120px}#overview-top .planner-settings{padding:9px 10px}#overview-top .planner-settings p{margin-bottom:5px}.holiday-region-control{margin-top:5px}#schedules .quick-modes{grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:6px}#schedules .quick-mode-wrap{min-height:52px}#schedules .quick-mode-wrap .quick-mode{gap:5px;padding:6px 6px 6px 31px}#schedules .quick-mode-activate{top:3px;left:3px;width:26px;height:26px;padding:4px}";
    style.textContent += ".auto-rules .auto-rule-row{display:block;padding:8px 10px 8px 31px}.auto-rule-summary{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:28px}.auto-rule-summary-toggle{flex:1;min-width:0;padding:5px 6px;border:0;border-radius:5px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.auto-rule-summary-toggle:hover{background:color-mix(in srgb,var(--primary-color) 7%,transparent)}.auto-rule-summary-toggle:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.auto-rule-summary-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.auto-rule-summary-actions{display:flex;align-items:center;gap:6px;flex:none}.auto-rule-summary-actions button{padding:5px 8px;font-size:12px}.auto-rule-editor{display:grid;gap:9px;margin-top:8px;padding-top:8px;border-top:1px solid var(--divider-color)}.auto-rule-editor[hidden]{display:none}.auto-rule-core{display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,1fr);gap:8px}.auto-rule-context{display:grid;gap:7px}.auto-rule-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}.auto-rule-action-card{min-width:0;margin:0;padding:8px;border:1px solid var(--divider-color);border-radius:7px}.auto-rule-action-card legend{margin:0 0 6px;font-size:12px}.auto-rule-action-card label{min-width:0}.auto-rule-action-card input{padding:7px}.auto-rule-hint,.auto-rule-calculated{font-size:11px;color:var(--secondary-text-color)}@media(max-width:700px){.auto-rule-core,.auto-rule-actions{grid-template-columns:1fr}}";
    style.textContent += ".overview-layout header{margin-bottom:0}#overview-top .mode-palette .grid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}#overview-top .mode-palette .compact-mode-row{min-height:36px;padding:5px 7px}.compact-mode-temperature,.compact-mode-priority{font-size:10px}#schedules .quick-modes{grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:6px}#schedules .quick-mode-wrap{min-width:0;min-height:52px}#schedules .quick-mode-wrap .quick-mode{gap:5px;padding:6px 6px 6px 31px;justify-content:flex-start}#schedules .quick-mode-copy{display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden}#schedules .quick-mode-copy strong{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;overflow-wrap:normal;line-height:1.2}#schedules .quick-mode-copy small{flex:none;white-space:nowrap}";
    style.textContent += "#overview-top .mode-palette .compact-mode-row{gap:10px}.compact-mode-temperature{margin-left:auto}.compact-mode-priority{margin-left:4px}";
    style.textContent += "main.overview-layout{height:auto;min-height:100vh;overflow:visible}main.overview-layout #schedules-section{display:block}main.overview-layout #schedules{overflow:visible;min-height:0}#overview-top .mode-palette .grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}#overview-top .mode-palette .compact-mode-name{white-space:nowrap;overflow:visible;text-overflow:clip}@media(max-width:1100px){#overview-top .mode-palette .grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){#overview-top .mode-palette .grid{grid-template-columns:1fr}}#schedules .quick-modes{display:grid;grid-template-columns:1fr;gap:6px}#schedules .quick-mode-wrap{width:100%;min-width:0;min-height:0;height:42px}#schedules .quick-mode-wrap .quick-mode{width:100%;min-height:42px;height:100%;padding:5px 8px 5px 34px;gap:8px}#schedules .quick-mode-copy{display:flex;align-items:center;flex:1;min-width:0;gap:10px;overflow:visible}#schedules .quick-mode-copy strong{flex:0 1 auto;min-width:0;white-space:nowrap;overflow:visible;text-overflow:clip;overflow-wrap:normal;line-height:1.2}#schedules .quick-mode-copy small{flex:none;white-space:nowrap;font-size:11px}.quick-mode-priority{color:var(--secondary-text-color)}#schedules .assignment-tools{display:flex;align-items:stretch;align-self:stretch;flex:none;border-left:1px solid var(--divider-color)}#schedules .assignment-toggle,#schedules .assignment-settings,#schedules .assignment-delete{height:100%;min-width:30px;padding:5px 7px;border:0;border-radius:0}#schedules .assignment-delete{border-top:0;border-left:1px solid var(--divider-color)}";
    style.textContent += ".notice{height:auto;min-height:0;padding:0;max-width:min(320px,35vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--secondary-text-color)}.notice.error{color:var(--error-color,#db4437)}";
    style.textContent += ".dialog-form .form-grid{align-items:start}.dialog-form .form-grid>label{align-self:start}";
    style.textContent += ".import-mapping{display:grid;gap:12px;max-height:min(60vh,620px);overflow:auto}.import-mapping-card{padding:10px;border:1px solid var(--divider-color);border-radius:8px;background:var(--secondary-background-color)}.import-mapping-card h3{margin:0 0 4px}.import-mapping-card p{margin:0 0 8px}.import-entity-list{display:grid;gap:5px}.import-entity-option{display:flex;align-items:flex-start;gap:7px;padding:6px;border:1px solid var(--divider-color);border-radius:6px;background:var(--card-background-color)}.import-entity-option input{width:auto;margin-top:3px}.import-entity-copy{display:grid;gap:1px;min-width:0}.import-entity-copy strong,.import-entity-copy small{overflow-wrap:anywhere}.import-entity-copy small{color:var(--secondary-text-color)}";
    style.textContent += ".field-label-with-info{display:inline-flex;align-items:center;gap:5px}.field-info{position:relative;display:inline-flex;align-items:center;color:var(--secondary-text-color);cursor:help}.field-info ha-icon{--mdc-icon-size:16px}.field-info-tooltip{position:absolute;z-index:20;left:0;top:calc(100% + 7px);display:none;width:min(360px,70vw);padding:9px 10px;border:1px solid var(--divider-color);border-radius:7px;background:var(--card-background-color);box-shadow:0 4px 16px rgba(0,0,0,.2);color:var(--primary-text-color);font-size:12px;font-weight:400;line-height:1.35;white-space:normal}.field-info:hover .field-info-tooltip,.field-info:focus .field-info-tooltip,.field-info:focus-within .field-info-tooltip{display:block}.auto-rules-hint{display:block;margin:-2px 0 2px;color:var(--secondary-text-color);font-size:12px;line-height:1.35}";
    style.textContent += ".schedule-card-top{position:relative;padding-right:38px}.schedule-card-icon-tools{position:absolute;top:0;right:0;display:grid;gap:4px}";
    style.textContent += "main.overview-layout{row-gap:0;padding-top:8px}main.overview-layout #overview-top{margin-top:0}main.overview-layout #schedules-section{margin-top:12px}main.overview-layout #schedules-title{margin-top:0}";
    style.textContent += "main.overview-layout{height:100vh;min-height:0;overflow:hidden}main.overview-layout #overview-top{min-height:0;overflow:visible}main.overview-layout #schedules-section{display:flex;min-height:0;overflow:hidden;flex-direction:column}main.overview-layout #schedules{min-height:0;overflow-y:auto;overflow-x:hidden;align-content:start}@media(max-width:700px){main.overview-layout{height:auto;min-height:100vh;overflow:visible}main.overview-layout #schedules-section{display:block;overflow:visible}main.overview-layout #schedules{overflow:visible}}";
    style.textContent += ".compact-mode-row{min-width:0}.compact-mode-name,.compact-mode-temperature,.compact-mode-priority{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.compact-mode-name{flex:1 1 auto}.compact-mode-temperature,.compact-mode-priority{flex:0 1 auto}#schedules .quick-mode-copy{min-width:0;overflow:hidden}#schedules .quick-mode-copy strong,#schedules .quick-mode-copy small{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto}";
    style.textContent += ".compact-mode-row{height:36px;min-height:36px}.compact-mode-copy{display:flex;align-items:center;gap:8px;min-width:0;flex:1;line-height:1}.compact-mode-name{flex:1 1 auto;font-size:14px;line-height:14px}.compact-mode-details{display:grid;align-content:center;gap:1px;min-width:0;flex:none;line-height:10px}.compact-mode-temperature,.compact-mode-priority{font-size:10px;line-height:10px;flex:0 1 auto}.compact-mode-priority{color:var(--secondary-text-color)}#schedules .quick-mode-copy{display:flex;align-items:center;gap:8px;line-height:1}.quick-mode-details{display:grid;align-content:center;gap:1px;min-width:0;flex:none;line-height:10px}#schedules .quick-mode-copy strong{line-height:14px;flex:1 1 auto}#schedules .quick-mode-copy small{font-size:10px;line-height:10px;flex:0 1 auto}#schedules .quick-mode-copy .quick-mode-priority{color:var(--secondary-text-color)}#schedules .quick-mode-copy .quick-mode-details small{flex:0 1 auto}";
    style.textContent += "#schedules{align-items:stretch}#schedules .schedule-card{display:flex;flex-direction:column}#schedules .schedule-card>.actions{margin-top:auto;padding-top:12px}";
    const header = this.shadowRoot.querySelector("header");
    const notice = this.$("notice");
    header.insertBefore(notice, this.$("refresh"));
    notice.hidden = true;
    header.style.gridArea = "header";
    summarySection.style.gridArea = "summary";
    schedulesSection.style.gridArea = "schedules";
    overviewTop.style.gridArea = "overview-top";
    weekSection.style.gridArea = "week";
    this.$("refresh").title = this.t.refresh;
    this.$("refresh").onclick = () => this.load();
    this.$("export-all").onclick = () => this.exportAll();
    this.$("import-file").onclick = () => this.$("import-file-input").click();
    this.$("import-file-input").onchange = (event) => this.importFile(event.target.files?.[0]);
    this.$("add-mode").onclick = () => this.openModeDialog();
    this.$("add-schedule").onclick = () => this.openScheduleDialog();
    const dialog = this.$("dialog");
    dialog.addEventListener("mousedown", (event) => {
      this.dialogBackdropMouseDown = event.target === dialog;
    });
    dialog.addEventListener("mouseup", (event) => {
      const close = this.dialogBackdropMouseDown && event.target === dialog;
      this.dialogBackdropMouseDown = false;
      if (close) this.closeDialog();
    });
  }

  notice(message, error = false) {
    this.$("notice").textContent = message || "";
    this.$("notice").className = error ? "notice error" : "notice";
    this.$("notice").hidden = !message;
  }

  finishDrag() {
    this.dragActive = false;
    this.dragState = null;
    this.removeModeDragCursor();
    this.shadowRoot?.querySelectorAll(".day-track.drop-target").forEach((track) => {
      track.classList.remove("drop-target");
      this.clearDropIndicator(track);
      delete track.dataset.dropPhaseId;
      delete track.dataset.dropTime;
    });
    if (this.pendingRender) {
      this.pendingRender = false;
      this.render();
    }
  }

  createModeDragCursor(mode) {
    this.removeModeDragCursor();
    const cursor = document.createElement("div");
    cursor.className = "mode-drag-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<ha-icon data-drag-cursor-icon icon="mdi:tray-arrow-down"></ha-icon><span class="mode-drag-cursor-copy"><strong data-drag-cursor-label></strong><small data-drag-cursor-detail></small></span>';
    cursor.querySelector("[data-drag-cursor-detail]").textContent = mode?.name || "";
    this.shadowRoot.append(cursor);
    this.modeDragCursor = cursor;
    this.modeDragMoveHandler = (event) => this.moveModeDragCursor(event);
    window.addEventListener("dragover", this.modeDragMoveHandler, { passive: true });
  }

  moveModeDragCursor(event) {
    if (!this.modeDragCursor || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    this.modeDragCursor.style.left = `${event.clientX}px`;
    this.modeDragCursor.style.top = `${event.clientY}px`;
  }

  setModeDragCursorState(event, allowed, scheduleName) {
    const cursor = this.modeDragCursor;
    if (!cursor) return;
    this.moveModeDragCursor(event);
    cursor.classList.toggle("allowed", allowed);
    cursor.classList.toggle("blocked", !allowed);
    cursor.classList.add("visible");
    cursor.querySelector("[data-drag-cursor-icon]").setAttribute("icon", allowed ? "mdi:tray-arrow-down" : "mdi:cancel");
    cursor.querySelector("[data-drag-cursor-label]").textContent = allowed ? this.t.dropReady : this.t.dropBlocked;
    cursor.querySelector("[data-drag-cursor-detail]").textContent = scheduleName || "";
  }

  hideModeDragCursor() {
    this.modeDragCursor?.classList.remove("visible", "allowed", "blocked");
  }

  removeModeDragCursor() {
    if (this.modeDragMoveHandler) window.removeEventListener("dragover", this.modeDragMoveHandler);
    this.modeDragMoveHandler = null;
    this.modeDragCursor?.remove();
    this.modeDragCursor = null;
    this.shadowRoot?.querySelectorAll(".schedule-card.drop-target,.schedule-card.drop-invalid").forEach((card) => card.classList.remove("drop-target", "drop-invalid"));
  }

  beginScheduleInteraction() {
    if (this.scheduleInteractionActive) return;
    this.scheduleInteractionActive = true;
    const finish = () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      setTimeout(() => {
        this.scheduleInteractionActive = false;
        if (this.scheduleRenderPending && this.data && !this.detailOpen && !this.dragActive) {
          this.renderSchedules(Boolean(this._hass.user?.is_admin));
        }
        this.scheduleRenderPending = false;
      }, 0);
    };
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }

  async load() {
    if (this.loadInFlight) {
      this.loadQueued = true;
      return this.loadInFlight;
    }
    const request = this._load();
    this.loadInFlight = request;
    try {
      return await request;
    } finally {
      if (this.loadInFlight === request) this.loadInFlight = null;
      if (this.loadQueued && this.started) {
        this.loadQueued = false;
        void this.load();
      }
    }
  }

  async _load() {
    if (this.data) this.notice(this.t.loading);
    try {
      this.data = await this._hass.callWS({ type: "climate_planner/data" });
      if (!this.windowLabelDirty) this.windowLabelDraft = this.data.window_label || "";
      if (!this.holidayRegionDirty) this.holidayRegionDraft = this.data.holiday_region || "national";
      if (!this.data.schedules.some((schedule) => schedule.id === this.selectedSchedule)) {
        this.selectedSchedule = this.data.schedules[0]?.id || "";
      }
      this.storageSet("climate-planner-schedule", this.selectedSchedule);
      if (this.dragActive) this.pendingRender = true;
      else this.render();
      this.notice();
    } catch (error) {
      this.notice(error?.code === "not_ready" ? error.message : this.t.saveError, true);
    }
  }

  cloneData() {
    return { modes: structuredClone(this.data.modes), schedules: structuredClone(this.data.schedules) };
  }

  applyOptimisticConfiguration(data) {
    this.data = {
      ...this.data,
      modes: structuredClone(data.modes),
      schedules: structuredClone(data.schedules),
    };
    this.render();
  }

  save(data) {
    if (!this.data) return Promise.resolve(false);
    this.applyOptimisticConfiguration(data);
    const request = this.saveQueue.then(async () => {
      this.applyOptimisticConfiguration(data);
      try {
        await this._hass.callWS({
          type: "climate_planner/configure",
          revision: this.data.revision,
          ...data,
        });
        await this.load();
        this.closeDialog();
        return true;
      } catch (error) {
        await this.load();
        if (error?.code === "conflict") this.notice(this.t.conflict, true);
        else this.notice(error?.code === "invalid_input"
          ? `${this.t.invalid} (${error.message || ""})`
          : this.t.saveError, true);
        return false;
      }
    });
    this.saveQueue = request.catch(() => {});
    return request;
  }

  exportSettings() {
    return {
      window_label: this.data?.window_label || "",
      holiday_region: this.data?.holiday_region || "national",
    };
  }

  exportDocument(kind, schedules, modes) {
    return {
      format: "climate_planner_export",
      format_version: 1,
      export_kind: kind,
      exported_at: new Date().toISOString(),
      settings: this.exportSettings(),
      modes: structuredClone(modes),
      schedules: structuredClone(schedules),
    };
  }

  downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = globalThis.document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  exportFilenamePart(value) {
    return String(value || "climate-planner")
      .normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "climate-planner";
  }

  exportAll() {
    if (!this._hass.user?.is_admin || !this.data) return;
    const document = this.exportDocument("all", this.data.schedules, this.data.modes);
    this.downloadJson(`climate-planner-${new Date().toISOString().slice(0, 10)}.json`, document);
    this.notice(this.t.exportAll);
  }

  exportSchedule(scheduleId) {
    if (!this._hass.user?.is_admin || !this.data) return;
    const schedule = this.data.schedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    const modeIds = new Set((schedule.assignments || []).map((assignment) => assignment.mode_id));
    const modes = this.data.modes.filter((mode) => modeIds.has(mode.id));
    if (modes.length !== modeIds.size) {
      this.notice(this.t.invalid, true);
      return;
    }
    const document = this.exportDocument("schedule", [schedule], modes);
    this.downloadJson(`climate-planner-${this.exportFilenamePart(schedule.name)}.json`, document);
    this.notice(this.t.exportSchedule);
  }

  validImportDocument(document) {
    if (!document || document.format !== "climate_planner_export" || document.format_version !== 1
      || !["all", "schedule"].includes(document.export_kind)
      || !Array.isArray(document.modes) || !Array.isArray(document.schedules)) return false;
    const modeIds = new Set();
    for (const mode of document.modes) {
      if (!mode || typeof mode.id !== "string" || !mode.id || modeIds.has(mode.id)) return false;
      modeIds.add(mode.id);
    }
    const scheduleIds = new Set();
    for (const schedule of document.schedules) {
      if (!schedule || typeof schedule.id !== "string" || !schedule.id || scheduleIds.has(schedule.id)
        || !Array.isArray(schedule.assignments)) return false;
      scheduleIds.add(schedule.id);
      for (const assignment of schedule.assignments) {
        if (!assignment || typeof assignment.mode_id !== "string" || !modeIds.has(assignment.mode_id)) return false;
      }
    }
    return document.export_kind === "schedule" ? document.schedules.length === 1 : true;
  }

  async importFile(file) {
    const input = this.$("import-file-input");
    if (input) input.value = "";
    if (!file || !this._hass.user?.is_admin) return;
    try {
      const document = JSON.parse(await file.text());
      if (!this.validImportDocument(document)) throw new Error("invalid export");
      if (!this.data.climate_entities?.length && document.schedules.length) {
        this.notice(this.t.noClimate, true);
        return;
      }
      this.openImportDialog(document);
    } catch (_) {
      this.notice(this.t.importInvalid, true);
    }
  }

  importEntityMarkup(entity, checked) {
    const detail = [entity.integration, entity.area_name, entity.device_name].filter(Boolean).join(" · ");
    return `<label class="import-entity-option"><input type="checkbox" data-import-entity="${escapeHTML(entity.entity_id)}" ${checked ? "checked" : ""}><span class="import-entity-copy"><strong>${escapeHTML(entity.label || entity.entity_id)}</strong><small>${escapeHTML(detail || entity.entity_id)}</small></span></label>`;
  }

  openImportDialog(document) {
    const dialog = this.$("dialog");
    this.dialogKind = "import";
    this.dialogContext = document;
    const entities = this.data.climate_entities || [];
    const schedules = document.schedules.map((schedule) => {
      const sourceIds = schedule.climate_entity_ids || [];
      const sourceNames = schedule.climate_entity_names || {};
      const sourceText = sourceIds.length
        ? sourceIds.map((id) => sourceNames[id] || id).join(", ")
        : this.t.noClimate;
      const options = entities.map((entity) => this.importEntityMarkup(entity, sourceIds.includes(entity.entity_id))).join("");
      return `<section class="import-mapping-card" data-import-schedule="${escapeHTML(schedule.id)}"><h3>${escapeHTML(schedule.name)}</h3><p class="muted">${escapeHTML(sourceText)}</p><fieldset><legend>${escapeHTML(this.t.importEntities)}</legend><div class="import-entity-list">${options}</div></fieldset></section>`;
    }).join("");
    dialog.innerHTML = `<form method="dialog" class="dialog-form"><h2>${escapeHTML(this.t.importTitle)}</h2><p class="muted">${escapeHTML(this.t.importHint)}</p>${schedules ? `<div class="import-mapping">${schedules}</div>` : `<p>${escapeHTML(this.t.noSchedules)}</p>`}<div class="dialog-actions"><button type="button" data-cancel>${escapeHTML(this.t.cancel)}</button><button class="primary" type="submit">${escapeHTML(this.t.import)}</button></div></form>`;
    dialog.querySelector("[data-cancel]").onclick = () => this.closeDialog();
    dialog.querySelector("form").onsubmit = async (event) => {
      event.preventDefault();
      const mappings = new Map();
      dialog.querySelectorAll("[data-import-schedule]").forEach((card) => {
        mappings.set(card.dataset.importSchedule, [...card.querySelectorAll("[data-import-entity]:checked")].map((input) => input.dataset.importEntity));
      });
      if ([...mappings.values()].some((ids) => !ids.length)) {
        this.notice(this.t.importNoSelection, true);
        return;
      }
      await this.applyImport(document, mappings);
    };
    dialog.showModal();
  }

  mapImportedSchedule(schedule, entityIds, entityLookup, modeIdMap = null, disabled = false) {
    const mapped = structuredClone(schedule);
    mapped.climate_entity_ids = [...entityIds];
    const sourceNames = schedule.climate_entity_names || {};
    mapped.climate_entity_names = Object.fromEntries(entityIds.map((entityId) => {
      const entity = entityLookup.get(entityId);
      return [entityId, sourceNames[entityId] || entity?.name || entity?.label || ""];
    }).filter(([, name]) => name));
    if (modeIdMap) {
      mapped.id = newId("schedule");
      mapped.enabled = disabled ? false : mapped.enabled;
      mapped.assignments = (schedule.assignments || []).map((assignment) => ({
        ...structuredClone(assignment),
        id: newId("assignment"),
        mode_id: modeIdMap.get(assignment.mode_id),
        weekday_rules: Object.fromEntries(Object.entries(assignment.weekday_rules || {}).map(([weekday, phases]) => [
          weekday,
          phases.map((phase) => (typeof phase === "string"
            ? { id: newId("phase"), time: phase }
            : { ...phase, id: newId("phase") })),
        ])),
      }));
    }
    return mapped;
  }

  async applyImportedSettings(settings) {
    if (!settings || typeof settings !== "object") return true;
    let skipped = false;
    const knownLabels = new Set((this.data.window_labels || []).map((item) => item.id));
    if (typeof settings.window_label === "string") {
      if (!settings.window_label || knownLabels.has(settings.window_label)) {
        try { await this._hass.callWS({ type: "climate_planner/set_window_label", label_id: settings.window_label }); } catch (_) { skipped = true; }
      } else skipped = true;
    }
    const knownRegions = new Set(this.holidayRegionOptions().map(([region]) => region));
    if (typeof settings.holiday_region === "string") {
      if (knownRegions.has(settings.holiday_region)) {
        try { await this._hass.callWS({ type: "climate_planner/set_holiday_region", region: settings.holiday_region }); } catch (_) { skipped = true; }
      } else skipped = true;
    }
    if (settings.window_label !== undefined || settings.holiday_region !== undefined) await this.load();
    return !skipped;
  }

  async applyImport(document, mappings) {
    if (document.export_kind === "all" && !window.confirm(this.t.importReplaceConfirm)) return;
    const entityLookup = new Map((this.data.climate_entities || []).map((entity) => [entity.entity_id, entity]));
    if (document.export_kind === "all") {
      const schedules = document.schedules.map((schedule) => this.mapImportedSchedule(schedule, mappings.get(schedule.id) || [], entityLookup));
      if (!await this.save({ modes: structuredClone(document.modes), schedules })) return;
      const settingsApplied = await this.applyImportedSettings(document.settings);
      this.notice(settingsApplied ? this.t.imported : this.t.importSettingsSkipped, !settingsApplied);
      return;
    }
    const modeIdMap = new Map(document.modes.map((mode) => [mode.id, newId("mode")]));
    const modes = document.modes.map((mode) => ({ ...structuredClone(mode), id: modeIdMap.get(mode.id) }));
    const schedules = document.schedules.map((schedule) => this.mapImportedSchedule(
      schedule, mappings.get(schedule.id) || [], entityLookup, modeIdMap, true,
    ));
    const next = this.cloneData();
    next.modes.push(...modes);
    next.schedules.push(...schedules);
    if (!await this.save(next)) return;
    this.selectedSchedule = schedules[0]?.id || this.selectedSchedule;
    this.storageSet("climate-planner-schedule", this.selectedSchedule);
    this.render();
    this.notice(this.t.importedSchedule);
  }

  updateWindowLabelSaveState() {
    const button = this.$("save-window-label");
    if (button) button.disabled = !this.windowLabelDirty;
  }

  handleWindowLabelValueChanged(event) {
    const value = event.detail?.value;
    const next = typeof value === "string"
      ? value
      : typeof value?.window_label === "string" ? value.window_label : "";
    if (next === this.windowLabelDraft) return;
    this.windowLabelDraft = next;
    this.windowLabelDirty = this.windowLabelDraft !== (this.data?.window_label || "");
    this.updateWindowLabelSaveState();
    this.scheduleWindowLabelSave();
  }

  scheduleWindowLabelSave() {
    clearTimeout(this.windowLabelSaveTimer);
    if (!this.windowLabelDirty) return;
    this.windowLabelSaveTimer = setTimeout(() => {
      this.windowLabelSaveTimer = null;
      this.saveWindowLabel();
    }, 150);
  }

  scheduleNativeWindowLabelRender() {
    if (this.windowLabelNativeLoadPending) return;
    this.windowLabelNativeLoadPending = true;
    ["ha-form", "ha-label-picker"].forEach((elementName) => {
      if (customElements.get(elementName)) return;
      customElements.whenDefined(elementName).then(() => {
        this.windowLabelNativeLoadPending = false;
        if (this.isConnected && this.data) this.renderWindowSettings(Boolean(this._hass?.user?.is_admin));
      });
    });
  }

  renderNativeWindowLabelForm(control) {
    let form = control.querySelector("ha-form");
    if (!form) {
      form = document.createElement("ha-form");
      form.addEventListener("value-changed", (event) => this.handleWindowLabelValueChanged(event));
      control.replaceChildren(form);
    }
    form.hass = this._hass;
    form.data = this.windowLabelDraft ? { window_label: this.windowLabelDraft } : {};
    form.schema = WINDOW_LABEL_FORM_SCHEMA;
    form.computeLabel = (schema) => schema.name === "window_label" ? this.t.windowLabel : schema.name;
    form.computeHelper = () => "";
  }

  renderNativeWindowLabelPicker(control) {
    let picker = control.querySelector("ha-label-picker");
    if (!picker) {
      picker = document.createElement("ha-label-picker");
      picker.noAdd = true;
      picker.required = false;
      picker.addEventListener("value-changed", (event) => this.handleWindowLabelValueChanged(event));
      control.replaceChildren(picker);
    }
    picker.hass = this._hass;
    picker._labels = this.windowLabelRegistryEntries();
    picker.label = this.t.windowLabel;
    picker.value = this.windowLabelDraft || undefined;
    Promise.resolve(picker.updateComplete).then(() => {
      const genericPicker = picker.shadowRoot?.querySelector("ha-generic-picker");
      if (!genericPicker) return;
      genericPicker.valueRenderer = (value) => {
        const entry = this.windowLabelRegistryEntries().find((item) => item.label_id === value);
        if (!customElements.get("ha-label")) {
          const display = document.createElement("span");
          display.slot = "headline";
          display.textContent = entry?.name || value;
          return display;
        }
        const display = document.createElement("ha-label");
        display.slot = "headline";
        display.dense = true;
        display.color = entry?.color;
        display.description = entry?.description;
        if (entry?.icon) {
          const icon = document.createElement("ha-icon");
          icon.slot = "icon";
          icon.icon = entry.icon;
          display.append(icon);
        }
        display.append(document.createTextNode(entry?.name || value));
        return display;
      };
    });
  }

  windowLabelRegistryEntries() {
    const options = Array.isArray(this.data?.window_labels) ? this.data.window_labels : [];
    const entries = options.map((item) => ({
      label_id: item.id,
      name: item.name,
      description: item.description || undefined,
      color: item.color || undefined,
      icon: item.icon || undefined,
    }));
    if (this.windowLabelDraft && !entries.some((item) => item.label_id === this.windowLabelDraft)) {
      entries.push({
        label_id: this.windowLabelDraft,
        name: this.data?.window_label_name || this.windowLabelDraft,
      });
    }
    return entries;
  }

  renderFallbackWindowLabelSelect(control) {
    let select = control.querySelector("select");
    if (!select) {
      select = document.createElement("select");
      select.className = "window-label-select";
      select.onchange = () => {
        this.windowLabelDraft = select.value;
        this.windowLabelDirty = this.windowLabelDraft !== (this.data?.window_label || "");
        this.updateWindowLabelSaveState();
        this.scheduleWindowLabelSave();
      };
      control.replaceChildren(select);
    }
    const options = Array.isArray(this.data?.window_labels) ? this.data.window_labels : [];
    const selectedOption = options.find((item) => item.id === this.windowLabelDraft);
    const currentOption = this.windowLabelDraft && !selectedOption
      ? [{ id: this.windowLabelDraft, name: this.data?.window_label_name || this.windowLabelDraft }]
      : [];
    select.innerHTML = `<option value="">${escapeHTML(this.t.noWindowLabel)}</option>${[...currentOption, ...options].map((item) => `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`).join("")}`;
    select.value = this.windowLabelDraft;
  }

  holidayRegionOptions() {
    return [
      ["national", this.t.holidayRegionNational],
      ["bw", this.t.regionBw], ["by", this.t.regionBy], ["be", this.t.regionBe],
      ["bb", this.t.regionBb], ["hb", this.t.regionHb], ["hh", this.t.regionHh],
      ["he", this.t.regionHe], ["mv", this.t.regionMv], ["ni", this.t.regionNi],
      ["nw", this.t.regionNw], ["rp", this.t.regionRp], ["sl", this.t.regionSl],
      ["sn", this.t.regionSn], ["st", this.t.regionSt], ["sh", this.t.regionSh],
      ["th", this.t.regionTh],
    ];
  }

  renderHolidayRegionSelect(admin) {
    const control = this.$("holiday-region-control");
    if (!control) return;
    control.hidden = !admin;
    if (!admin) return;
    control.innerHTML = `<select data-holiday-region aria-label="${escapeHTML(this.t.holidayRegion)}">${this.holidayRegionOptions().map(([value, label]) => `<option value="${value}">${escapeHTML(label)}</option>`).join("")}</select>`;
    const select = control.querySelector("[data-holiday-region]");
    select.value = this.holidayRegionDraft;
    select.addEventListener("change", () => {
      this.holidayRegionDraft = select.value;
      this.holidayRegionDirty = this.holidayRegionDraft !== (this.data?.holiday_region || "national");
      this.saveHolidayRegion();
    });
  }

  renderWindowSettings(admin) {
    const section = this.$("general-settings");
    if (!section) return;
    section.hidden = !admin;
    if (!admin) return;
    this.$("general-settings-title").textContent = this.t.generalSettings;
    this.$("window-settings-title").textContent = this.t.windowSettings;
    this.$("window-settings-hint").textContent = this.t.windowLabelHint;
    this.$("holiday-region-title").textContent = this.t.holidayRegion;
    this.$("holiday-region-hint").textContent = this.t.holidayRegionHint;
    this.renderHolidayRegionSelect(admin);
    this.updateWindowLabelSaveState();
    const control = this.$("window-label-control");
    if (!control) return;
    if (customElements.get("ha-label-picker")) this.renderNativeWindowLabelPicker(control);
    else if (customElements.get("ha-form")) this.renderNativeWindowLabelForm(control);
    else {
      this.renderFallbackWindowLabelSelect(control);
      this.scheduleNativeWindowLabelRender();
    }
  }

  async saveWindowLabel() {
    if (!this._hass.user?.is_admin || !this.windowLabelDirty || this.windowLabelSavePending) return;
    this.windowLabelSavePending = true;
    const labelId = this.windowLabelDraft;
    try {
      await this._hass.callWS({
        type: "climate_planner/set_window_label",
        label_id: labelId,
      });
      if (this.windowLabelDraft === labelId) this.windowLabelDirty = false;
      await this.load();
    } catch (error) {
      this.notice(error?.code === "unauthorized" ? this.t.invalid : this.t.saveError, true);
    } finally {
      this.windowLabelSavePending = false;
      if (this.windowLabelDirty && this.windowLabelDraft !== labelId) this.scheduleWindowLabelSave();
    }
  }

  async saveHolidayRegion() {
    if (!this._hass.user?.is_admin || !this.holidayRegionDirty || this.holidayRegionSavePending) return;
    this.holidayRegionSavePending = true;
    const region = this.holidayRegionDraft;
    try {
      await this._hass.callWS({
        type: "climate_planner/set_holiday_region",
        region,
      });
      if (this.holidayRegionDraft === region) this.holidayRegionDirty = false;
      await this.load();
    } catch (error) {
      this.notice(error?.code === "unauthorized" ? this.t.invalid : this.t.saveError, true);
    } finally {
      this.holidayRegionSavePending = false;
      if (this.holidayRegionDirty && this.holidayRegionDraft !== region) this.saveHolidayRegion();
    }
  }

  render() {
    const admin = Boolean(this._hass.user?.is_admin);
    const detail = this.detailOpen;
    const main = this.shadowRoot.querySelector("main");
    main.classList.toggle("overview-layout", !detail);
    main.style.gridTemplateAreas = detail ? '"header" "week"' : '"header" "overview-top" "schedules"';
    main.style.gridTemplateRows = detail ? "auto auto" : "auto minmax(0,auto) minmax(0,1fr)";
    this.$("back-overview").hidden = !detail;
    this.$("back-overview").title = this.t.overview;
    this.$("summary-section").hidden = true;
    this.$("overview-top").hidden = detail;
    this.$("overview-top").classList.toggle("no-settings", !admin || detail);
    this.$("schedules-section").hidden = detail;
    this.$("modes-section").hidden = detail;
    this.$("week-section").hidden = !detail;
    this.renderWindowSettings(admin && !detail);
    this.$("export-all").textContent = this.t.exportAll;
    this.$("export-all").hidden = !admin;
    this.$("import-file").textContent = this.t.import;
    this.$("import-file").hidden = !admin;
    this.$("add-mode").textContent = this.t.addMode;
    this.$("add-mode").hidden = !admin;
    this.$("add-schedule").textContent = this.t.addSchedule;
    this.$("add-schedule").hidden = !admin;
    this.$("modes-title").textContent = this.t.modes;
    this.$("schedules-title").textContent = this.t.schedules;
    this.$("week-title").textContent = this.t.week;
    this.$("drag-hint").textContent = this.t.dragHint;
    if (detail) this.renderWeek();
    else { this.renderModes(admin); this.renderSchedules(admin); }
  }

  lastActivatedForSchedule(schedule) {
    return this.optimisticActivations.get(schedule.id)
      || this.data.last_activated?.[schedule.id];
  }

  openScheduleDetails(scheduleId) {
    this.selectedSchedule = scheduleId;
    this.detailOpen = true;
    this.storageSet("climate-planner-schedule", scheduleId);
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  renderSummary() {
    const schedules = this.data.schedules || [];
    const activeCount = schedules.filter((schedule) => this.data.active?.[schedule.id]).length;
    const phaseCount = schedules.reduce((total, schedule) => total + this.schedulePhases(schedule).length, 0);
    const nextEvents = Object.values(this.data.next_events || {}).filter(Boolean).sort();
    this.$("summary").innerHTML = `<div class="summary-card"><span class="muted">${this.t.schedules}</span><strong>${schedules.length}</strong></div><div class="summary-card"><span class="muted">${this.t.active}</span><strong>${activeCount}</strong></div><div class="summary-card"><span class="muted">${this.t.phase}</span><strong>${phaseCount}</strong></div><div class="summary-card"><span class="muted">${this.t.next}</span><strong>${escapeHTML(this.formatDate(nextEvents[0]))}</strong></div>`;
  }

  renderModes(admin) {
    const target = this.$("modes");
    if (!this.data.modes.length) { target.innerHTML = `<p class="empty">${this.t.noModes}</p>`; return; }
    const sortedModes = [...this.data.modes].sort((left, right) => left.name.localeCompare(right.name, this._hass?.language, { sensitivity: "base" }));
    target.innerHTML = sortedModes.map((mode) => `<article class="card mode-card compact-mode-row" draggable="${admin}" data-mode-drag="${escapeHTML(mode.id)}" ${admin ? `role="button" tabindex="0" aria-label="${escapeHTML(`${this.t.edit}: ${mode.name}`)}"` : ""}><span class="compact-mode-leading">${mode.color ? `<span class="mode-color" style="background:${escapeHTML(mode.color)}"></span>` : ""}${mode.icon ? `<ha-icon class="mode-icon" icon="${escapeHTML(mode.icon)}" aria-label="${escapeHTML(mode.icon)}" title="${escapeHTML(mode.icon)}"></ha-icon>` : ""}</span><span class="compact-mode-copy"><strong class="compact-mode-name">${escapeHTML(mode.name)}</strong><span class="compact-mode-details"><span class="compact-mode-temperature">${escapeHTML(this.temperatureText(mode.target_temperature))}</span><span class="muted compact-mode-priority">${escapeHTML(this.t.priority)} ${escapeHTML(mode.priority ?? 0)}</span></span></span>${admin ? `<button type="button" class="compact-mode-delete" data-action="delete-mode" data-id="${escapeHTML(mode.id)}" aria-label="${escapeHTML(this.t.remove)}" title="${escapeHTML(this.t.remove)}"><ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon></button>` : ""}</article>`).join("");
    if (admin) this.$("modes").querySelectorAll("[data-mode-drag]").forEach((card) => {
      const openEditor = (event) => {
        if (event.target.closest("[data-action]") || Date.now() < (this.modeDragClickSuppressUntil || 0)) return;
        this.openModeDialog(card.dataset.modeDrag);
      };
      card.addEventListener("click", openEditor);
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openEditor(event);
      });
      card.addEventListener("dragstart", (event) => {
        this.dragActive = true;
        this.dragState = { modeId: card.dataset.modeDrag };
        event.dataTransfer.setData("text/plain", `mode:${card.dataset.modeDrag}`);
        event.dataTransfer.effectAllowed = "copy";
        card.classList.add("dragging");
        this.createModeDragCursor(this.mode(card.dataset.modeDrag));
      });
      card.addEventListener("dragend", () => { card.classList.remove("dragging"); this.modeDragClickSuppressUntil = Date.now() + 250; this.finishDrag(); });
    });
    target.querySelectorAll("[data-action]").forEach((button) => button.onclick = () => this.handleAction(button.dataset.action, button.dataset.id));
  }

  mode(modeId) { return this.data.modes.find((mode) => mode.id === modeId); }

  phaseTime(phase) { return typeof phase === "string" ? phase : phase?.time || ""; }

  phaseId(phase) { return typeof phase === "string" ? "" : phase?.id || ""; }

  phaseTemperature(mode, phase) {
    return typeof phase === "object" && phase?.target_temperature != null
      ? phase.target_temperature
      : mode?.target_temperature;
  }

  assignmentContinuous(assignment) {
    return assignment?.continuous === true
      || (assignment?.auto_rules || []).some((rule) => rule?.continuous === true);
  }

  assignmentTemperature(schedule, assignment, mode) {
    if (this.assignmentContinuous(assignment)) {
      return mode?.target_temperature;
    }
    const temperatures = this.schedulePhases(schedule)
      .filter((entry) => entry.assignment.id === assignment.id)
      .map((entry) => this.phaseTemperature(mode, entry.phase));
    if (!temperatures.length || temperatures.some((value) => value !== temperatures[0])) {
      return mode?.target_temperature;
    }
    return temperatures[0];
  }

  schedulePhases(schedule) {
    return Object.entries(schedule?.assignments || {}).flatMap(([assignmentIndex, assignment]) => Object.entries(assignment.weekday_rules || {}).flatMap(([weekday, phases]) => phases.map((phase, phaseIndex) => ({ assignment, assignmentIndex, weekday, phase, phaseIndex }))));
  }

  phaseEntry(schedule, phaseId) {
    return this.schedulePhases(schedule).find((entry) => this.phaseId(entry.phase) === phaseId);
  }

  phaseStartsSegment(schedule, weekday, segment) {
    if (!schedule || !weekday || !segment?.phase_id) return false;
    const entry = this.phaseEntry(schedule, segment.phase_id);
    return Boolean(
      entry
      && entry.weekday === weekday
      && this.phaseMinutes(entry.phase) === segment.start,
    );
  }

  phaseForSegmentStart(schedule, weekday, segment) {
    if (!schedule || !weekday || !segment) return "";
    if (segment.start > 0) return segment.phase_id || "";
    const candidates = schedule.assignments
      .flatMap((assignment) => (assignment.weekday_rules?.[weekday] || []).map((phase) => ({ assignment, phase })))
      .filter(({ phase }) => this.phaseMinutes(phase) === 0);
    const modeCandidates = candidates
      .filter(({ assignment }) => assignment.mode_id === segment.mode_id)
      .map(({ phase }) => phase);
    const midnightCandidates = candidates.map(({ phase }) => phase);
    return modeCandidates.find((phase) => this.phaseId(phase) === segment.phase_id)
      ? segment.phase_id
      : this.phaseId(modeCandidates[0] || midnightCandidates[0]);
  }

  renderSchedules(admin) {
    const target = this.$("schedules");
    this.lastScheduleRenderSignature = this.scheduleRenderSignature();
    if (!this.data.schedules.length) { target.innerHTML = `<p class="empty">${this.t.noSchedules}</p>`; return; }
    target.innerHTML = this.data.schedules.map((schedule) => {
      const lastActivated = this.lastActivatedForSchedule(schedule);
      const lastActivatedMode = lastActivated ? this.mode(lastActivated.mode_id) : null;
      const lastActivatedMarkup = lastActivated
        ? escapeHTML(lastActivatedMode?.name || lastActivated.mode_name)
        : escapeHTML(this.t.none);
      const availableModes = [];
      schedule.assignments.forEach((assignment) => {
        const mode = this.mode(assignment.mode_id);
        if (mode && !availableModes.some((item) => item.mode.id === mode.id)) {
          availableModes.push({
            mode,
            enabled: assignment.enabled,
            assignmentId: assignment.id,
            temperature: this.assignmentTemperature(schedule, assignment, mode),
          });
        } else if (mode && assignment.enabled) {
          const existing = availableModes.find((item) => item.mode.id === mode.id);
          if (existing) existing.enabled = true;
        }
      });
      availableModes.sort((left, right) => left.mode.name.localeCompare(right.mode.name, this._hass?.language, { sensitivity: "base" }));
      const modeButtonMarkup = availableModes.map(({ mode, enabled, assignmentId, temperature }) => {
        const selected = lastActivated?.mode_id === mode.id;
        const dot = mode.color ? `<span class="quick-mode-dot" style="background:${escapeHTML(mode.color)}"></span>` : "<span class=\"quick-mode-dot default\"></span>";
        const icon = mode.icon ? `<ha-icon class="quick-mode-icon" icon="${escapeHTML(mode.icon)}" aria-hidden="true"></ha-icon>` : "";
        const check = selected ? `<span class="quick-mode-check">✓</span>` : "";
        const toggleIcon = enabled ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline";
        const assignmentActionLabel = enabled ? this.t.pauseMode : this.t.activateAssignment;
        const toggle = admin ? `<button type="button" class="assignment-toggle" data-action="toggle-schedule-mode" data-schedule="${escapeHTML(schedule.id)}" data-id="${escapeHTML(mode.id)}" aria-pressed="${enabled}" aria-label="${escapeHTML(assignmentActionLabel)}" title="${escapeHTML(assignmentActionLabel)}"><ha-icon icon="${toggleIcon}" aria-hidden="true"></ha-icon></button>` : "";
        const settings = admin && assignmentId ? `<button type="button" class="assignment-settings" data-action="edit-assignment" data-schedule="${escapeHTML(schedule.id)}" data-id="${escapeHTML(assignmentId)}" aria-label="${escapeHTML(this.t.editAssignment)}" title="${escapeHTML(this.t.editAssignment)}"><ha-icon icon="mdi:cog-outline" aria-hidden="true"></ha-icon></button>` : "";
        const remove = admin && assignmentId ? `<button type="button" class="assignment-delete" data-action="delete-assignment" data-schedule="${escapeHTML(schedule.id)}" data-id="${escapeHTML(assignmentId)}" aria-label="${escapeHTML(this.t.deleteAssignment)}" title="${escapeHTML(this.t.remove)}"><ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon></button>` : "";
        const activate = admin ? `<button type="button" class="quick-mode-activate" data-action="activate-mode" data-schedule="${escapeHTML(schedule.id)}" data-id="${escapeHTML(mode.id)}" data-assignment="${escapeHTML(assignmentId)}" aria-label="${escapeHTML(this.t.activateMode)}" title="${escapeHTML(this.t.activateMode)}"><ha-icon icon="mdi:play-circle-outline" aria-hidden="true"></ha-icon></button>` : "";
        const tools = toggle || settings || remove ? `<div class="assignment-tools">${toggle}${settings}${remove}</div>` : "";
        return `<div class="quick-mode-wrap ${selected ? "active" : ""} ${enabled ? "" : "paused"}">${activate}<button type="button" class="quick-mode" data-action="edit-assignment" data-schedule="${escapeHTML(schedule.id)}" data-id="${escapeHTML(assignmentId)}" ${admin ? "" : "disabled"}>${dot}${icon}<span class="quick-mode-copy"><strong>${escapeHTML(mode.name)}</strong><span class="quick-mode-details"><small class="quick-mode-temperature">${escapeHTML(this.temperatureText(temperature))}</small><small class="quick-mode-priority">${escapeHTML(this.t.priority)}: ${escapeHTML(mode.priority ?? 0)}</small></span></span>${check}</button>${tools}</div>`;
      }).join("");
      const modeButtons = availableModes.length ? `<div class="quick-mode-title"><span>${this.t.chooseMode}</span></div><div class="quick-modes" aria-label="${escapeHTML(this.t.chooseMode)}">${modeButtonMarkup}</div>` : "";
      const windowDetectionEnabled = schedule.window_open_enabled !== false;
      const windowOpen = windowDetectionEnabled && (this.data.window_status?.[schedule.id]?.open_entity_ids || []).length > 0;
      const windowStatusMarkup = windowOpen
        ? `<span class="window-status">${escapeHTML(this.t.windowOpen)}</span>`
        : !windowDetectionEnabled ? `<span class="muted">${escapeHTML(this.t.windowDetectionOff)}</span>` : "";
      const scheduleToggleIcon = schedule.enabled ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline";
      const scheduleToggle = admin ? `<button type="button" class="schedule-toggle" data-action="toggle-schedule" data-schedule="${escapeHTML(schedule.id)}" aria-pressed="${schedule.enabled}" aria-label="${escapeHTML(schedule.enabled ? this.t.pauseSchedule : this.t.activateSchedule)}" title="${escapeHTML(schedule.enabled ? this.t.pauseSchedule : this.t.activateSchedule)}"><ha-icon icon="${scheduleToggleIcon}" aria-hidden="true"></ha-icon></button>` : "";
      const windowDetectionToggleIcon = windowDetectionEnabled ? "mdi:window-open-variant" : "mdi:window-closed-variant";
      const windowDetectionToggle = admin ? `<button type="button" class="schedule-toggle window-detection-toggle ${windowDetectionEnabled ? "" : "off"}" data-action="toggle-window-detection" data-schedule="${escapeHTML(schedule.id)}" aria-pressed="${windowDetectionEnabled}" aria-label="${escapeHTML(windowDetectionEnabled ? this.t.disableWindowDetection : this.t.enableWindowDetection)}" title="${escapeHTML(windowDetectionEnabled ? this.t.disableWindowDetection : this.t.enableWindowDetection)}"><ha-icon icon="${windowDetectionToggleIcon}" aria-hidden="true"></ha-icon></button>` : "";
      const duplicatePending = this.duplicateSchedulePending === schedule.id;
      const scheduleDuplicate = admin ? `<button type="button" class="schedule-duplicate ${duplicatePending ? "pending" : ""}" data-action="duplicate-schedule" data-id="${escapeHTML(schedule.id)}" aria-busy="${duplicatePending}" aria-label="${escapeHTML(duplicatePending ? this.t.duplicating : this.t.duplicate)}" title="${escapeHTML(duplicatePending ? this.t.duplicating : this.t.duplicate)}" ${duplicatePending ? "disabled" : ""}><ha-icon icon="mdi:content-copy" aria-hidden="true"></ha-icon></button>` : "";
      const scheduleExport = admin ? `<button type="button" class="schedule-export" data-action="export-schedule" data-id="${escapeHTML(schedule.id)}" aria-label="${escapeHTML(this.t.exportSchedule)}" title="${escapeHTML(this.t.exportSchedule)}"><ha-icon icon="mdi:export-variant" aria-hidden="true"></ha-icon></button>` : "";
      return `<article class="card schedule-card compact ${schedule.id === this.selectedSchedule ? "selected" : ""}" data-schedule-card="${escapeHTML(schedule.id)}"><div class="schedule-card-top"><div><h3>${escapeHTML(schedule.name)} <span class="status-dot ${schedule.enabled ? "" : "off"}" aria-label="${escapeHTML(schedule.enabled ? this.t.enabled : this.t.unavailable)}">${schedule.enabled ? "●" : "○"}</span></h3><div class="schedule-entities">${this.climateEntityRows(schedule.climate_entity_ids, lastActivated?.target_temperature, schedule)}</div></div><div class="schedule-card-top-tools">${admin ? `<div class="schedule-card-icon-tools">${scheduleToggle}${windowDetectionToggle}${scheduleDuplicate}</div>` : ""}</div></div><div class="schedule-summary"><span><strong>${this.t.lastActivated}:</strong> ${lastActivatedMarkup}</span><span class="muted"><strong>${this.t.next}:</strong> ${escapeHTML(this.formatDate(this.data.next_events?.[schedule.id]))}</span>${windowStatusMarkup}</div>${modeButtons}<div class="actions"><button data-action="open-schedule-details" data-schedule="${escapeHTML(schedule.id)}">${this.t.details}</button>${admin ? `${scheduleExport}<button data-action="edit-schedule" data-id="${escapeHTML(schedule.id)}">${this.t.edit}</button><button class="danger" data-action="delete-schedule" data-id="${escapeHTML(schedule.id)}">${this.t.remove}</button>` : ""}</div></article>`;
    }).join("");
    target.querySelectorAll("[data-schedule-card]").forEach((card) => {
      card.addEventListener("dragover", (event) => {
        const modeId = this.dragState?.modeId;
        if (!modeId) return;
        event.preventDefault();
        const schedule = this.data.schedules.find((item) => item.id === card.dataset.scheduleCard);
        const allowed = Boolean(schedule) && !schedule.assignments.some((assignment) => assignment.mode_id === modeId);
        event.dataTransfer.dropEffect = allowed ? "copy" : "none";
        card.classList.toggle("drop-target", allowed);
        card.classList.toggle("drop-invalid", !allowed);
        this.setModeDragCursorState(event, allowed, schedule?.name);
      });
      card.addEventListener("dragleave", (event) => {
        if (card.contains(event.relatedTarget)) return;
        card.classList.remove("drop-target", "drop-invalid");
        this.hideModeDragCursor();
      });
      card.addEventListener("drop", (event) => {
        event.preventDefault();
        card.classList.remove("drop-target", "drop-invalid");
        this.hideModeDragCursor();
        const payload = event.dataTransfer.getData("text/plain");
        if (!payload.startsWith("mode:")) return;
        const modeId = payload.slice(5);
        const schedule = this.data.schedules.find((item) => item.id === card.dataset.scheduleCard);
        if (!schedule || schedule.assignments.some((assignment) => assignment.mode_id === modeId)) {
          this.notice(this.t.modeAlreadyAssigned, true);
          return;
        }
        this.openAssignmentDialog(card.dataset.scheduleCard, null, modeId);
      });
    });
    target.ondragover = (event) => {
      if (!this.dragActive || target.scrollHeight <= target.clientHeight) return;
      event.preventDefault();
      const rect = target.getBoundingClientRect();
      const edge = Math.min(72, rect.height / 4);
      if (event.clientY < rect.top + edge) target.scrollTop -= 24;
      else if (event.clientY > rect.bottom - edge) target.scrollTop += 24;
    };
    target.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => { this.beginScheduleInteraction(); event.stopPropagation(); });
      button.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await this.handleAction(button.dataset.action, button.dataset.id, button.dataset.schedule, button.dataset.assignment);
      };
    });
    target.querySelectorAll("[data-climate-entity]").forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.showClimateMoreInfo(button.dataset.climateEntity);
      };
    });
  }

  formatDate(value) {
    if (!value) return "—";
    try { return new Intl.DateTimeFormat(this._hass.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch (_) { return value; }
  }

  renderWeek() {
    const target = this.$("week");
    if (!this.data) return;
    if (!this.data.schedules.length) { target.innerHTML = `<p class="empty">${this.t.noSchedules}</p>`; return; }
    if (!this.data.schedules.some((schedule) => schedule.id === this.selectedSchedule)) this.selectedSchedule = this.data.schedules[0].id;
    const view = this.data.week_views?.[this.selectedSchedule];
    const schedule = this.data.schedules.find((item) => item.id === this.selectedSchedule);
    const admin = Boolean(this._hass.user?.is_admin);
    const days = view?.days.map((day) => {
      const laneTracks = Array.isArray(day.priority_tracks) && day.priority_tracks.length
        ? day.priority_tracks
        : [{ priority: 0, segments: day.segments || [] }];
      const lanes = laneTracks.map((laneTrack) => {
        const resolvedSegments = laneTrack.segments || [];
        const segments = resolvedSegments.map((segment, segmentIndex) => {
          const startText = `${String(Math.floor(segment.start / 60)).padStart(2, "0")}:${String(segment.start % 60).padStart(2, "0")}`;
          const endText = `${String(Math.floor(segment.end / 60)).padStart(2, "0")}:${String(segment.end % 60).padStart(2, "0")}`;
          const phaseStartsHere = this.phaseStartsSegment(schedule, day.weekday, segment);
          const phaseId = phaseStartsHere ? segment.phase_id || "" : "";
          const duplicate = admin && phaseStartsHere
            ? `<button type="button" class="segment-duplicate" data-duplicate-phase aria-label="${escapeHTML(this.t.duplicate)}" title="${escapeHTML(this.t.duplicate)}" draggable="false"><ha-icon icon="mdi:content-copy" aria-hidden="true"></ha-icon></button>`
            : "";
          const transitionPhaseId = phaseStartsHere && schedule ? this.phaseForSegmentStart(schedule, day.weekday, segment) : "";
          const previousSegment = resolvedSegments[segmentIndex - 1];
          const nextSegment = resolvedSegments[segmentIndex + 1];
          const minimumStart = previousSegment ? previousSegment.start + 15 : 0;
          const maximumStart = nextSegment ? nextSegment.start - 15 : 1439;
          const transition = admin && transitionPhaseId
            ? `<span class="transition-handle" data-phase-id="${escapeHTML(transitionPhaseId)}" data-segment-day="${escapeHTML(day.weekday)}" data-min-start="${minimumStart}" data-max-start="${maximumStart}" style="top:${(segment.start / 1440) * 100}%" tabindex="0" title="${escapeHTML(this.t.transition)}" draggable="false"></span>`
            : "";
          return `<div class="segment" draggable="${admin && Boolean(phaseId)}" data-phase-id="${escapeHTML(phaseId)}" data-segment-day="${escapeHTML(day.weekday)}" data-segment-start="${segment.start}" data-segment-end="${segment.end}" style="top:${(segment.start / 1440) * 100}%;height:${((segment.end - segment.start) / 1440) * 100}%;${segment.color ? `border-left-color:${escapeHTML(segment.color)};background:color-mix(in srgb,${escapeHTML(segment.color)} 20%,var(--card-background-color))` : ""}">${duplicate}<div class="segment-head">${segment.icon ? `<ha-icon class="segment-icon" icon="${escapeHTML(segment.icon)}"></ha-icon>` : ""}<strong>${escapeHTML(segment.mode_name)}</strong></div><small>${escapeHTML(this.temperatureText(segment.target_temperature))}</small><small class="segment-time">${escapeHTML(startText)}–${escapeHTML(endText)}</small></div>${transition}`;
        }).join("");
        return `<div class="day-lane" data-priority="${escapeHTML(String(laneTrack.priority ?? 0))}">${segments}</div>`;
      }).join("");
      const nowLine = view.current_weekday === day.weekday && view.current_minute != null
        ? `<div class="now-line" style="top:${(view.current_minute / 1440) * 100}%" title="now"></div>`
        : "";
      return `<section class="day-column"><h3>${escapeHTML(this.t[day.weekday])}</h3><div class="day-track" data-drop-day="${escapeHTML(day.weekday)}"><div class="drop-indicator" hidden><span></span></div><div class="day-lanes">${lanes}</div>${nowLine}<div class="time-labels"><span style="top:0">00:00</span><span style="top:25%">06:00</span><span style="top:50%">12:00</span><span style="top:75%">18:00</span></div></div></section>`;
    }).join("") || "";
    const minimumDayWidth = 150;
    const usedModes = [];
    schedule?.assignments.forEach((assignment) => {
      const mode = this.mode(assignment.mode_id);
      const existing = mode && usedModes.find((item) => item.mode.id === mode.id);
      if (mode && !existing) usedModes.push({ mode, assignmentId: assignment.id, enabled: assignment.enabled });
      else if (existing && assignment.enabled) existing.enabled = true;
    });
    usedModes.sort((left, right) => left.mode.name.localeCompare(right.mode.name, this._hass?.language, { sensitivity: "base" }));
    const usedModeMarkup = usedModes.map(({ mode, assignmentId, enabled }) => {
      const dot = mode.color ? `<span class="quick-mode-dot" style="background:${escapeHTML(mode.color)}"></span>` : "<span class=\"quick-mode-dot default\"></span>";
      const icon = mode.icon ? `<ha-icon icon="${escapeHTML(mode.icon)}" aria-hidden="true"></ha-icon>` : "";
      const content = `${dot}${icon}<span>${escapeHTML(mode.name)}</span>`;
      const toggleIcon = enabled ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline";
      return admin
        ? `<span class="week-mode-chip-wrap"><button type="button" class="week-mode-chip ${enabled ? "" : "paused"}" draggable="true" data-edit-assignment="${escapeHTML(assignmentId)}" data-assignment-drag="${escapeHTML(assignmentId)}" title="${escapeHTML(this.t.editAssignment)}">${content}</button><button type="button" class="week-mode-chip-toggle" data-week-mode-toggle data-action="toggle-schedule-mode" data-schedule="${escapeHTML(this.selectedSchedule)}" data-id="${escapeHTML(mode.id)}" aria-pressed="${enabled}" aria-label="${escapeHTML(enabled ? this.t.pauseMode : this.t.activateAssignment)}" title="${escapeHTML(enabled ? this.t.pauseMode : this.t.activateAssignment)}"><ha-icon icon="${toggleIcon}" aria-hidden="true"></ha-icon></button></span>`
        : `<span class="week-mode-chip ${enabled ? "" : "paused"}">${content}</span>`;
    }).join("");
    const assignedModeIds = new Set(usedModes.map((item) => item.mode.id));
    const addModeButton = admin && this.data.modes.some((mode) => !assignedModeIds.has(mode.id))
      ? `<button type="button" class="week-mode-add" data-add-assignment>＋ ${escapeHTML(this.t.addAssignment)}</button>`
      : "";
    const modeToolbar = schedule
      ? `<div class="week-used-modes"><span class="week-used-modes-label">${escapeHTML(this.t.usedModes)}</span><div class="week-mode-list">${usedModeMarkup}${addModeButton}</div></div>`
      : "";
    target.innerHTML = `<div class="week-toolbar"><div class="week-toolbar-main"><label>${this.t.selectSchedule}<select id="week-select">${this.data.schedules.map((schedule) => `<option value="${escapeHTML(schedule.id)}" ${schedule.id === this.selectedSchedule ? "selected" : ""}>${escapeHTML(schedule.name)}</option>`).join("")}</select></label>${modeToolbar}</div></div>${view ? `<div class="week-scroll"><div class="week-grid" style="grid-template-columns:repeat(7,minmax(${minimumDayWidth}px,1fr))">${days}</div></div>` : `<p class="empty">${this.t.noWeek}</p>`}`;
    this.$("week-select").onchange = () => { this.selectedSchedule = this.$("week-select").value; this.storageSet("climate-planner-schedule", this.selectedSchedule); this.renderWeek(); };
    target.querySelectorAll("[data-edit-assignment]").forEach((button) => {
      button.onclick = () => this.openAssignmentDialog(this.selectedSchedule, button.dataset.editAssignment);
    });
    target.querySelectorAll("[data-assignment-drag]").forEach((button) => {
      button.addEventListener("dragstart", (event) => {
        this.dragActive = true;
        this.dragState = { assignmentId: button.dataset.assignmentDrag };
        event.stopPropagation();
        event.dataTransfer.setData("text/plain", `assignment-mode:${button.dataset.assignmentDrag}`);
        event.dataTransfer.effectAllowed = "copy";
        button.classList.add("dragging");
      });
      button.addEventListener("dragend", () => { button.classList.remove("dragging"); this.finishDrag(); });
    });
    target.querySelectorAll("[data-week-mode-toggle]").forEach((button) => {
      button.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await this.handleAction(button.dataset.action, button.dataset.id, button.dataset.schedule);
      };
    });
    target.querySelector("[data-add-assignment]")?.addEventListener("click", () => this.openAssignmentDialog(this.selectedSchedule));
    target.querySelectorAll('.segment[data-phase-id]:not([data-phase-id=""])').forEach((segment) => {
      segment.addEventListener("click", (event) => {
        if (Date.now() < this.suppressPhaseClickUntil) {
          this.suppressPhaseClickUntil = 0;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        this.openPhaseDialog(this.selectedSchedule, segment.dataset.phaseId);
      });
      const duplicate = segment.querySelector("[data-duplicate-phase]");
      duplicate?.addEventListener("pointerdown", (event) => { event.preventDefault(); event.stopPropagation(); });
      duplicate?.addEventListener("dragstart", (event) => { event.preventDefault(); event.stopPropagation(); });
      duplicate?.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await this.duplicatePhaseBefore(
          this.selectedSchedule,
          segment.dataset.phaseId,
          segment.dataset.segmentDay,
          Number(segment.dataset.segmentStart),
        );
      });
      if (admin) segment.addEventListener("dragstart", (event) => { if (event.target.closest("[data-duplicate-phase]")) { event.preventDefault(); return; } this.dragActive = true; event.stopPropagation(); const rect = segment.getBoundingClientRect(); const start = Number(segment.dataset.segmentStart); const end = Number(segment.dataset.segmentEnd); const duration = Number.isFinite(start) && Number.isFinite(end) && end > start ? end - start : 0; const offsetMinutes = rect.height && duration ? Math.max(0, Math.min(duration, ((event.clientY - rect.top) / rect.height) * duration)) : 0; const copy = event.altKey || event.ctrlKey || event.metaKey; this.dragState = { phaseId: segment.dataset.phaseId, offsetMinutes }; event.dataTransfer.setData("text/plain", `${copy ? "copy-phase" : "phase"}:${segment.dataset.phaseId}`); event.dataTransfer.effectAllowed = copy ? "copy" : "move"; segment.classList.add("dragging"); });
      if (admin) segment.addEventListener("dragend", () => { segment.classList.remove("dragging"); this.finishDrag(); });
    });
    target.querySelectorAll(".transition-handle[data-phase-id]").forEach((handle) => {
      handle.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.beginPhaseResize(event, this.selectedSchedule, handle.dataset.phaseId, handle.dataset.segmentDay, "transition", handle.closest(".day-track"), Number(handle.dataset.minStart), Number(handle.dataset.maxStart));
      });
      handle.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); });
    });
    target.querySelectorAll("[data-drop-day]").forEach((track) => {
      track.addEventListener("dragover", (event) => { event.preventDefault(); track.classList.add("drop-target"); this.showDropIndicator(track, event, this.dragState?.offsetMinutes || 0); });
      track.addEventListener("dragleave", (event) => { if (!track.contains(event.relatedTarget)) { track.classList.remove("drop-target"); this.clearDropIndicator(track); } });
      track.addEventListener("drop", (event) => {
        event.preventDefault();
        const payload = event.dataTransfer.getData("text/plain");
        const phaseId = payload.startsWith("copy-phase:") ? payload.slice(11) : payload.startsWith("phase:") ? payload.slice(6) : "";
        const dragState = this.dragState;
        const offsetMinutes = dragState?.phaseId === phaseId ? dragState.offsetMinutes : 0;
        const previewTime = track.dataset.dropPhaseId === phaseId ? track.dataset.dropTime : null;
        const time = previewTime || this.timeAtDrop(event, track, offsetMinutes);
        track.classList.remove("drop-target");
        this.clearDropIndicator(track);
        delete track.dataset.dropPhaseId;
        delete track.dataset.dropTime;
        if (phaseId) this.suppressPhaseClickUntil = Date.now() + 750;
        this.dragState = null;
        if (payload.startsWith("assignment-mode:")) return this.addPhaseAt(this.selectedSchedule, payload.slice(16), track.dataset.dropDay, time);
        if (payload.startsWith("mode:")) return this.openAssignmentDialog(this.selectedSchedule, null, payload.slice(5), track.dataset.dropDay, time);
        if (payload.startsWith("copy-phase:")) return this.duplicatePhaseAt(this.selectedSchedule, payload.slice(11), track.dataset.dropDay, time);
        if (payload.startsWith("phase:")) return this.movePhase(this.selectedSchedule, payload.slice(6), track.dataset.dropDay, time);
      });
    });
  }

  showDropIndicator(track, event, offsetMinutes = 0) {
    const indicator = track.querySelector(".drop-indicator");
    if (!indicator) return;
    const time = this.timeAtDrop(event, track, offsetMinutes);
    if (this.dragState?.phaseId) {
      this.dragState.dropDay = track.dataset.dropDay;
      this.dragState.dropTime = time;
      track.dataset.dropPhaseId = this.dragState.phaseId;
    } else delete track.dataset.dropPhaseId;
    track.dataset.dropTime = time;
    const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    indicator.style.top = `${(minutes / 1440) * 100}%`;
    indicator.querySelector("span").textContent = `${this.t[track.dataset.dropDay]} ${time}`;
    indicator.hidden = false;
  }

  clearDropIndicator(track) {
    const indicator = track.querySelector(".drop-indicator");
    if (indicator) indicator.hidden = true;
  }

  timeAtDrop(event, track, offsetMinutes = 0) {
    const rect = track.getBoundingClientRect();
    const minutes = Math.max(0, Math.min(1439, ((event.clientY - rect.top) / rect.height) * 1440 - offsetMinutes));
    const value = Math.round(minutes);
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

  phaseMinutes(phase) {
    const time = this.phaseTime(phase);
    return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  }

  followingPhase(schedule, weekday, afterMinutes, excludedPhaseId = "") {
    const candidates = [];
    schedule.assignments.forEach((assignment) => {
      (assignment.weekday_rules?.[weekday] || []).forEach((phase) => {
        if (this.phaseId(phase) === excludedPhaseId) return;
        const minutes = this.phaseMinutes(phase);
        if (minutes > afterMinutes) candidates.push({ assignment, phase, minutes });
      });
    });
    candidates.sort((left, right) => left.minutes - right.minutes);
    return candidates[0] || null;
  }

  previousPhase(schedule, weekday, beforeMinutes, excludedPhaseId = "") {
    const candidates = [];
    schedule.assignments.forEach((assignment) => {
      (assignment.weekday_rules?.[weekday] || []).forEach((phase) => {
        if (this.phaseId(phase) === excludedPhaseId) return;
        const minutes = this.phaseMinutes(phase);
        if (minutes < beforeMinutes) candidates.push({ assignment, phase, minutes });
      });
    });
    candidates.sort((left, right) => right.minutes - left.minutes);
    return candidates[0] || null;
  }

  timeFromMinutes(minutes) {
    const value = Math.max(0, Math.min(1439, Math.round(minutes)));
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

  beginPhaseResize(event, scheduleId, phaseId, weekday, edge, track, minimumStart = 0, maximumStart = 1439) {
    if (edge !== "transition" || this.phaseResizeActive) return;
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    this.phaseResizeActive = true;
    track.classList.add("resizing");
    try { handle?.setPointerCapture?.(pointerId); } catch (_) { /* pointer capture is optional */ }
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      track.dataset.resizePhaseId = phaseId;
      track.dataset.resizeTime = this.timeAtDrop(moveEvent, track);
      this.showDropIndicator(track, moveEvent);
    };
    const finish = async (upEvent) => {
      if (upEvent.pointerId != null && upEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      this.phaseResizeActive = false;
      track.classList.remove("resizing");
      try { handle?.releasePointerCapture?.(pointerId); } catch (_) { /* pointer capture is optional */ }
      const time = track.dataset.resizePhaseId === phaseId
        ? track.dataset.resizeTime
        : this.timeAtDrop(upEvent, track);
      delete track.dataset.resizePhaseId;
      delete track.dataset.resizeTime;
      this.clearDropIndicator(track);
      this.suppressPhaseClickUntil = Date.now() + 750;
      await this.resizePhaseStart(scheduleId, phaseId, weekday, time, minimumStart, maximumStart);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }

  async resizePhaseStart(scheduleId, phaseId, weekday, time, visibleMinimum = null, visibleMaximum = null) {
    const next = this.cloneData();
    const schedule = next.schedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    let entry = null;
    for (const assignment of schedule.assignments) {
      const phases = assignment.weekday_rules?.[weekday] || [];
      const phase = phases.find((item) => this.phaseId(item) === phaseId);
      if (phase) { entry = { assignment, phases, phase }; break; }
    }
    if (!entry) return;
    const currentStart = this.phaseMinutes(entry.phase);
    const requested = this.phaseMinutes({ time });
    const previousBoundary = this.previousPhase(schedule, weekday, currentStart, phaseId);
    const nextBoundary = this.followingPhase(schedule, weekday, currentStart, phaseId);
    const minimum = Number.isFinite(visibleMinimum)
      ? Math.max(0, visibleMinimum)
      : previousBoundary ? previousBoundary.minutes + 15 : 0;
    const maximum = Number.isFinite(visibleMaximum)
      ? Math.min(1439, visibleMaximum)
      : nextBoundary ? nextBoundary.minutes - 15 : 1439;
    if (maximum < minimum) return this.notice(this.t.invalid, true);
    entry.phase.time = this.timeFromMinutes(Math.max(minimum, Math.min(maximum, requested)));
    entry.phases.sort((left, right) => this.phaseMinutes(left) - this.phaseMinutes(right));
    await this.save(next);
  }

  async addPhaseAt(scheduleId, assignmentId, weekday, time) {
    if (!this._hass.user?.is_admin || !DAYS.includes(weekday) || !TIME_PATTERN.test(time || "")) return;
    const next = this.cloneData();
    const schedule = next.schedules.find((item) => item.id === scheduleId);
    const assignment = schedule?.assignments.find((item) => item.id === assignmentId);
    if (!schedule || !assignment) return;
    const phases = assignment.weekday_rules[weekday] || [];
    const targetMinutes = this.phaseMinutes({ time });
    if (phases.some((phase) => this.phaseMinutes(phase) === targetMinutes)) {
      this.notice(this.t.duplicateDayTime, true);
      return;
    }
    phases.push({ id: newId("phase"), time });
    phases.sort((left, right) => this.phaseMinutes(left) - this.phaseMinutes(right));
    assignment.weekday_rules[weekday] = phases;
    await this.save(next);
  }

  async duplicatePhaseBefore(scheduleId, phaseId, weekday, startMinutes) {
    if (!this._hass.user?.is_admin || !DAYS.includes(weekday) || !Number.isFinite(startMinutes)) return;
    const next = this.cloneData();
    const schedule = next.schedules.find((item) => item.id === scheduleId);
    const entry = schedule && this.schedulePhases(schedule).find((item) => this.phaseId(item.phase) === phaseId && item.weekday === weekday);
    if (!schedule || !entry) return;
    const following = this.followingPhase(schedule, weekday, startMinutes, phaseId);
    const duration = Math.max(15, (following?.minutes ?? 1440) - startMinutes);
    const previous = this.previousPhase(schedule, weekday, startMinutes, phaseId);
    const minimumStart = Math.max(60, (previous?.minutes ?? 0) + 60);
    const targetMinutes = startMinutes - duration;
    const clampedStart = Math.max(minimumStart, targetMinutes);
    if (clampedStart >= startMinutes) {
      this.notice(this.t.duplicateNoRoom, true);
      return;
    }
    const time = this.timeFromMinutes(clampedStart);
    const phases = entry.assignment.weekday_rules[weekday] || [];
    if (phases.some((phase) => this.phaseMinutes(phase) === clampedStart)) {
      this.notice(this.t.duplicateDayTime, true);
      return;
    }
    const template = typeof entry.phase === "object" ? entry.phase : {};
    phases.push({ ...template, id: newId("phase"), time });
    phases.sort((left, right) => this.phaseMinutes(left) - this.phaseMinutes(right));
    entry.assignment.weekday_rules[weekday] = phases;
    await this.save(next);
  }

  async duplicatePhaseAt(scheduleId, phaseId, weekday, time) {
    const next = this.cloneData();
    const schedule = next.schedules.find((item) => item.id === scheduleId);
    const entry = schedule && this.schedulePhases(schedule).find((item) => this.phaseId(item.phase) === phaseId);
    if (!entry) return;
    const targetMinutes = this.phaseMinutes({ time });
    const occupied = this.schedulePhases(schedule).some((item) => (
      item.weekday === weekday && this.phaseMinutes(item.phase) === targetMinutes
    ));
    if (occupied) {
      const template = typeof entry.phase === "object" ? entry.phase : {};
      this.openPhaseDialog(scheduleId, null, weekday, time, entry.assignment.mode_id, template);
      return;
    }
    const phase = typeof entry.phase === "string" ? { id: newId("phase"), time } : { ...entry.phase, id: newId("phase"), time };
    entry.assignment.weekday_rules[weekday] = [...(entry.assignment.weekday_rules[weekday] || []), phase].sort((left, right) => this.phaseMinutes(left) - this.phaseMinutes(right));
    await this.save(next);
  }

  async movePhase(scheduleId, phaseId, weekday, time) {
    const next = this.cloneData();
    const schedule = next.schedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    let found = null;
    for (const assignment of schedule.assignments) {
      for (const [day, phases] of Object.entries(assignment.weekday_rules || {})) {
        const index = phases.findIndex((phase) => this.phaseId(phase) === phaseId);
        if (index >= 0) {
          const oldStart = this.phaseMinutes(phases[index]);
          const following = this.followingPhase(schedule, day, oldStart, phaseId);
          found = { assignment, day, phase: phases.splice(index, 1)[0], oldStart, following };
          if (!phases.length) delete assignment.weekday_rules[day];
          break;
        }
      }
      if (found) break;
    }
    if (!found) return;
    const newStart = this.phaseMinutes({ time });
    const followingStart = found.following ? found.following.minutes : null;
    const duration = followingStart == null ? null : Math.max(15, followingStart - found.oldStart);
    if (typeof found.phase === "string") found.phase = { id: newId("phase"), time };
    else found.phase.time = time;
    if (!Object.keys(found.assignment.weekday_rules).length) {
      schedule.assignments = schedule.assignments.filter((item) => item !== found.assignment);
    }
    const targetPhases = found.assignment.weekday_rules[weekday] || [];
    // A dragged block keeps its current duration. Move the next boundary with
    // it so the following mode does not unexpectedly start at the old time.
    const targetFollowing = duration != null && found.day === weekday && found.following
      ? found.following
      : duration != null ? this.followingPhase(schedule, weekday, newStart) : null;
    if (targetFollowing) {
      targetFollowing.phase.time = this.timeFromMinutes(newStart + duration);
      const targetRule = targetFollowing.assignment.weekday_rules[weekday] || [];
      targetRule.sort((left, right) => this.phaseMinutes(left) - this.phaseMinutes(right));
    }
    if (!schedule.assignments.includes(found.assignment)) schedule.assignments.push(found.assignment);
    found.assignment.weekday_rules[weekday] = [...targetPhases, found.phase].sort((left, right) => this.phaseMinutes(left) - this.phaseMinutes(right));
    await this.save(next);
  }

  async deletePhase(scheduleId, phaseId) {
    if (!window.confirm(this.t.deletePhase)) return;
    const next = this.cloneData();
    const schedule = next.schedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    for (const assignment of schedule.assignments) {
      let removed = false;
      for (const [day, phases] of Object.entries(assignment.weekday_rules || {})) {
        const index = phases.findIndex((phase) => this.phaseId(phase) === phaseId);
        if (index < 0) continue;
        phases.splice(index, 1);
        if (!phases.length) delete assignment.weekday_rules[day];
        removed = true;
        break;
      }
      if (removed) {
        if (!Object.keys(assignment.weekday_rules || {}).length) {
          schedule.assignments = schedule.assignments.filter((item) => item !== assignment);
        }
        await this.save(next);
        return;
      }
    }
  }

  openPhaseDialog(scheduleId, phaseId = null, weekday = "monday", time = "06:00", draggedModeId = null, duplicateTemplate = null) {
    if (!this._hass.user?.is_admin) return;
    const schedule = this.data.schedules.find((item) => item.id === scheduleId);
    if (!schedule || !this.data.modes.length) return;
    const existing = phaseId ? this.phaseEntry(schedule, phaseId) : null;
    if (!existing && !duplicateTemplate) return;
    const mode = existing ? this.mode(existing.assignment.mode_id) : this.mode(draggedModeId) || this.data.modes[0];
    const currentWeekday = existing?.weekday || weekday;
    const currentTime = existing ? this.phaseTime(existing.phase) : time;
    const currentTemperature = existing && typeof existing.phase === "object"
      ? existing.phase.target_temperature
      : duplicateTemplate?.target_temperature;
    const dialog = this.$("dialog"); this.dialogKind = "phase"; this.dialogContext = { scheduleId, phaseId };
    dialog.innerHTML = `<form method="dialog" class="dialog-form"><h2>${phaseId ? this.t.editPhase : this.t.placeDuplicate}</h2>${duplicateTemplate ? `<p class="muted">${escapeHTML(this.t.duplicateTimeOccupied)}</p>` : ""}<div class="form-grid"><label>${this.t.modes}<select name="mode_id">${this.data.modes.map((item) => `<option value="${escapeHTML(item.id)}" ${item.id === mode?.id ? "selected" : ""}>${escapeHTML(item.name)} · ${escapeHTML(this.temperatureText(item.target_temperature))}</option>`).join("")}</select></label><label>${this.t.time}<input name="time" type="time" required step="60" value="${escapeHTML(currentTime)}"><small class="muted">${this.t.defaultDuration}</small></label><label>${this.t.temperature}<input name="target_temperature" type="number" step="0.1" value="${currentTemperature == null ? "" : escapeHTML(this.displayTemperature(currentTemperature))}" placeholder="${escapeHTML(this.temperatureText(mode?.target_temperature))}"><small class="muted">${this.t.localTemperature}</small></label><label>${this.t.weekday}<span class="fixed-weekday">${escapeHTML(this.t[currentWeekday])}</span></label></div><div class="dialog-actions">${phaseId ? `<button type="button" class="danger" data-delete-phase>${this.t.remove}</button>` : ""}<button type="button" data-cancel>${this.t.cancel}</button><button class="primary" type="submit">${this.t.save}</button></div></form>`;
    const form = dialog.querySelector("form");
    form.elements.time.addEventListener("input", () => form.elements.time.setCustomValidity(""));
    dialog.querySelector("[data-cancel]").onclick = () => this.closeDialog();
    if (phaseId) dialog.querySelector("[data-delete-phase]").onclick = () => this.deletePhase(scheduleId, phaseId);
    form.onsubmit = async (event) => {
      event.preventDefault();
      const selectedModeId = form.elements.mode_id.value;
      const selectedTime = form.elements.time.value;
      if (!TIME_PATTERN.test(selectedTime)) return this.notice(this.t.invalidTime, true);
      const selectedMinutes = this.phaseMinutes({ time: selectedTime });
      const occupied = this.schedulePhases(schedule).some((item) => (
        item.weekday === currentWeekday
        && this.phaseId(item.phase) !== phaseId
        && this.phaseMinutes(item.phase) === selectedMinutes
      ));
      if (occupied) {
        form.elements.time.setCustomValidity(duplicateTemplate ? this.t.duplicateTimeOccupied : this.t.duplicateDayTime);
        form.elements.time.reportValidity();
        return;
      }
      const next = this.cloneData();
      const targetSchedule = next.schedules.find((item) => item.id === scheduleId);
      if (!targetSchedule) return;
      let sourceAssignment = targetSchedule.assignments.find((item) => item.id === existing?.assignment.id);
      let phase = phaseId && typeof existing?.phase === "object"
        ? { ...existing.phase, time: selectedTime }
        : { id: newId("phase"), time: selectedTime };
      if (phaseId && sourceAssignment) {
        const sourcePhases = sourceAssignment.weekday_rules?.[currentWeekday] || [];
        const sourceIndex = sourcePhases.findIndex((item) => this.phaseId(item) === phaseId);
        if (sourceIndex >= 0) sourcePhases.splice(sourceIndex, 1);
        if (!sourcePhases.length) delete sourceAssignment.weekday_rules[currentWeekday];
      }
      let targetAssignment = sourceAssignment?.mode_id === selectedModeId ? sourceAssignment : null;
      if (!targetAssignment) targetAssignment = targetSchedule.assignments.find((item) => item.mode_id === selectedModeId);
      if (sourceAssignment && sourceAssignment !== targetAssignment && !Object.keys(sourceAssignment.weekday_rules || {}).length) {
        targetSchedule.assignments = targetSchedule.assignments.filter((item) => item !== sourceAssignment);
        sourceAssignment = null;
      }
      if (!targetAssignment) {
        targetAssignment = { id: newId("assignment"), mode_id: selectedModeId, enabled: false, weekday_rules: {} };
        targetSchedule.assignments.push(targetAssignment);
      }
      const displayTemperature = form.elements.target_temperature.value;
      if (displayTemperature === "") delete phase.target_temperature;
      else {
        const storedTemperature = this.storedTemperature(displayTemperature);
        if (!Number.isFinite(storedTemperature)) return this.notice(this.t.invalid, true);
        phase.target_temperature = Number(storedTemperature.toFixed(2));
      }
      targetAssignment.weekday_rules[currentWeekday] = [...(targetAssignment.weekday_rules[currentWeekday] || []), phase].sort((left, right) => this.phaseMinutes(left) - this.phaseMinutes(right));
      await this.save(next);
    };
    dialog.showModal(); form.querySelector("select")?.focus();
  }

  autoRulesForAssignment(assignment) {
    return Array.isArray(assignment?.auto_rules)
      ? assignment.auto_rules.map((rule) => ({ ...rule }))
      : [];
  }

  autoRuleActionConfig(rule, action) {
    if (rule?.actions && typeof rule.actions[action] === "object") {
      return { ...rule.actions[action] };
    }
    if (rule?.action !== action) return {};
    return {
      time: rule.kind === "cycle" ? rule.start_time || "" : rule.time || "00:00",
      start_date: rule.start_date || "",
      end_date: rule.end_date || "",
    };
  }

  autoRuleKindLabel(kind) {
    return {
      date: this.t.autoKindDate,
      holiday: this.t.autoKindHoliday,
      cycle: this.t.autoKindCycle,
    }[kind] || this.t.autoKind;
  }

  autoRuleDisplayName(rule) {
    const name = String(rule?.name || "").trim();
    if (name) return name;
    const action = rule?.action === "off" ? this.t.autoOff : this.t.autoOn;
    return `${action} · ${this.autoRuleKindLabel(rule?.kind)}`;
  }

  autoRuleHolidayOptions() {
    const options = [
      ["new_year", this.t.autoHolidayNewYear], ["epiphany", this.t.autoHolidayEpiphany],
      ["international_womens_day", this.t.autoHolidayInternationalWomensDay],
      ["good_friday", this.t.autoHolidayGoodFriday], ["easter_saturday", this.t.autoHolidayEasterSaturday],
      ["easter_sunday", this.t.autoHolidayEasterSunday],
      ["easter_monday", this.t.autoHolidayEasterMonday], ["easter_period", this.t.autoHolidayEasterPeriod],
      ["whit_sunday", this.t.autoHolidayWhitSunday],
      ["labour_day", this.t.autoHolidayLabourDay], ["ascension", this.t.autoHolidayAscension],
      ["whit_monday", this.t.autoHolidayWhitMonday], ["corpus_christi", this.t.autoHolidayCorpusChristi],
      ["maria_himmelfahrt", this.t.autoHolidayMariaHimmelfahrt],
      ["world_children_day", this.t.autoHolidayWorldChildrenDay],
      ["german_unity", this.t.autoHolidayGermanUnity], ["reformation_day", this.t.autoHolidayReformationDay],
      ["all_saints_day", this.t.autoHolidayAllSaintsDay], ["repentance_day", this.t.autoHolidayRepentanceDay],
      ["advent_1", this.t.autoHolidayAdvent1], ["advent_2", this.t.autoHolidayAdvent2],
      ["advent_3", this.t.autoHolidayAdvent3], ["advent_4", this.t.autoHolidayAdvent4],
      ["all_advent", this.t.autoHolidayAllAdvent],
      ["christmas_eve", this.t.autoHolidayChristmasEve], ["christmas_day", this.t.autoHolidayChristmasDay],
      ["boxing_day", this.t.autoHolidayBoxingDay], ["christmas_period", this.t.autoHolidayChristmasPeriod],
      ["new_years_eve", this.t.autoHolidayNewYearsEve],
    ];
    const available = new Set(this.data?.available_holidays || []);
    return available.size ? options.filter(([value]) => available.has(value)) : options;
  }

  autoRuleRecurrenceOptions(selected) {
    return [
      ["daily", this.t.recurrenceDaily],
      ["weekly", this.t.recurrenceWeekly], ["monthly", this.t.recurrenceMonthly],
      ["quarterly", this.t.recurrenceQuarterly], ["yearly", this.t.recurrenceYearly],
    ].map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHTML(label)}</option>`).join("");
  }

  autoRuleActionMarkup(action, config, kind) {
    const actionLabel = action === "on" ? this.t.autoOn : this.t.autoOff;
    const timeLabel = action === "on" ? this.t.autoOnTime : this.t.autoOffTime;
    if (kind === "cycle") {
      const startDateLabel = action === "on" ? this.t.autoOnStartDate : this.t.autoOffStartDate;
      const endDateLabel = action === "on" ? this.t.autoOnEndDate : this.t.autoOffEndDate;
      return `<fieldset class="auto-rule-action-card" data-auto-rule-action-card="${action}"><legend>${escapeHTML(actionLabel)}</legend><label>${escapeHTML(startDateLabel)}<input type="date" data-auto-rule-action-start-date="${action}" value="${escapeHTML(config.start_date || "")}"></label><label>${escapeHTML(endDateLabel)}<input type="date" data-auto-rule-action-end-date="${action}" value="${escapeHTML(config.end_date || "")}"></label><label>${escapeHTML(timeLabel)}<input type="time" step="60" data-auto-rule-action-time="${action}" value="${escapeHTML(config.time || "")}"></label></fieldset>`;
    }
    return `<fieldset class="auto-rule-action-card" data-auto-rule-action-card="${action}"><legend>${escapeHTML(actionLabel)}</legend><label>${escapeHTML(timeLabel)}<input type="time" step="60" data-auto-rule-action-time="${action}" value="${escapeHTML(config.time || "")}"></label></fieldset>`;
  }

  autoRuleRowMarkup(rule = {}, expanded = false) {
    const kind = rule.kind || "";
    const onAction = this.autoRuleActionConfig(rule, "on");
    const offAction = this.autoRuleActionConfig(rule, "off");
    return `<div class="auto-rule-row ${expanded ? "" : "auto-rule-collapsed"}" data-auto-rule-row data-rule-id="${escapeHTML(rule.id || "")}" data-rule-action="${escapeHTML(rule.action || "")}" data-date="${escapeHTML(rule.date || "")}" data-holiday="${escapeHTML(rule.holiday || "")}" data-recurrence="${escapeHTML(rule.recurrence || "")}" data-on-time="${escapeHTML(onAction.time || "")}" data-on-start-date="${escapeHTML(onAction.start_date || "")}" data-on-end-date="${escapeHTML(onAction.end_date || "")}" data-off-time="${escapeHTML(offAction.time || "")}" data-off-start-date="${escapeHTML(offAction.start_date || "")}" data-off-end-date="${escapeHTML(offAction.end_date || "")}"><span class="auto-rule-drag" data-auto-rule-drag draggable="true" role="button" tabindex="0" aria-label="${escapeHTML(this.t.autoDrag)}" title="${escapeHTML(this.t.autoDrag)}"><ha-icon icon="mdi:drag-vertical" aria-hidden="true"></ha-icon></span><div class="auto-rule-summary"><button type="button" class="auto-rule-summary-toggle" data-auto-rule-summary aria-expanded="${expanded}"><strong class="auto-rule-summary-name" data-auto-rule-summary-name>${escapeHTML(this.autoRuleDisplayName(rule))}</strong></button><div class="auto-rule-summary-actions"><button type="button" data-auto-rule-edit aria-expanded="${expanded}">${escapeHTML(expanded ? this.t.autoRuleCollapse : this.t.edit)}</button><button type="button" class="auto-rule-remove" data-remove-auto-rule aria-label="${escapeHTML(this.t.removeAutoRule)}" title="${escapeHTML(this.t.removeAutoRule)}"><ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon></button></div></div><div class="auto-rule-editor" data-auto-rule-editor ${expanded ? "" : "hidden"}><div class="auto-rule-core"><label class="auto-rule-name">${escapeHTML(this.t.autoRuleName)}<input data-auto-rule-name maxlength="160" placeholder="${escapeHTML(this.t.autoRuleNamePlaceholder)}" value="${escapeHTML(rule.name || "")}"></label><label>${escapeHTML(this.t.autoKind)}<select data-auto-rule-kind><option value="">${escapeHTML(this.t.autoKindEmpty)}</option><option value="date" ${kind === "date" ? "selected" : ""}>${escapeHTML(this.t.autoKindDate)}</option><option value="holiday" ${kind === "holiday" ? "selected" : ""}>${escapeHTML(this.t.autoKindHoliday)}</option><option value="cycle" ${kind === "cycle" ? "selected" : ""}>${escapeHTML(this.t.autoKindCycle)}</option></select></label></div><div class="auto-rule-value" data-auto-rule-value></div></div></div>`;
  }

  updateAutoRuleValue(row) {
    const kind = row.querySelector("[data-auto-rule-kind]")?.value || "";
    const target = row.querySelector("[data-auto-rule-value]");
    if (!target) return;
    const storedDate = row.dataset.date || "";
    const storedHoliday = row.dataset.holiday || "";
    const storedRecurrence = row.dataset.recurrence || "daily";
    const actionConfig = (action) => ({
      time: row.dataset[`${action}Time`] || "",
      start_date: row.dataset[`${action}StartDate`] || "",
      end_date: row.dataset[`${action}EndDate`] || "",
    });
    if (kind === "date") {
      target.innerHTML = `<div class="auto-rule-context"><label>${escapeHTML(this.t.autoDate)}<input type="date" data-auto-rule-value-control value="${escapeHTML(storedDate)}"></label></div><div class="auto-rule-actions">${this.autoRuleActionMarkup("on", actionConfig("on"), kind)}${this.autoRuleActionMarkup("off", actionConfig("off"), kind)}</div>`;
      return;
    }
    if (kind === "holiday") {
      const holidayOptions = this.autoRuleHolidayOptions();
      if (storedHoliday && !holidayOptions.some(([value]) => value === storedHoliday)) {
        holidayOptions.unshift([storedHoliday, `${storedHoliday} (${this.t.unavailableRegion})`]);
      }
      target.innerHTML = `<div class="auto-rule-context"><label>${escapeHTML(this.t.autoHoliday)}<select data-auto-rule-value-control><option value="">${escapeHTML(this.t.autoKindEmpty)}</option>${holidayOptions.map(([value, label]) => `<option value="${value}" ${value === storedHoliday ? "selected" : ""}>${escapeHTML(label)}</option>`).join("")}</select></label></div><div class="auto-rule-actions">${this.autoRuleActionMarkup("on", actionConfig("on"), kind)}${this.autoRuleActionMarkup("off", actionConfig("off"), kind)}</div>`;
      return;
    }
    if (kind === "cycle") {
      target.innerHTML = `<div class="auto-rule-context"><label>${escapeHTML(this.t.autoRecurrence)}<select data-auto-rule-recurrence>${this.autoRuleRecurrenceOptions(storedRecurrence)}</select></label><small class="auto-rule-hint">${escapeHTML(this.t.autoCycleHint)}</small></div><div class="auto-rule-actions">${this.autoRuleActionMarkup("on", actionConfig("on"), kind)}${this.autoRuleActionMarkup("off", actionConfig("off"), kind)}</div>`;
      return;
    }
    target.innerHTML = kind
      ? `<span class="auto-rule-calculated">${escapeHTML(this.t.autoCalculatedHint)}</span>`
      : `<span class="auto-rule-calculated">—</span>`;
  }

  bindAutoRuleRow(row) {
    const clearRuleValidity = () => {
      row.querySelector("[data-auto-rule-kind]")?.setCustomValidity("");
      row.querySelector("[data-auto-rule-name]")?.setCustomValidity("");
    };
    const updateSummary = () => {
      const name = row.querySelector("[data-auto-rule-name]")?.value.trim() || "";
      const kind = row.querySelector("[data-auto-rule-kind]")?.value || "";
      const actions = ["on", "off"].filter((action) => row.querySelector(`[data-auto-rule-action-time="${action}"]`));
      const action = actions.length === 1 ? actions[0] : row.dataset.ruleAction;
      row.querySelector("[data-auto-rule-summary-name]").textContent = name || this.autoRuleDisplayName({ name, kind, action });
    };
    const syncValue = () => {
      const kind = row.querySelector("[data-auto-rule-kind]")?.value || "";
      const name = row.querySelector("[data-auto-rule-name]")?.value.trim() || "";
      row.dataset.ruleName = name;
      const value = row.querySelector("[data-auto-rule-value-control]")?.value || "";
      if (kind === "holiday") row.dataset.holiday = value;
      if (kind === "date") row.dataset.date = value;
      if (kind === "cycle") {
        row.dataset.recurrence = row.querySelector("[data-auto-rule-recurrence]")?.value || "";
      }
      ["on", "off"].forEach((action) => {
        row.dataset[`${action}Time`] = row.querySelector(`[data-auto-rule-action-time="${action}"]`)?.value || "";
        row.dataset[`${action}StartDate`] = row.querySelector(`[data-auto-rule-action-start-date="${action}"]`)?.value || "";
        row.dataset[`${action}EndDate`] = row.querySelector(`[data-auto-rule-action-end-date="${action}"]`)?.value || "";
      });
      if (!row.dataset.ruleId) row.dataset.ruleId = newId("auto_rule");
      updateSummary();
    };
    row.querySelector("[data-auto-rule-kind]")?.addEventListener("change", () => {
      clearRuleValidity();
      this.updateAutoRuleValue(row);
      syncValue();
    });
    row.querySelector("[data-auto-rule-name]")?.addEventListener("input", () => {
      row.querySelector("[data-auto-rule-name]")?.setCustomValidity("");
      syncValue();
    });
    const clearValueValidity = () => {
      row.querySelector("[data-auto-rule-value]")?.querySelectorAll("input, select").forEach((input) => input.setCustomValidity(""));
    };
    row.querySelector("[data-auto-rule-value]")?.addEventListener("input", () => {
      clearValueValidity();
      syncValue();
    });
    row.querySelector("[data-auto-rule-value]")?.addEventListener("change", () => {
      clearValueValidity();
      syncValue();
    });
    const toggleExpanded = () => {
      const editor = row.querySelector("[data-auto-rule-editor]");
      this.setAutoRuleExpanded(row, Boolean(editor?.hidden));
    };
    row.querySelector("[data-auto-rule-edit]")?.addEventListener("click", toggleExpanded);
    row.querySelector("[data-auto-rule-summary]")?.addEventListener("click", toggleExpanded);
    row.querySelector("[data-remove-auto-rule]")?.addEventListener("click", () => row.remove());
    const dragHandle = row.querySelector("[data-auto-rule-drag]");
    dragHandle?.addEventListener("dragstart", (event) => {
      this.autoRuleDragRow = row;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.dataset.ruleId || "");
      row.classList.add("dragging");
    });
    dragHandle?.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      row.parentElement?.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
      this.autoRuleDragRow = null;
    });
    row.addEventListener("dragover", (event) => {
      const dragged = this.autoRuleDragRow;
      if (!dragged || dragged === row || dragged.parentElement !== row.parentElement) return;
      event.preventDefault();
      const bounds = row.getBoundingClientRect();
      const insertBefore = event.clientY < bounds.top + bounds.height / 2;
      row.parentElement.insertBefore(dragged, insertBefore ? row : row.nextElementSibling);
      row.parentElement.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", (event) => {
      if (!row.contains(event.relatedTarget)) row.classList.remove("drag-over");
    });
    row.addEventListener("drop", (event) => {
      if (!this.autoRuleDragRow) return;
      event.preventDefault();
      row.classList.remove("drag-over");
    });
    this.updateAutoRuleValue(row);
    row.querySelectorAll("input, select").forEach((control) => {
      control.addEventListener("input", syncValue);
      control.addEventListener("change", syncValue);
    });
    syncValue();
  }

  setAutoRuleExpanded(row, expanded, focusName = false) {
    const editor = row.querySelector("[data-auto-rule-editor]");
    const editButton = row.querySelector("[data-auto-rule-edit]");
    if (!editor || !editButton) return;
    editor.hidden = !expanded;
    row.classList.toggle("auto-rule-collapsed", !expanded);
    editButton.textContent = expanded ? this.t.autoRuleCollapse : this.t.edit;
    editButton.setAttribute("aria-expanded", String(expanded));
    row.querySelector("[data-auto-rule-summary]")?.setAttribute("aria-expanded", String(expanded));
    if (focusName) row.querySelector("[data-auto-rule-name]")?.focus();
  }

  openModeScheduleDialog(scheduleId, assignmentId = null, draggedModeId = null, initialWeekday = null, initialTime = "06:00") {
    if (!this._hass.user?.is_admin) return;
    const schedule = this.data.schedules.find((item) => item.id === scheduleId);
    if (!schedule || !this.data.modes.length) return;
    const assignment = assignmentId ? schedule.assignments.find((item) => item.id === assignmentId) : null;
    const normalizedModeId = draggedModeId?.startsWith("mode:") ? draggedModeId.slice(5) : draggedModeId;
    if (!assignment && normalizedModeId && schedule.assignments.some((item) => item.mode_id === normalizedModeId)) {
      this.notice(this.t.modeAlreadyAssigned, true);
      return;
    }
    const assignmentMode = assignment ? this.mode(assignment.mode_id) : null;
    const assignedModeIds = new Set(schedule.assignments.filter((item) => item.id !== assignmentId).map((item) => item.mode_id));
    const selectableModes = assignment
      ? (assignmentMode ? [assignmentMode] : [])
      : this.data.modes.filter((mode) => !assignedModeIds.has(mode.id));
    if (!selectableModes.length) return this.notice(assignment ? this.t.invalid : this.t.modeAlreadyAssigned, true);
    const selectedMode = assignmentMode || this.mode(normalizedModeId) || selectableModes[0];
    const phaseEntries = assignment
      ? this.schedulePhases(schedule).filter((item) => item.assignment.id === assignment.id)
      : [];
    const firstTime = phaseEntries[0] ? this.phaseTime(phaseEntries[0].phase) : initialTime;
    const autoRules = this.autoRulesForAssignment(assignment);
    const assignmentContinuous = this.assignmentContinuous(assignment);
    const overrides = phaseEntries.map((item) => typeof item.phase === "object" ? item.phase.target_temperature : undefined);
    const sharedOverride = overrides.length && overrides.every((value) => value === overrides[0]) ? overrides[0] : undefined;
    const initialDay = DAYS.includes(initialWeekday) ? initialWeekday : null;
    const dayMarkup = DAYS.map((day) => {
      const dayEntries = phaseEntries.filter((item) => item.weekday === day);
      const checked = dayEntries.length > 0 || (!assignment && (!initialDay || day === initialDay));
      const timeEntries = dayEntries.length ? dayEntries : [{ phase: null }];
      const timeLabel = `${this.t[day]} ${this.t.time}`;
      return `<div class="mode-day-card" data-mode-day="${escapeHTML(day)}"><label><input type="checkbox" data-day-enabled ${checked ? "checked" : ""}>${escapeHTML(this.t[day])}</label><div class="mode-day-times" data-day-times ${checked ? "" : "hidden"}>${timeEntries.map((entry) => `<div class="mode-day-time-row" data-day-time-row><input type="time" step="60" required data-day-time data-phase-id="${escapeHTML(entry.phase ? this.phaseId(entry.phase) : "")}" value="${escapeHTML(entry.phase ? this.phaseTime(entry.phase) : firstTime)}" aria-label="${escapeHTML(timeLabel)}" ${checked ? "" : "disabled"}><button type="button" class="mode-day-remove-time" data-remove-day-time ${checked ? "" : "disabled"} aria-label="${escapeHTML(this.t.removeTime)}" title="${escapeHTML(this.t.removeTime)}"><ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon></button></div>`).join("")}</div><button type="button" class="mode-day-add-time" data-add-day-time ${checked ? "" : "disabled"} aria-label="${escapeHTML(this.t.addTime)}" title="${escapeHTML(this.t.addTime)}">＋</button></div>`;
    }).join("");
    const dialog = this.$("dialog"); this.dialogKind = "assignment"; this.dialogContext = { scheduleId, assignmentId };
    dialog.innerHTML = `<form method="dialog" class="dialog-form"><h2>${assignment ? this.t.editAssignment : this.t.addAssignment}</h2><div class="form-grid"><label>${this.t.modes}<select name="mode_id">${selectableModes.map((item) => `<option value="${escapeHTML(item.id)}" ${item.id === selectedMode.id ? "selected" : ""}>${escapeHTML(item.name)} · ${escapeHTML(this.temperatureText(item.target_temperature))}</option>`).join("")}</select></label><label class="assignment-bulk-time">${this.t.bulkTime}<input name="bulk_time" type="time" required step="60" value="${escapeHTML(firstTime)}"><small class="muted">${this.t.bulkTimeHint}</small></label><label>${this.t.temperature}<input name="target_temperature" type="number" step="0.1" value="${sharedOverride == null ? "" : escapeHTML(this.displayTemperature(sharedOverride))}" placeholder="${escapeHTML(this.temperatureText(selectedMode.target_temperature))}"><small class="muted">${this.t.localTemperature}</small></label><fieldset class="auto-rules"><legend>${escapeHTML(this.t.autoRules)}</legend><small class="auto-rules-hint">${escapeHTML(this.t.autoDailyStartHint)}</small><div class="auto-rules-list" data-auto-rules>${autoRules.map((rule) => this.autoRuleRowMarkup(rule)).join("")}</div><button type="button" class="auto-rule-add" data-add-auto-rule>＋ ${escapeHTML(this.t.addAutoRule)}</button></fieldset><label class="assignment-continuous full"><input name="continuous" type="checkbox" ${assignmentContinuous ? "checked" : ""}><span class="assignment-continuous-copy"><span>${escapeHTML(this.t.autoContinuous)}</span><small>${escapeHTML(this.t.autoContinuousHint)}</small></span></label><fieldset class="full" data-weekdays-fieldset><legend>${escapeHTML(this.t.weekdays)}</legend><div class="mode-day-actions"><button type="button" data-select-days="all">${escapeHTML(this.t.selectAllDays)}</button><button type="button" data-select-days="none">${escapeHTML(this.t.clearAllDays)}</button></div><div class="mode-day-grid">${dayMarkup}</div></fieldset></div><div class="dialog-actions"><button type="button" data-cancel>${this.t.cancel}</button><button class="primary" type="submit">${this.t.save}</button></div></form>`;
    const form = dialog.querySelector("form");
    if (assignment) {
      const modeField = form.elements.mode_id?.closest("label");
      if (modeField) modeField.innerHTML = `${escapeHTML(this.t.name)}<input type="text" name="mode_name" value="${escapeHTML(selectedMode.name)}" readonly aria-readonly="true"><input type="hidden" name="mode_id" value="${escapeHTML(selectedMode.id)}">`;
    }
    const autoRuleContainer = form.querySelector("[data-auto-rules]");
    const continuousControl = form.elements.continuous;
    const weekdaysFieldset = form.querySelector("[data-weekdays-fieldset]");
    const bulkTimeField = form.querySelector(".assignment-bulk-time");
    const updateContinuousVisibility = () => {
      const continuous = Boolean(continuousControl?.checked);
      if (weekdaysFieldset) weekdaysFieldset.hidden = continuous;
      if (bulkTimeField) bulkTimeField.hidden = continuous;
    };
    continuousControl?.addEventListener("change", updateContinuousVisibility);
    autoRuleContainer.addEventListener("change", (event) => {
      if (event.target.matches("[data-auto-rule-kind]") && event.target.value === "holiday") {
        continuousControl.checked = true;
      }
      updateContinuousVisibility();
    });
    autoRuleContainer.querySelectorAll("[data-auto-rule-row]").forEach((row) => this.bindAutoRuleRow(row));
    form.querySelector("[data-add-auto-rule]")?.addEventListener("click", () => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = this.autoRuleRowMarkup({}, true);
      const row = wrapper.firstElementChild;
      autoRuleContainer.append(row);
      this.bindAutoRuleRow(row);
      this.setAutoRuleExpanded(row, true, true);
    });
    updateContinuousVisibility();
    const bulkTime = form.elements.bulk_time;
    const temperature = form.elements.target_temperature;
    let temperatureTouched = false;
    const bindDayTimeInput = (input) => input.addEventListener("input", () => input.setCustomValidity(""));
    const nextDayTime = (card) => {
      const inputs = [...card.querySelectorAll("[data-day-time]")];
      const used = new Set(inputs.map((input) => input.value).filter((value) => TIME_PATTERN.test(value)));
      const values = [...used].map((value) => this.phaseMinutes({ time: value }));
      const base = values.length ? Math.max(...values) + 60 : this.phaseMinutes({ time: bulkTime.value });
      for (let offset = 0; offset < 96; offset += 1) {
        const minutes = (base + offset * 15) % 1440;
        const value = this.timeFromMinutes(minutes);
        if (!used.has(value)) return value;
      }
      return "";
    };
    const addDayTime = (card) => {
      if (!card?.querySelector("[data-day-enabled]")?.checked) return;
      const value = nextDayTime(card);
      if (!value) return;
      const times = card.querySelector("[data-day-times]");
      const row = document.createElement("div");
      row.className = "mode-day-time-row";
      row.dataset.dayTimeRow = "";
      row.innerHTML = `<input type="time" step="60" required data-day-time aria-label="${escapeHTML(`${this.t[card.dataset.modeDay]} ${this.t.time}`)}"><button type="button" class="mode-day-remove-time" data-remove-day-time aria-label="${escapeHTML(this.t.removeTime)}" title="${escapeHTML(this.t.removeTime)}"><ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon></button>`;
      const input = row.querySelector("[data-day-time]");
      input.value = value;
      times.append(row);
      bindDayTimeInput(input);
      row.querySelector("[data-remove-day-time]").addEventListener("click", () => removeDayTime(row.querySelector("[data-remove-day-time]")));
      input.focus();
    };
    const removeDayTime = (button) => {
      const card = button.closest("[data-mode-day]");
      const row = button.closest("[data-day-time-row]");
      if (!card || !row) return;
      row.remove();
      if (!card.querySelector("[data-day-time]")) card.querySelector("[data-day-enabled]").checked = false;
      updateDayCard(card);
    };
    const createDayTime = (card, value, phaseId = "") => {
      const row = document.createElement("div");
      row.className = "mode-day-time-row";
      row.dataset.dayTimeRow = "";
      row.innerHTML = `<input type="time" step="60" required data-day-time aria-label="${escapeHTML(`${this.t[card.dataset.modeDay]} ${this.t.time}`)}"><button type="button" class="mode-day-remove-time" data-remove-day-time aria-label="${escapeHTML(this.t.removeTime)}" title="${escapeHTML(this.t.removeTime)}"><ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon></button>`;
      const input = row.querySelector("[data-day-time]");
      input.dataset.phaseId = phaseId;
      input.value = value;
      card.querySelector("[data-day-times]").append(row);
      bindDayTimeInput(input);
      row.querySelector("[data-remove-day-time]").addEventListener("click", () => removeDayTime(row.querySelector("[data-remove-day-time]")));
      return input;
    };
    const updateDayCard = (card, copyBulkTime = false) => {
      const checked = card.querySelector("[data-day-enabled]").checked;
      const times = card.querySelector("[data-day-times]");
      const addButton = card.querySelector("[data-add-day-time]");
      let inputs = [...times.querySelectorAll("[data-day-time]")];
      if (checked && !inputs.length) {
        createDayTime(card, bulkTime.value || firstTime);
        inputs = [...times.querySelectorAll("[data-day-time]")];
      }
      times.hidden = !checked;
      addButton.disabled = !checked;
      card.querySelectorAll("[data-remove-day-time]").forEach((button) => { button.disabled = !checked; });
      inputs.forEach((input, index) => {
        input.disabled = !checked;
        if (checked && copyBulkTime && index === 0) input.value = bulkTime.value;
        input.setCustomValidity("");
      });
    };
    dialog.querySelectorAll("[data-mode-day]").forEach((card) => {
      card.querySelector("[data-day-enabled]").addEventListener("change", () => updateDayCard(card));
      card.querySelectorAll("[data-day-time]").forEach(bindDayTimeInput);
      card.querySelectorAll("[data-remove-day-time]").forEach((button) => {
        button.addEventListener("click", () => removeDayTime(button));
      });
    });
    dialog.querySelectorAll("[data-add-day-time]").forEach((button) => {
      button.addEventListener("click", () => addDayTime(button.closest("[data-mode-day]")));
    });
    dialog.querySelectorAll("[data-select-days]").forEach((button) => {
      button.addEventListener("click", () => {
        const selected = button.dataset.selectDays === "all";
        dialog.querySelectorAll("[data-mode-day]").forEach((card) => {
          card.querySelector("[data-day-enabled]").checked = selected;
          updateDayCard(card, selected);
        });
      });
    });
    bulkTime.addEventListener("input", () => {
      bulkTime.setCustomValidity("");
      dialog.querySelectorAll("[data-mode-day]").forEach((card) => {
        if (card.querySelector("[data-day-enabled]").checked) updateDayCard(card, true);
      });
    });
    form.elements.mode_id.addEventListener("change", () => {
      const mode = this.mode(form.elements.mode_id.value);
      temperature.placeholder = mode ? this.temperatureText(mode.target_temperature) : "";
    });
    temperature.addEventListener("input", () => { temperatureTouched = true; });
    dialog.querySelector("[data-cancel]").onclick = () => this.closeDialog();
    form.onsubmit = async (event) => {
      event.preventDefault();
      let selectedCards;
      const autoRulesValue = [];
      for (const row of autoRuleContainer.querySelectorAll("[data-auto-rule-row]")) {
        const kindControl = row.querySelector("[data-auto-rule-kind]");
        const kind = kindControl?.value || "";
        const name = row.querySelector("[data-auto-rule-name]")?.value.trim() || "";
        const value = row.querySelector("[data-auto-rule-value-control]")?.value || "";
        const actionControls = ["on", "off"].map((action) => ({
          action,
          timeControl: row.querySelector(`[data-auto-rule-action-time="${action}"]`),
          startDateControl: row.querySelector(`[data-auto-rule-action-start-date="${action}"]`),
          endDateControl: row.querySelector(`[data-auto-rule-action-end-date="${action}"]`),
        }));
        const hasActionInput = actionControls.some(({ timeControl, startDateControl, endDateControl }) => timeControl?.value || startDateControl?.value || endDateControl?.value);
        if (!name && !kind && !value && !hasActionInput) continue;
        if (!name || !kind) {
          const invalidControl = !name ? row.querySelector("[data-auto-rule-name]") : kindControl;
          invalidControl?.setCustomValidity(this.t.autoRuleIncomplete);
          invalidControl?.reportValidity();
          return;
        }
        const rule = { id: row.dataset.ruleId || newId("auto_rule"), name, kind };
        if (kind === "date") {
          if (!value || !DATE_PATTERN.test(value)) {
            row.querySelector("[data-auto-rule-value-control]")?.setCustomValidity(this.t.invalid);
            row.querySelector("[data-auto-rule-value-control]")?.reportValidity();
            return;
          }
          rule.date = value;
        } else if (kind === "holiday") {
          if (!value) {
            row.querySelector("[data-auto-rule-value-control]")?.setCustomValidity(this.t.invalid);
            row.querySelector("[data-auto-rule-value-control]")?.reportValidity();
            return;
          }
          rule.holiday = value;
        } else if (kind === "cycle") {
          const recurrence = row.querySelector("[data-auto-rule-recurrence]")?.value || "";
          if (!recurrence) {
            return this.notice(this.t.invalid, true);
          }
          rule.recurrence = recurrence;
        }
        const actions = {};
        for (const { action, timeControl, startDateControl, endDateControl } of actionControls) {
          const time = timeControl?.value || "";
          const startDate = startDateControl?.value || "";
          const endDate = endDateControl?.value || "";
          if (!time && !startDate && !endDate) continue;
          if (!TIME_PATTERN.test(time)) {
            timeControl?.setCustomValidity(this.t.invalidTime || this.t.invalid);
            timeControl?.reportValidity();
            return;
          }
          if (kind !== "cycle" && (startDate || endDate)) {
            return this.notice(this.t.invalid, true);
          }
          if (kind === "cycle" && ((startDate && !DATE_PATTERN.test(startDate)) || (endDate && (!DATE_PATTERN.test(endDate) || (startDate && endDate < startDate))))) {
            endDateControl?.setCustomValidity(this.t.autoRuleEndBeforeStart);
            endDateControl?.reportValidity();
            return;
          }
          const actionValue = { time };
          if (kind === "cycle") {
            if (startDate) actionValue.start_date = startDate;
            if (endDate) actionValue.end_date = endDate;
          }
          actions[action] = actionValue;
        }
        if (!Object.keys(actions).length) {
          kindControl?.setCustomValidity(this.t.autoRuleIncomplete);
          kindControl?.reportValidity();
          return;
        }
        rule.actions = actions;
        autoRulesValue.push(rule);
      }
      const continuous = Boolean(continuousControl?.checked);
      selectedCards = continuous
        ? []
        : [...dialog.querySelectorAll("[data-mode-day]")].filter((card) => card.querySelector("[data-day-enabled]").checked);
      if (!selectedCards.length && !continuous) {
        return this.notice(this.t.missingDay, true);
      }
      for (const card of selectedCards) {
        const inputs = [...card.querySelectorAll("[data-day-time]")];
        const values = inputs.map((input) => input.value);
        const invalidInput = inputs.find((input) => !TIME_PATTERN.test(input.value));
        if (invalidInput) {
          invalidInput.setCustomValidity(this.t.invalidTime);
          invalidInput.reportValidity();
          return;
        }
        if (new Set(values).size !== values.length) {
          inputs[0].setCustomValidity(this.t.duplicateDayTime);
          inputs[0].reportValidity();
          return;
        }
      }
      const phaseMoves = selectedCards.flatMap((card) => {
        const day = card.dataset.modeDay;
        return [...card.querySelectorAll("[data-day-time]")].flatMap((input) => {
          if (!input.dataset.phaseId) return [];
          const original = phaseEntries.find((entry) => this.phaseId(entry.phase) === input.dataset.phaseId);
          if (!original || this.phaseTime(original.phase) === input.value) return [];
          return [{ day, phaseId: input.dataset.phaseId, oldStart: this.phaseMinutes(original.phase), newStart: this.phaseMinutes({ time: input.value }) }];
        });
      });
      const explicitlyMovedPhaseIds = new Set(phaseMoves.map((move) => move.phaseId));
      let storedTemperature = null;
      if (temperatureTouched && temperature.value !== "") {
        storedTemperature = this.storedTemperature(temperature.value);
        if (!Number.isFinite(storedTemperature)) return this.notice(this.t.invalid, true);
        storedTemperature = Number(storedTemperature.toFixed(2));
      }
      const next = this.cloneData();
      const targetSchedule = next.schedules.find((item) => item.id === scheduleId);
      if (!targetSchedule) return;
      let targetAssignment = assignmentId ? targetSchedule.assignments.find((item) => item.id === assignmentId) : null;
      if (!targetAssignment) {
        targetAssignment = { id: newId("assignment"), mode_id: form.elements.mode_id.value, enabled: false, weekday_rules: {} };
        targetSchedule.assignments.push(targetAssignment);
      }
      targetAssignment.mode_id = form.elements.mode_id.value;
      if (autoRulesValue.length) targetAssignment.auto_rules = autoRulesValue;
      else delete targetAssignment.auto_rules;
      if (continuous) targetAssignment.continuous = true;
      else delete targetAssignment.continuous;
      if (!continuous) {
        for (const day of DAYS) {
          const card = dialog.querySelector(`[data-mode-day="${day}"]`);
          if (!card.querySelector("[data-day-enabled]").checked) {
            delete targetAssignment.weekday_rules[day];
            continue;
          }
          const existingPhases = targetAssignment.weekday_rules[day] || [];
          targetAssignment.weekday_rules[day] = [...card.querySelectorAll("[data-day-time]")].map((input) => {
            const existingPhase = existingPhases.find((phase) => this.phaseId(phase) === input.dataset.phaseId);
            const phase = existingPhase && typeof existingPhase === "object"
              ? { ...existingPhase, time: input.value }
              : { id: newId("phase"), time: input.value };
            if (temperatureTouched) {
              if (temperature.value === "") delete phase.target_temperature;
              else phase.target_temperature = storedTemperature;
            }
            return phase;
          }).sort((left, right) => this.phaseMinutes(left) - this.phaseMinutes(right));
        }
      }
      phaseMoves.forEach((move) => {
        const following = this.followingPhase(schedule, move.day, move.oldStart, move.phaseId);
        const followingPhaseId = following ? this.phaseId(following.phase) : "";
        if (!following || !followingPhaseId || explicitlyMovedPhaseIds.has(followingPhaseId)) return;
        const targetFollowing = this.phaseEntry(targetSchedule, followingPhaseId);
        if (!targetFollowing || targetFollowing.weekday !== move.day || typeof targetFollowing.phase !== "object") return;
        targetFollowing.phase.time = this.timeFromMinutes(move.newStart + following.minutes - move.oldStart);
        targetFollowing.assignment.weekday_rules[move.day].sort((left, right) => this.phaseMinutes(left) - this.phaseMinutes(right));
      });
      await this.save(next);
    };
    dialog.showModal(); form.querySelector("select, [name=bulk_time]")?.focus();
  }

  async handleAction(action, id, scheduleId, assignmentId) {
    if (action === "edit-mode") return this.openModeDialog(id);
    if (action === "delete-mode") return this.deleteMode(id);
    if (action === "activate-mode") return this.activateMode(scheduleId, id, assignmentId);
    if (action === "clear-override") return this.clearManualOverride(scheduleId);
    if (action === "open-schedule-details") return this.openScheduleDetails(scheduleId || id);
    if (action === "duplicate-schedule") return this.duplicateSchedule(id);
    if (action === "export-schedule") return this.exportSchedule(id);
    if (action === "edit-schedule") return this.openScheduleDialog(id);
    if (action === "delete-schedule") return this.deleteSchedule(id);
    if (action === "toggle-window-detection") return this.toggleWindowDetection(scheduleId);
    if (action === "add-assignment") return this.openAssignmentDialog(scheduleId);
    if (action === "edit-assignment") return this.openAssignmentDialog(scheduleId, id);
    if (action === "delete-assignment") return this.deleteAssignment(scheduleId, id);
    if (action === "toggle-assignment") return this.toggleAssignment(scheduleId, id);
    if (action === "toggle-schedule-mode") return this.toggleScheduleMode(scheduleId, id);
    if (action === "toggle-schedule") return this.toggleSchedule(scheduleId);
  }

  async activateMode(scheduleId, modeId, assignmentId) {
    if (!this._hass.user?.is_admin) return;
    const schedule = this.data?.schedules?.find((item) => item.id === scheduleId);
    const mode = this.mode(modeId);
    const assignment = schedule?.assignments?.find((item) => item.id === assignmentId)
      || schedule?.assignments?.find((item) => item.mode_id === modeId);
    const requestId = newId("activation");
    if (schedule && mode) {
      this.optimisticActivations.set(scheduleId, {
        mode_id: mode.id,
        mode_name: mode.name,
        assignment_id: assignment?.id || assignmentId || "",
        phase_id: null,
        target_temperature: Number(assignment
          ? this.assignmentTemperature(schedule, assignment, mode)
          : mode.target_temperature),
        activated_at: new Date().toISOString(),
        request_id: requestId,
      });
      this.renderSchedules(true);
    }
    try {
      await this._hass.callWS({ type: "climate_planner/activate_mode", schedule_id: scheduleId, mode_id: modeId, ...(assignmentId ? { assignment_id: assignmentId } : {}) });
      await this.load();
      const optimistic = this.optimisticActivations.get(scheduleId);
      const activated = this.data?.last_activated?.[scheduleId];
      const settled = activated?.mode_id === modeId
        && Math.abs(Number(activated.target_temperature) - Number(optimistic?.target_temperature)) <= 0.001;
      if (optimistic?.request_id === requestId && !settled) {
        // A state event may have delivered the snapshot that was captured
        // before the service request finished. Fetch one authoritative
        // snapshot before dropping the optimistic view.
        await this.load();
      }
      if (this.optimisticActivations.get(scheduleId)?.request_id === requestId) {
        this.optimisticActivations.delete(scheduleId);
        this.renderSchedules(true);
      }
    } catch (error) {
      if (this.optimisticActivations.get(scheduleId)?.request_id === requestId) {
        this.optimisticActivations.delete(scheduleId);
        await this.load();
        if (this.data && !this.detailOpen) this.renderSchedules(true);
      }
      this.notice(error?.code === "invalid_input" ? `${this.t.invalid} (${error.message || ""})` : this.t.saveError, true);
    }
  }

  async clearManualOverride(scheduleId) {
    if (!this._hass.user?.is_admin) return;
    try {
      await this._hass.callWS({ type: "climate_planner/clear_override", schedule_id: scheduleId });
      await this.load();
    } catch (error) {
      this.notice(error?.code === "invalid_input" ? `${this.t.invalid} (${error.message || ""})` : this.t.saveError, true);
    }
  }

  async deleteMode(modeId) {
    if (!window.confirm(this.t.deleteMode)) return;
    const next = this.cloneData();
    next.modes = next.modes.filter((mode) => mode.id !== modeId);
    next.schedules.forEach((schedule) => { schedule.assignments = schedule.assignments.filter((assignment) => assignment.mode_id !== modeId); });
    await this.save(next);
  }

  async deleteSchedule(scheduleId) {
    if (!window.confirm(this.t.deleteSchedule)) return;
    const next = this.cloneData(); next.schedules = next.schedules.filter((schedule) => schedule.id !== scheduleId); await this.save(next);
  }

  async duplicateSchedule(scheduleId) {
    if (!this._hass.user?.is_admin) return;
    if (this.duplicateSchedulePending) return;
    const source = this.data.schedules.find((schedule) => schedule.id === scheduleId);
    if (!source) return;
    const suffix = ` (${this.t.copySuffix})`;
    const maximumBaseLength = Math.max(1, 160 - suffix.length);
    const duplicate = {
      ...structuredClone(source),
      id: newId("schedule"),
      name: `${source.name.slice(0, maximumBaseLength).trimEnd()}${suffix}`,
      // A copy must not start controlling the same climate entities before
      // the administrator has reviewed it.
      enabled: false,
      assignments: source.assignments.map((assignment) => ({
        ...structuredClone(assignment),
        id: newId("assignment"),
        weekday_rules: Object.fromEntries(Object.entries(assignment.weekday_rules || {}).map(([weekday, phases]) => [
          weekday,
          phases.map((phase) => (typeof phase === "string"
            ? { id: newId("phase"), time: phase }
            : { ...phase, id: newId("phase") })),
        ])),
      })),
    };
    const next = this.cloneData();
    next.schedules.push(duplicate);
    this.duplicateSchedulePending = scheduleId;
    this.notice(this.t.duplicating);
    this.renderSchedules(true);
    const saved = await this.save(next);
    this.duplicateSchedulePending = "";
    if (!saved) {
      this.renderSchedules(true);
      return;
    }
    this.selectedSchedule = duplicate.id;
    this.storageSet("climate-planner-schedule", duplicate.id);
    this.render();
  }

  async deleteAssignment(scheduleId, assignmentId) {
    if (!window.confirm(this.t.deleteAssignment)) return;
    const next = this.cloneData();
    const schedule = next.schedules.find((item) => item.id === scheduleId);
    const assignment = schedule?.assignments.find((item) => item.id === assignmentId);
    if (!assignment) return;
    schedule.assignments = schedule.assignments.filter((item) => item.mode_id !== assignment.mode_id);
    await this.save(next);
  }

  async toggleSchedule(scheduleId) {
    const next = this.cloneData(); const schedule = next.schedules.find((item) => item.id === scheduleId); if (schedule) schedule.enabled = !schedule.enabled; await this.save(next);
  }

  async toggleWindowDetection(scheduleId) {
    const next = this.cloneData();
    const schedule = next.schedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    schedule.window_open_enabled = schedule.window_open_enabled === false;
    await this.save(next);
  }

  async toggleAssignment(scheduleId, assignmentId) {
    const next = this.cloneData(); const schedule = next.schedules.find((item) => item.id === scheduleId); const assignment = schedule?.assignments.find((item) => item.id === assignmentId); if (assignment) assignment.enabled = !assignment.enabled; await this.save(next);
  }

  async toggleScheduleMode(scheduleId, modeId) {
    if (!this._hass.user?.is_admin) return;
    const next = this.cloneData();
    const schedule = next.schedules.find((item) => item.id === scheduleId);
    const assignments = schedule?.assignments.filter((item) => item.mode_id === modeId) || [];
    if (!assignments.length) return;
    const enabled = !assignments.some((item) => item.enabled);
    assignments.forEach((item) => { item.enabled = enabled; });
    await this.save(next);
  }

  openModeDialog(modeId = null) {
    if (!this._hass.user?.is_admin) return;
    const mode = modeId ? this.mode(modeId) : { name: "", target_temperature: 20, color: "", icon: "", priority: 0 };
    const dialog = this.$("dialog"); this.dialogKind = "mode"; this.dialogContext = modeId;
    const unit = this.temperatureUnit();
    const initialColor = mode.color || "#4caf50";
    dialog.innerHTML = `<form method="dialog" class="dialog-form"><h2>${modeId ? this.t.edit : this.t.addMode}</h2><div class="form-grid"><label>${this.t.name}<input name="name" required maxlength="160" value="${escapeHTML(mode.name)}"></label><label>${this.t.temperature}<span class="input-with-unit"><input name="target_temperature" type="number" step="0.1" required value="${escapeHTML(this.displayTemperature(mode.target_temperature))}" aria-label="${escapeHTML(this.t.temperature)}"><span class="unit-suffix">${unit}</span></span></label><label><span class="field-label-with-info"><span>${escapeHTML(this.t.priority)}</span><span class="field-info" tabindex="0" role="img" aria-label="${escapeHTML(this.t.priorityHint)}" title="${escapeHTML(this.t.priorityHint)}"><ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon><span class="field-info-tooltip" role="tooltip">${escapeHTML(this.t.priorityHint)}</span></span></span><input name="priority" type="number" step="1" required value="${escapeHTML(mode.priority ?? 0)}"></label><label class="full">${this.t.color}<span class="color-controls"><input name="color_picker" type="color" value="${escapeHTML(initialColor)}" aria-label="${escapeHTML(this.t.color)}"><input name="color_hex" pattern="^#[0-9a-fA-F]{6}$" value="${escapeHTML(mode.color || "")}" placeholder="#4caf50" aria-label="${escapeHTML(this.t.hexColor)}"></span></label><label class="full">${this.t.icon}<ha-icon-picker id="mode-icon-picker"></ha-icon-picker><input name="icon_text" pattern="^mdi:[a-z0-9-]+$" value="${escapeHTML(mode.icon || "")}" placeholder="${escapeHTML(this.t.iconPlaceholder)}" aria-label="${escapeHTML(this.t.icon)}"></label></div><div class="dialog-actions"><button type="button" data-cancel>${this.t.cancel}</button><button class="primary" type="submit">${this.t.save}</button></div></form>`;
    const form = dialog.querySelector("form");
    const colorPicker = form.elements.color_picker;
    const colorHex = form.elements.color_hex;
    const iconPicker = dialog.querySelector("#mode-icon-picker");
    const iconText = form.elements.icon_text;
    const configureIconPicker = () => {
      if (!globalThis.customElements?.get("ha-icon-picker") || iconPicker.dataset.ready) return false;
      iconPicker.hass = this._hass;
      iconPicker.label = this.t.icon;
      iconPicker.placeholder = this.t.iconPlaceholder;
      iconPicker.value = mode.icon || "";
      iconText.hidden = true;
      iconPicker.hidden = false;
      iconPicker.dataset.ready = "true";
      iconPicker.addEventListener("value-changed", (event) => { iconText.value = event.detail?.value || ""; });
      return true;
    };
    if (!configureIconPicker()) {
      iconPicker.hidden = true;
      globalThis.customElements?.whenDefined("ha-icon-picker").then(() => {
        if (dialog.open && this.dialogKind === "mode") configureIconPicker();
      });
    }
    colorPicker.addEventListener("input", () => { colorHex.value = colorPicker.value.toUpperCase(); });
    colorHex.addEventListener("input", () => { if (/^#[0-9a-fA-F]{6}$/.test(colorHex.value)) colorPicker.value = colorHex.value; });
    dialog.querySelector("[data-cancel]").onclick = () => this.closeDialog();
    form.onsubmit = async (event) => {
      event.preventDefault();
      const displayValue = Number(form.elements.target_temperature.value);
      const value = this.storedTemperature(displayValue);
      if (!Number.isFinite(value)) return this.notice(this.t.invalid, true);
      const priority = Number(form.elements.priority.value);
      if (!Number.isInteger(priority) || priority < -1000000 || priority > 1000000) return this.notice(this.t.invalid, true);
      const next = this.cloneData();
      const item = { id: modeId || newId("mode"), name: form.elements.name.value, target_temperature: Number(value.toFixed(2)), priority };
      if (form.elements.color_hex.value) item.color = form.elements.color_hex.value;
      if (form.elements.icon_text.value) item.icon = form.elements.icon_text.value;
      next.modes = [...next.modes.filter((current) => current.id !== modeId), item];
      await this.save(next);
    };
    dialog.showModal(); dialog.querySelector("input")?.focus();
  }

  climateEntities() {
    const metadata = (this.data?.climate_entities || []).map((item) => item.entity_id);
    if (metadata.length) return metadata;
    return Object.keys(this._hass.states || {}).filter((entityId) => entityId.startsWith("climate.")).sort();
  }

  climateEntityInfo(entityId) {
    return (this.data?.climate_entities || []).find((item) => item.entity_id === entityId);
  }

  climateEntityLabel(entityId, schedule = null) {
    const customName = String(schedule?.climate_entity_names?.[entityId] || "").trim();
    return customName || this.climateEntityInfo(entityId)?.label || entityId;
  }

  climateEntityPickerOption(entityId) {
    const info = this.climateEntityInfo(entityId) || {};
    const deviceName = String(info.device_name || "").trim();
    const fullName = String(info.name || entityId).trim();
    const suffix = deviceName && fullName.toLocaleLowerCase().startsWith(deviceName.toLocaleLowerCase())
      ? fullName.slice(deviceName.length).trim().replace(/^[\s·\-_]+/, "")
      : fullName;
    const secondaryParts = [];
    for (const value of [info.integration, info.area_name, deviceName]) {
      const normalized = String(value || "").trim();
      if (normalized && !secondaryParts.some((part) => part.toLocaleLowerCase() === normalized.toLocaleLowerCase())) secondaryParts.push(normalized);
    }
    return {
      id: entityId,
      entity_id: entityId,
      primary: suffix || fullName || entityId,
      secondary: secondaryParts.join(" › ") || entityId,
    };
  }

  climateEntitySummary(entityIds) {
    const ids = Array.isArray(entityIds) ? entityIds : entityIds ? [entityIds] : [];
    return ids.map((entityId) => this.climateEntityLabel(entityId)).join(", ") || this.t.noClimate;
  }

  climateEntityTemperatureValue(entityId, attribute, metadataAttribute = attribute) {
    const attributes = this._hass?.states?.[entityId]?.attributes || {};
    const stateValue = attributes[attribute];
    const metadataValue = this.climateEntityInfo(entityId)?.[metadataAttribute];
    const value = stateValue ?? metadataValue;
    if (value == null || value === "" || !Number.isFinite(Number(value))) return null;
    return stateValue == null ? Number(value) : this.storedTemperature(value);
  }

  climateEntityTemperature(entityId, attribute, metadataAttribute = attribute) {
    const value = this.climateEntityTemperatureValue(entityId, attribute, metadataAttribute);
    return value == null ? "—" : this.temperatureText(value);
  }

  targetTemperatureTolerance(entityId) {
    const step = Number(this._hass?.states?.[entityId]?.attributes?.target_temp_step);
    if (!Number.isFinite(step) || step <= 0) return 0.051;
    const celsiusStep = this.temperatureUnit() === "°F" ? step * 5 / 9 : step;
    return Math.max(0.051, celsiusStep / 2 + 0.001);
  }

  externalTargetKey(schedule, entityId) {
    return `${schedule?.id || ""}:${entityId}`;
  }

  clearExternalTargetTracking(key) {
    this.externalTargetMismatches.delete(key);
    const timer = this.externalTargetTimers.get(key);
    if (timer) clearTimeout(timer);
    this.externalTargetTimers.delete(key);
  }

  scheduleExternalTargetRefresh(key, delay) {
    if (this.externalTargetTimers.has(key)) return;
    const timer = setTimeout(() => {
      this.externalTargetTimers.delete(key);
      if (!this.data || !this.started || this.detailOpen || this.dragActive) return;
      if (this.scheduleInteractionActive) {
        this.scheduleRenderPending = true;
      } else {
        this.renderSchedules(Boolean(this._hass.user?.is_admin));
      }
    }, Math.max(0, delay));
    this.externalTargetTimers.set(key, timer);
  }

  externalTargetForEntity(schedule, entityId, requestedTemperature) {
    const key = this.externalTargetKey(schedule, entityId);
    if (requestedTemperature == null || requestedTemperature === "") {
      this.clearExternalTargetTracking(key);
      return false;
    }
    const requested = Number(requestedTemperature);
    if (!Number.isFinite(requested)) {
      this.clearExternalTargetTracking(key);
      return false;
    }
    const windowOpenEntityIds = new Set(this.data.window_status?.[schedule.id]?.open_entity_ids || []);
    if (windowOpenEntityIds.has(entityId)) {
      this.clearExternalTargetTracking(key);
      return false;
    }
    if (this.optimisticActivations.has(schedule.id)) {
      this.clearExternalTargetTracking(key);
      return false;
    }
    const pendingActivations = this.data.pending_activations?.[schedule.id];
    if (pendingActivations && Object.prototype.hasOwnProperty.call(pendingActivations, entityId)) {
      this.clearExternalTargetTracking(key);
      return false;
    }
    const entityTarget = this.climateEntityTemperatureValue(entityId, "temperature", "target_temperature");
    if (entityTarget == null || Math.abs(entityTarget - requested) <= this.targetTemperatureTolerance(entityId)) {
      this.clearExternalTargetTracking(key);
      return false;
    }
    const now = Date.now();
    const previous = this.externalTargetMismatches.get(key);
    const sameMismatch = previous
      && previous.requested === requested
      && Math.abs(previous.entityTarget - entityTarget) <= this.targetTemperatureTolerance(entityId);
    const mismatch = sameMismatch
      ? previous
      : { requested, entityTarget, since: now };
    if (!sameMismatch) this.externalTargetMismatches.set(key, mismatch);
    const remaining = EXTERNAL_TARGET_GRACE_MS - (now - mismatch.since);
    if (remaining > 0) {
      this.scheduleExternalTargetRefresh(key, remaining);
      return false;
    }
    return true;
  }

  externalTargetText(schedule, lastActivated) {
    const requested = Number(lastActivated?.target_temperature);
    if (!Number.isFinite(requested)) return "";
    const entityIds = schedule.climate_entity_ids || [];
    return entityIds.some((entityId) => this.externalTargetForEntity(schedule, entityId, requested))
      ? this.t.external
      : "";
  }

  scheduleHasExternalTarget(schedule, lastActivated) {
    return Boolean(this.externalTargetText(schedule, lastActivated));
  }

  climateEntityRows(entityIds, requestedTemperature = null, schedule = null) {
    const ids = Array.isArray(entityIds) ? entityIds : entityIds ? [entityIds] : [];
    if (!ids.length) return `<p class="muted schedule-entities-empty">${this.t.noClimate}</p>`;
    return ids.map((entityId) => {
      const externalTarget = schedule ? this.externalTargetForEntity(schedule, entityId, requestedTemperature) : "";
      const externalMarkup = externalTarget ? `<span class="external-badge">${escapeHTML(this.t.external)}</span>` : "";
      const entityTarget = this.climateEntityTemperature(entityId, "temperature", "target_temperature");
      return `<button type="button" class="schedule-entity-row" data-climate-entity="${escapeHTML(entityId)}" title="${escapeHTML(this.climateEntityLabel(entityId, schedule))}"><span class="schedule-entity-name">${escapeHTML(this.climateEntityLabel(entityId, schedule))}</span><span class="schedule-entity-values"><span class="climate-value climate-target"><span><b title="${escapeHTML(this.t.targetRequest)}">${escapeHTML(this.t.targetRequestShort)}</b> ${escapeHTML(entityTarget)}</span>${externalMarkup}</span><span class="climate-value"><b>${escapeHTML(this.t.currentShort)}</b> ${escapeHTML(this.climateEntityTemperature(entityId, "current_temperature"))}</span></span></button>`;
    }).join("");
  }

  showClimateMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    }));
  }

  openScheduleDialog(scheduleId = null) {
    if (!this._hass.user?.is_admin) return;
    const schedule = scheduleId ? this.data.schedules.find((item) => item.id === scheduleId) : { name: "", climate_entity_ids: [], window_open_enabled: true, window_open_temperature: 18.5, enabled: true, assignments: [] };
    let selectedEntityIds = [...(schedule.climate_entity_ids || [schedule.climate_entity_id].filter(Boolean))];
    const displayNameByEntity = { ...(schedule.climate_entity_names || {}) };
    const entities = this.climateEntities();
    const dialog = this.$("dialog"); this.dialogKind = "schedule"; this.dialogContext = scheduleId;
    dialog.innerHTML = `<form method="dialog" class="dialog-form"><h2>${scheduleId ? this.t.edit : this.t.addSchedule}</h2><div class="form-grid"><label>${this.t.name}<input name="name" required maxlength="160" value="${escapeHTML(schedule.name)}"></label><label class="checkbox-field">${this.t.enabled}<input name="enabled" type="checkbox" ${schedule.enabled ? "checked" : ""}></label><div class="full climate-selector-field"><span class="climate-selector-label">${escapeHTML(this.t.climate)}</span><div id="climate-entity-selector"></div></div><label class="window-temperature-field"><span class="field-label-row"><span>${escapeHTML(this.t.windowOpenTemperature)}</span><span class="inline-checkbox"><input name="window_open_enabled" type="checkbox" ${schedule.window_open_enabled !== false ? "checked" : ""}>${escapeHTML(this.t.windowDetection)}</span></span><span class="input-with-unit"><input name="window_open_temperature" type="number" step="0.1" required value="${escapeHTML(this.displayTemperature(schedule.window_open_temperature ?? 18.5))}" aria-label="${escapeHTML(this.t.windowOpenTemperature)}"><span class="unit-suffix">${this.temperatureUnit()}</span></span><small class="muted">${escapeHTML(this.t.windowOpenTemperatureHint)}</small></label></div><div class="dialog-actions"><button type="button" data-cancel>${this.t.cancel}</button><button class="primary" type="submit">${this.t.save}</button></div></form>`;
    const selector = dialog.querySelector("#climate-entity-selector");
    const renderEntityPickers = () => {
      if (!customElements.get("ha-entity-picker") || !dialog.open || this.dialogKind !== "schedule" || this.dialogContext !== scheduleId) return false;
      selector.replaceChildren();
      const configurePicker = (picker, options, value = "") => {
        picker.hass = this._hass;
        picker.includeDomains = ["climate"];
        picker.excludeEntities = [...entities];
        picker.extraOptions = options.map((entityId) => this.climateEntityPickerOption(entityId));
        picker.value = value;
      };
      selectedEntityIds.forEach((entityId, index) => {
        const row = document.createElement("div");
        row.className = "climate-entity-picker-row";
        const picker = document.createElement("ha-entity-picker");
        const otherSelected = new Set(selectedEntityIds.filter((_, selectedIndex) => selectedIndex !== index));
        configurePicker(picker, entities.filter((candidate) => !otherSelected.has(candidate)), entityId);
        picker.addEventListener("value-changed", (event) => {
          const value = event.detail?.value;
          if (!value) {
            selectedEntityIds.splice(index, 1);
            delete displayNameByEntity[entityId];
          } else if (typeof value === "string" && value.startsWith("climate.") && !otherSelected.has(value)) {
            const previousDisplayName = displayNameByEntity[entityId];
            selectedEntityIds[index] = value;
            delete displayNameByEntity[entityId];
            if (previousDisplayName && !displayNameByEntity[value]) displayNameByEntity[value] = previousDisplayName;
          }
          renderEntityPickers();
        });
        const nameLabel = document.createElement("label");
        nameLabel.className = "climate-entity-display-name";
        const nameLabelText = document.createElement("span");
        nameLabelText.textContent = this.t.entityDisplayName;
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.maxLength = 160;
        nameInput.placeholder = this.t.entityDisplayNamePlaceholder;
        nameInput.value = displayNameByEntity[entityId] || "";
        nameInput.setAttribute("aria-label", this.t.entityDisplayName);
        nameInput.addEventListener("input", () => {
          const value = nameInput.value.trim();
          if (value) displayNameByEntity[entityId] = value;
          else delete displayNameByEntity[entityId];
        });
        nameLabel.append(nameLabelText, nameInput);
        row.append(picker, nameLabel);
        selector.append(row);
      });
      const available = entities.filter((entityId) => !selectedEntityIds.includes(entityId));
      if (available.length) {
        const addPicker = document.createElement("ha-entity-picker");
        addPicker.className = "climate-entity-add";
        configurePicker(addPicker, available);
        addPicker.addButton = selectedEntityIds.length > 0;
        addPicker.required = selectedEntityIds.length === 0;
        addPicker.addEventListener("value-changed", (event) => {
          const value = event.detail?.value;
          if (typeof value === "string" && value.startsWith("climate.") && !selectedEntityIds.includes(value)) selectedEntityIds.push(value);
          renderEntityPickers();
        });
        selector.append(addPicker);
      }
      return true;
    };
    if (!renderEntityPickers()) customElements.whenDefined("ha-entity-picker").then(renderEntityPickers);
    dialog.querySelector("[data-cancel]").onclick = () => this.closeDialog();
    dialog.querySelector("form").onsubmit = async (event) => { event.preventDefault(); const form = event.currentTarget; if (!selectedEntityIds.length) return this.notice(this.t.noClimate, true); const windowTemperature = this.storedTemperature(form.elements.window_open_temperature.value); if (!Number.isFinite(windowTemperature)) return this.notice(this.t.invalid, true); const next = this.cloneData(); const climateEntityNames = Object.fromEntries(selectedEntityIds.map((entityId) => [entityId, String(displayNameByEntity[entityId] || "").trim()]).filter(([, name]) => name)); const item = { id: scheduleId || newId("schedule"), name: form.elements.name.value, climate_entity_ids: selectedEntityIds, climate_entity_names: climateEntityNames, window_open_enabled: form.elements.window_open_enabled.checked, window_open_temperature: Number(windowTemperature.toFixed(2)), enabled: form.elements.enabled.checked, assignments: schedule.assignments || [] }; const existingIndex = next.schedules.findIndex((current) => current.id === scheduleId); if (existingIndex >= 0) next.schedules[existingIndex] = item; else next.schedules.push(item); await this.save(next); };
    if (!entities.length) this.notice(this.t.noClimate, true);
    dialog.showModal(); dialog.querySelector("input")?.focus();
  }

  openAssignmentDialog(scheduleId, assignmentId = null, draggedModeId = null, initialWeekday = null, initialTime = "06:00") {
    this.openModeScheduleDialog(scheduleId, assignmentId, draggedModeId, initialWeekday, initialTime);
  }

  closeDialog() { const dialog = this.$("dialog"); if (dialog.open) dialog.close(); dialog.innerHTML = ""; this.dialogKind = null; this.dialogContext = null; this.dialogBackdropMouseDown = false; }
}

if (!customElements.get("climate-planner-panel")) customElements.define("climate-planner-panel", ClimatePlannerPanel);

