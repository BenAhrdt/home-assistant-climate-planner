/* Climate Planner panel: authenticated Home Assistant WebSocket only. */
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const newId = (prefix) => {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const labels = {
  de: {
    title: "Zeitgesteuerte Heizpläne", overview: "Übersicht", modes: "Mode-Bibliothek", schedules: "Heizpläne",
    week: "Wochenansicht", addMode: "Mode anlegen", addSchedule: "Heizplan anlegen",
    addAssignment: "Mode hinzufügen", editAssignment: "Mode bearbeiten", editPhase: "Phase bearbeiten", usedModes: "Verwendete Modes", details: "Details öffnen", edit: "Bearbeiten", remove: "Löschen", save: "Speichern",
    cancel: "Abbrechen", name: "Name", temperature: "Zieltemperatur", priority: "Priorität", color: "Farbe (optional)",
    icon: "Icon (optional, z. B. mdi:leaf)", hexColor: "Hex-Farbwert", iconPlaceholder: "mdi:leaf", climate: "Klima-Entitäten", enabled: "Aktiviert",
    sameTime: "Gleiche Uhrzeit", individualTime: "Individuelle Uhrzeiten", weekdays: "Wochentage",
    time: "Uhrzeit", bulkTime: "Uhrzeit für ausgewählte Tage", weekday: "Wochentag", transition: "Übergang verschieben", phase: "Phase", duplicate: "Duplizieren", placeDuplicate: "Duplikat platzieren", duplicateTimeOccupied: "Eine Stunde vor diesem Mode liegt bereits ein Wechsel. Bitte eine andere Uhrzeit wählen.", duplicateNoRoom: "Vor diesem Mode ist nicht genug Platz für die Duplikatdauer. Der vorherige Mode behält mindestens eine Stunde.", selectAllDays: "Alle anwählen", clearAllDays: "Alle abwählen", copySuffix: "Kopie", defaultDuration: "Richtwert: 8 Stunden · letzter Block bis 24:00", drop: "Mode auf die Heizplankachel ziehen", dropTimeline: "Mode auf einen Tag und eine Uhrzeit ziehen · Richtwert 8 h · letzter Block bis 24:00 · Alt/Strg/Cmd = kopieren", chooseMode: "Mode direkt aktivieren", noModes: "Noch keine Modes angelegt.",
    noSchedules: "Noch keine Heizpläne angelegt.", active: "Aktiver Mode", lastActivated: "Zuletzt aktiviert", external: "extern", manual: "Manuell", automatic: "Automatik verwenden", manualUntil: "Automatik ab", activateSchedule: "Heizplan aktivieren", pauseSchedule: "Heizplan pausieren", activateMode: "Mode aktivieren", pauseMode: "Mode pausieren", targetRequestShort: "Soll ↗", targetRequest: "Sollwertvorgabe", targetFeedbackShort: "Soll ↘", targetFeedback: "Sollwertrückmeldung", currentShort: "Ist", next: "Nächster Wechsel",
    none: "Noch kein Mode aktiviert", connected: "Bereit", loading: "Wird geladen …",
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
    save: "Save", cancel: "Cancel", name: "Name", temperature: "Target temperature", priority: "Priority", color: "Color (optional)",
    icon: "Icon (optional, e.g. mdi:leaf)", hexColor: "Hex color", iconPlaceholder: "mdi:leaf", climate: "Climate entities", enabled: "Enabled",
    sameTime: "Same time", individualTime: "Individual times", weekdays: "Weekdays", time: "Time", bulkTime: "Time for selected days", weekday: "Weekday", transition: "Move transition", phase: "Phase", duplicate: "Duplicate", placeDuplicate: "Place duplicate", duplicateTimeOccupied: "There is already a change one hour before this mode. Choose another time.", duplicateNoRoom: "There is not enough room for the duplicate duration. The previous mode keeps at least one hour.", selectAllDays: "Select all", clearAllDays: "Clear all", copySuffix: "Copy", defaultDuration: "Guideline: 8 hours · last block until 24:00", dropTimeline: "Drag a mode onto a day and time · guideline 8 h · last block until 24:00 · Alt/Ctrl/Cmd = copy",
    drop: "Drop mode on the heating plan", chooseMode: "Activate mode directly", noModes: "No modes have been created yet.", noSchedules: "No heating plans have been created yet.",
    active: "Active mode", lastActivated: "Last activated", external: "external", manual: "Manual", automatic: "Use schedule", manualUntil: "Automatic from", activateSchedule: "Activate heating plan", pauseSchedule: "Pause heating plan", activateMode: "Activate mode", pauseMode: "Pause mode", targetRequestShort: "Target ↗", targetRequest: "Requested target", targetFeedbackShort: "Target ↘", targetFeedback: "Reported target", currentShort: "Current", next: "Next change", none: "No mode activated yet", connected: "Ready", loading: "Loading …",
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
    this.dragActive = false;
    this.phaseResizeActive = false;
    this.pendingRender = false;
    this.suppressPhaseClickUntil = 0;
    this.lastScheduleRenderSignature = "";
    this.scheduleInteractionActive = false;
    this.scheduleRenderPending = false;
  }

  set hass(value) {
    this._hass = value;
    if (this.isConnected && !this.started) this.start();
    else if (this.started && this.data && !this.detailOpen && !this.dragActive
      && this.scheduleRenderSignature() !== this.lastScheduleRenderSignature) {
      if (this.scheduleInteractionActive) this.scheduleRenderPending = true;
      else this.renderSchedules(Boolean(this._hass.user?.is_admin));
    }
  }

  connectedCallback() {
    if (this._hass) this.start();
  }

  disconnectedCallback() {
    clearInterval(this.clockTimer);
    this.removeModeDragCursor();
    this.eventUnsub?.();
    this.eventUnsub = null;
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
        () => this.load(), "climate_planner_updated",
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
        return [entityId, state?.state, state?.last_updated, state?.attributes?.temperature, state?.attributes?.target_temperature, state?.attributes?.current_temperature, state?.attributes?.target_temp_step];
      }),
    });
  }

  renderShell() {
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;min-height:100vh;color:var(--primary-text-color);background:var(--primary-background-color);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif)}
      *{box-sizing:border-box}main{max-width:1500px;margin:auto;padding:24px}header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}h1{font-size:26px;flex:1;margin:0}h2{font-size:20px;margin:26px 0 12px}h3{font-size:17px;margin:0 0 8px}button,input,select{font:inherit;color:inherit}button{cursor:pointer;border:1px solid var(--divider-color);background:var(--card-background-color);border-radius:8px;padding:9px 13px}button.primary{color:var(--text-primary-color,#fff);background:var(--primary-color);border-color:var(--primary-color)}button.danger{color:var(--error-color,#db4437)}button:disabled{opacity:.55;cursor:not-allowed}input,select{width:100%;padding:9px;border:1px solid var(--divider-color);border-radius:7px;background:var(--card-background-color)}label{display:grid;gap:5px;font-size:13px}.muted{color:var(--secondary-text-color)}.error{color:var(--error-color,#db4437)}.notice{min-height:24px;padding:8px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.card{background:var(--ha-card-background,var(--card-background-color));border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,12px);padding:16px;overflow-wrap:anywhere}.card.dragging{opacity:.55}.card.drop-target{border:2px dashed var(--primary-color);background:color-mix(in srgb,var(--primary-color) 10%,var(--card-background-color))}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.mode-color{width:14px;height:14px;display:inline-block;border-radius:50%;vertical-align:-2px;margin-right:6px;border:1px solid var(--divider-color)}.mode-meta{display:flex;align-items:center;gap:8px;color:var(--secondary-text-color);font-size:13px}.assignment{border-top:1px solid var(--divider-color);padding-top:10px;margin-top:10px}.assignment:first-child{border-top:0;padding-top:0}.assignment .actions{margin-top:8px}.status-dot{font-size:18px;color:var(--success-color,#43a047)}.status-dot.off{color:var(--secondary-text-color)}.drop-zone{border:1px dashed var(--divider-color);border-radius:8px;padding:10px;text-align:center;color:var(--secondary-text-color);margin-top:12px}.drop-zone:focus,.drop-zone:hover{border-color:var(--primary-color);color:var(--primary-text-color)}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.full{grid-column:1/-1}.days{display:grid;grid-template-columns:repeat(7,minmax(70px,1fr));gap:7px}.day-check{display:flex;align-items:center;gap:5px;padding:7px;border:1px solid var(--divider-color);border-radius:7px}.day-check input{width:auto}.time-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.time-fields[hidden]{display:none}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.dialog-form{min-width:min(720px,90vw)}dialog{color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:12px;max-width:calc(100vw - 24px)}dialog::backdrop{background:rgba(0,0,0,.45)}fieldset{border:0;padding:0;margin:12px 0}legend{font-weight:600;margin-bottom:8px}.week-controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap}.week-controls label{min-width:260px}.week-scroll{overflow-x:auto;padding-bottom:10px}.week-grid{display:grid;grid-template-columns:repeat(7,minmax(150px,1fr));gap:8px;min-width:1050px}.day-column{position:relative}.day-column h3{text-align:center;background:var(--secondary-background-color);padding:8px;border-radius:7px;font-size:14px}.day-track{height:720px;position:relative;border:1px solid var(--divider-color);border-radius:7px;background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(25% - 1px),var(--divider-color) 25%);overflow:hidden}.segment{position:absolute;left:3px;right:3px;border-radius:6px;padding:5px;font-size:12px;overflow:hidden;border-left:4px solid var(--primary-color);background:color-mix(in srgb,var(--primary-color) 20%,var(--card-background-color))}.segment strong,.segment small{display:block}.now-line{position:absolute;left:0;right:0;height:2px;background:var(--error-color,#db4437);z-index:2}.time-labels{position:absolute;inset:0;pointer-events:none;color:var(--secondary-text-color);font-size:10px}.time-labels span{position:absolute;left:4px}.empty{padding:14px;text-align:center;color:var(--secondary-text-color)}:focus-visible{outline:3px solid var(--primary-color);outline-offset:2px}@media(max-width:700px){main{padding:14px}h1{font-size:22px}.form-grid,.time-fields{grid-template-columns:1fr}.days{grid-template-columns:repeat(2,1fr)}.full{grid-column:auto}}
    </style><main><header><ha-icon icon="mdi:calendar-clock"></ha-icon><h1>Climate Planner</h1><button id="refresh" class="primary">↻</button><button id="add-mode" class="primary"></button><button id="add-schedule"></button></header><div id="notice" class="notice" role="status" aria-live="polite"></div><section><h2 id="modes-title"></h2><p id="drag-hint" class="muted"></p><div id="modes" class="grid"></div></section><section><h2 id="schedules-title"></h2><div id="schedules" class="grid"></div></section><section><h2 id="week-title"></h2><div id="week"></div></section><dialog id="dialog"></dialog></main>`;
    const style = this.shadowRoot.querySelector("style");
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
    style.textContent += ".week-mode-chip[draggable=true]{cursor:grab}.week-mode-chip[draggable=true].dragging{opacity:.55}.mode-day-actions{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 8px}.mode-day-actions button{padding:6px 9px;font-size:12px}";
    this.shadowRoot.querySelector("main").style.display = "grid";
    this.shadowRoot.querySelector("main").style.gridTemplateColumns = "minmax(0,1fr)";
    this.shadowRoot.querySelector("main").style.gridTemplateAreas = '"header" "notice" "modes" "schedules"';
    this.shadowRoot.querySelector("main").style.gap = "16px";
    style.textContent += ".mode-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.mode-card-top h3{margin:0}.mode-toggle{padding:5px 8px;font-size:13px;line-height:1}.mode-card.disabled{opacity:.68}.mode-card .mode-meta{flex-wrap:wrap}.mode-priority{font-size:11px;margin-left:auto}.quick-mode-wrap{display:flex;align-items:stretch;min-width:178px;border:1px solid var(--divider-color);border-radius:10px;background:var(--secondary-background-color);overflow:hidden;transition:border-color .12s,box-shadow .12s,background .12s}.quick-mode-wrap.active{border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 12%,var(--card-background-color));box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color) 18%,transparent)}.quick-mode-wrap.paused{opacity:.72}.quick-mode-wrap .quick-mode{min-width:0;flex:1;border:0;border-radius:0;background:transparent}.quick-mode-wrap .quick-mode:not(:disabled):hover{transform:none;border-color:transparent;box-shadow:none}.assignment-toggle{align-self:flex-start;padding:7px 8px;font-size:13px;line-height:1;color:var(--secondary-text-color);border:0;border-left:1px solid var(--divider-color);border-radius:0;background:transparent}.assignment-toggle:hover{color:var(--primary-text-color);border-color:var(--primary-color)}";
    style.textContent += ".assignment-tools{display:grid;align-self:stretch;border-left:1px solid var(--divider-color)}.assignment-toggle,.assignment-delete{display:flex;align-items:center;justify-content:center;min-width:30px;padding:5px 7px;font-size:13px;line-height:1;border:0;border-radius:0;background:transparent}.assignment-toggle{color:var(--secondary-text-color)}.assignment-toggle:hover{color:var(--primary-text-color);background:color-mix(in srgb,var(--primary-color) 8%,transparent)}.assignment-delete{border-top:1px solid var(--divider-color);color:var(--error-color,#db4437)}.assignment-delete:hover{background:color-mix(in srgb,var(--error-color,#db4437) 12%,transparent)}.assignment-delete ha-icon{--mdc-icon-size:16px}";
    style.textContent += ".mode-palette{position:static}.day-track{z-index:0;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent calc(1.041666% - 1px),color-mix(in srgb,var(--divider-color) 24%,transparent) 1.041666%),repeating-linear-gradient(to bottom,transparent 0,transparent calc(25% - 1px),color-mix(in srgb,var(--divider-color) 60%,transparent) 25%)}.segment{z-index:1;min-height:28px;padding:8px 8px 9px 10px;box-shadow:0 2px 5px rgba(0,0,0,.08)}.segment-head{display:flex;align-items:center;gap:4px}.segment-time{color:var(--secondary-text-color);font-size:11px}.transition-handle{position:absolute;left:0;right:0;height:18px;transform:translateY(-50%);z-index:6;cursor:ns-resize;touch-action:none}.transition-handle::after{content:\"\";position:absolute;left:18%;right:18%;top:8px;border-top:2px solid color-mix(in srgb,var(--primary-text-color) 45%,transparent);opacity:.65;transition:opacity .12s}.transition-handle:hover::after,.transition-handle:focus::after{opacity:1}.drop-indicator{position:absolute;left:0;right:0;height:2px;background:var(--primary-color);z-index:5;pointer-events:none}.drop-indicator span{position:absolute;right:5px;top:-22px;padding:3px 6px;border-radius:5px;background:var(--primary-color);color:var(--text-primary-color,#fff);font-size:11px;white-space:nowrap}.phase-chip{cursor:pointer}.phase-chip:hover{border-color:var(--primary-color);background:var(--primary-color);color:var(--text-primary-color,#fff)}.schedule-card.compact{padding:14px}.schedule-card.compact h3{margin:0 0 4px}.schedule-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.schedule-card-top-tools{display:flex;align-items:center;gap:8px}.schedule-toggle{padding:5px 8px;font-size:13px;line-height:1}.schedule-count{white-space:nowrap;font-size:12px}.schedule-entities{display:grid;gap:5px;margin-top:5px;font-size:12px}.schedule-entity-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:8px;min-width:0}.schedule-entity-name{min-width:0;overflow-wrap:anywhere}.schedule-entity-values{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px 10px;min-width:0;color:var(--secondary-text-color)}.schedule-entity-values b{color:var(--primary-text-color);font-weight:600}.schedule-entities-empty{margin:0}.schedule-summary{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;font-size:13px}.schedule-summary span{min-width:0}.schedule-override{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 0;font-size:12px;color:var(--warning-color,#b06a00)}.schedule-override button{padding:5px 8px;font-size:12px}.quick-mode-title{display:flex;justify-content:space-between;align-items:center;margin-top:14px;margin-bottom:7px;font-size:12px;font-weight:600}.quick-modes{display:flex;gap:7px;flex-wrap:wrap}.quick-mode{display:flex;align-items:center;gap:7px;min-width:132px;padding:8px 10px;border:1px solid var(--divider-color);border-radius:10px;background:var(--secondary-background-color);text-align:left;transition:transform .12s,box-shadow .12s,border-color .12s,background .12s}.quick-mode:not(:disabled):hover{transform:translateY(-1px);border-color:var(--primary-color);box-shadow:0 3px 10px color-mix(in srgb,var(--primary-color) 18%,transparent)}.quick-mode.active{border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 12%,var(--card-background-color));box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color) 18%,transparent)}.quick-mode.manual{background:color-mix(in srgb,var(--warning-color,#b06a00) 12%,var(--card-background-color));border-color:var(--warning-color,#b06a00)}.quick-mode:disabled{opacity:.5}.quick-mode-dot{width:10px;height:10px;flex:none;border-radius:50%;border:1px solid var(--divider-color)}.quick-mode-dot.default{background:var(--primary-color)}.quick-mode-icon{--mdc-icon-size:18px;color:var(--secondary-text-color);flex:none}.quick-mode-copy{display:grid;gap:2px;min-width:0}.quick-mode-copy strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.quick-mode-copy small{font-size:11px;color:var(--secondary-text-color)}.quick-mode-check{margin-left:auto;color:var(--primary-color);font-weight:700}.schedule-modes{margin:10px 0 0;font-size:12px}.assignment-tool-list{display:grid;gap:6px;margin-top:8px}.assignment-tool{display:flex;align-items:center;justify-content:space-between;gap:8px}.assignment-tool-actions{display:flex;gap:4px;flex-wrap:wrap}.assignment-tool-actions button{padding:5px 8px;font-size:12px}.compact-drop{padding:7px;margin-top:10px;font-size:12px}.mode-card{padding:12px}.mode-card h3{margin-bottom:6px}.mode-card .actions{margin-top:9px}.climate-picker{border:1px solid var(--divider-color);border-radius:10px;overflow:hidden;background:var(--card-background-color)}.climate-picker-search{border:0;border-bottom:1px solid var(--divider-color);border-radius:0}.climate-options{max-height:280px;overflow:auto}.climate-option{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:1px solid var(--divider-color);cursor:pointer}.climate-option:last-child{border-bottom:0}.climate-option:hover{background:color-mix(in srgb,var(--primary-color) 8%,var(--card-background-color))}.climate-option input{width:auto;margin-top:3px}.climate-option-copy{display:grid;gap:2px;min-width:0}.climate-option-copy strong{font-size:13px;overflow:hidden;text-overflow:ellipsis}.climate-option-copy small{font-size:11px;color:var(--secondary-text-color)}.climate-option-empty{padding:12px;margin:0}";
    style.textContent += ".mode-palette{position:sticky;top:12px;align-self:start;max-height:calc(100vh - 24px);overflow:auto;scrollbar-gutter:stable}@media(max-width:1100px){.mode-palette{position:static;max-height:none;overflow:visible}}";
    style.textContent += ".schedule-card{cursor:default}.segment-head{padding-right:25px}.segment-duplicate{position:absolute;z-index:4;top:3px;right:3px;width:24px;height:24px;padding:3px;border:0;background:color-mix(in srgb,var(--card-background-color) 72%,transparent);line-height:1}.segment-duplicate ha-icon{--mdc-icon-size:16px}.schedule-card-top-tools{align-items:flex-start}.schedule-card-icon-tools{display:grid;gap:4px}.schedule-toggle,.schedule-duplicate{width:30px;height:30px;padding:5px;font-size:13px;line-height:1}.schedule-duplicate ha-icon{--mdc-icon-size:18px}";
    style.textContent += ".external-badge{display:inline-block;margin-left:5px;padding:2px 6px;border-radius:999px;color:var(--warning-color,#b06a00);background:color-mix(in srgb,var(--warning-color,#b06a00) 14%,transparent);font-size:11px;font-weight:600}";
    style.textContent += ".climate-selector-field{min-height:56px}.climate-selector-label{display:block;margin-bottom:8px;font-size:13px}.climate-entity-picker-row+.climate-entity-picker-row{margin-top:8px}.climate-entity-add{display:block;margin-top:8px}";
    style.textContent += ".week-toolbar-main{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap}.week-used-modes{display:grid;gap:5px}.week-used-modes-label{font-size:12px;color:var(--secondary-text-color)}.week-mode-list{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.week-mode-chip,.week-mode-add{display:inline-flex;align-items:center;gap:5px;min-height:38px;padding:7px 9px;font-size:12px}.week-mode-chip.paused{opacity:.6}.week-mode-chip .quick-mode-dot{width:9px;height:9px}.week-mode-chip ha-icon{--mdc-icon-size:16px}.mode-day-grid{display:grid;grid-template-columns:repeat(7,minmax(92px,1fr));gap:7px}.mode-day-card{display:grid;align-content:start;gap:7px;padding:8px;border:1px solid var(--divider-color);border-radius:7px}.mode-day-card>label{display:flex;align-items:center;gap:5px;font-weight:600}.mode-day-card input[type=checkbox]{width:auto}.mode-day-times{display:grid;gap:5px}.mode-day-times[hidden]{display:none}.mode-day-times input{min-width:0;padding:7px}.fixed-weekday{display:block;padding:10px;border:1px solid var(--divider-color);border-radius:7px;background:var(--secondary-background-color)}@media(max-width:900px){.mode-day-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.mode-day-grid{grid-template-columns:1fr}}";
    style.textContent += ".schedule-card.drop-target{cursor:copy;animation:schedule-drop-ready .75s ease-in-out infinite alternate}.schedule-card.drop-invalid{cursor:not-allowed;border:2px solid var(--error-color,#db4437);background:color-mix(in srgb,var(--error-color,#db4437) 10%,var(--card-background-color));box-shadow:0 0 0 3px color-mix(in srgb,var(--error-color,#db4437) 18%,transparent)}.mode-drag-cursor{position:fixed;z-index:10000;display:flex;align-items:center;gap:8px;max-width:240px;padding:8px 11px;border:1px solid var(--divider-color);border-radius:12px;background:color-mix(in srgb,var(--card-background-color) 94%,transparent);box-shadow:0 8px 24px rgba(0,0,0,.24);opacity:0;transform:translate(18px,18px) scale(.92);pointer-events:none;transition:opacity .12s,transform .12s,border-color .12s,background .12s}.mode-drag-cursor.visible{opacity:1;transform:translate(18px,18px) scale(1)}.mode-drag-cursor.allowed{border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 12%,var(--card-background-color));animation:drag-cursor-float .7s ease-in-out infinite alternate}.mode-drag-cursor.blocked{border-color:var(--error-color,#db4437);color:var(--error-color,#db4437);background:color-mix(in srgb,var(--error-color,#db4437) 12%,var(--card-background-color))}.mode-drag-cursor ha-icon{--mdc-icon-size:24px;flex:none}.mode-drag-cursor.allowed ha-icon{animation:drag-cursor-icon .55s ease-in-out infinite alternate}.mode-drag-cursor-copy{display:grid;gap:1px;min-width:0}.mode-drag-cursor-copy strong,.mode-drag-cursor-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mode-drag-cursor-copy strong{font-size:12px}.mode-drag-cursor-copy small{font-size:11px;color:var(--secondary-text-color)}@keyframes schedule-drop-ready{from{box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color) 16%,transparent)}to{box-shadow:0 0 0 6px color-mix(in srgb,var(--primary-color) 28%,transparent)}}@keyframes drag-cursor-float{from{margin-top:0}to{margin-top:-5px}}@keyframes drag-cursor-icon{from{transform:translateY(-2px)}to{transform:translateY(2px)}}";
    style.textContent += ".mode-palette{position:static;max-height:none;overflow:visible}.mode-palette h2{margin:4px 0}.mode-palette #drag-hint{margin:0 0 8px;font-size:12px}.mode-palette .grid{grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px}.mode-palette .mode-card{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;column-gap:12px;row-gap:3px;min-height:58px;padding:10px 12px;cursor:grab}.mode-palette .mode-card-top{grid-column:1;grid-row:1}.mode-palette .mode-meta{grid-column:1;grid-row:2;min-width:0;flex-wrap:nowrap}.mode-palette .mode-priority{margin-left:0}.mode-palette .mode-card .actions{grid-column:2;grid-row:1/3;align-self:center;margin:0;flex-wrap:nowrap}.mode-palette .mode-card .actions button{padding:7px 9px;font-size:12px}main.overview-layout{height:100vh;overflow:hidden}main.overview-layout #schedules-section{display:flex;min-height:0;flex-direction:column}main.overview-layout #schedules-title{flex:none;margin:8px 0 10px}main.overview-layout #schedules{flex:1 1 auto;min-height:0;overflow-y:auto;align-content:start;padding:2px 10px 12px 2px;scrollbar-gutter:stable}@media(max-width:1100px){main.overview-layout{display:grid!important}}@media(max-width:700px){main.overview-layout{height:auto;min-height:100vh;overflow:visible;grid-template-rows:auto!important}main.overview-layout #schedules{overflow:visible}.mode-palette .grid{grid-template-columns:1fr}.mode-palette .mode-meta{flex-wrap:wrap}}";
    style.textContent += ".mode-palette .grid,#schedules{grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}@media(max-width:1100px){.mode-palette .grid,#schedules{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.mode-palette .grid,#schedules{grid-template-columns:1fr}}";
    this.shadowRoot.querySelector("header").style.gridArea = "header";
    this.$("notice").style.gridArea = "notice";
    summarySection.style.gridArea = "summary";
    schedulesSection.style.gridArea = "schedules";
    modesSection.style.gridArea = "modes";
    weekSection.style.gridArea = "week";
    this.$("refresh").title = this.t.connected;
    this.$("refresh").onclick = () => this.load();
    this.$("add-mode").onclick = () => this.openModeDialog();
    this.$("add-schedule").onclick = () => this.openScheduleDialog();
    this.$("dialog").addEventListener("click", (event) => { if (event.target === this.$("dialog")) this.closeDialog(); });
  }

  notice(message, error = false) {
    this.$("notice").textContent = message || "";
    this.$("notice").className = error ? "notice error" : "notice";
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
    this.notice(this.t.loading);
    try {
      this.data = await this._hass.callWS({ type: "climate_planner/data" });
      if (!this.data.schedules.some((schedule) => schedule.id === this.selectedSchedule)) {
        this.selectedSchedule = this.data.schedules[0]?.id || "";
      }
      this.storageSet("climate-planner-schedule", this.selectedSchedule);
      if (this.dragActive) this.pendingRender = true;
      else this.render();
      this.notice(this.t.connected);
    } catch (error) {
      this.notice(error?.code === "not_ready" ? error.message : this.t.saveError, true);
    }
  }

  cloneData() {
    return { modes: structuredClone(this.data.modes), schedules: structuredClone(this.data.schedules) };
  }

  async save(data) {
    try {
      await this._hass.callWS({ type: "climate_planner/configure", revision: this.data.revision, ...data });
      await this.load();
      this.closeDialog();
      return true;
    } catch (error) {
      if (error?.code === "conflict") { this.notice(this.t.conflict, true); await this.load(); }
      else this.notice(error?.code === "invalid_input" ? `${this.t.invalid} (${error.message || ""})` : this.t.saveError, true);
      return false;
    }
  }

  render() {
    const admin = Boolean(this._hass.user?.is_admin);
    const detail = this.detailOpen;
    const main = this.shadowRoot.querySelector("main");
    main.classList.toggle("overview-layout", !detail);
    main.style.gridTemplateAreas = detail ? '"header" "notice" "week"' : '"header" "notice" "modes" "schedules"';
    main.style.gridTemplateRows = detail ? "auto auto auto" : "auto auto auto minmax(0,1fr)";
    this.$("back-overview").hidden = !detail;
    this.$("back-overview").title = this.t.overview;
    this.$("summary-section").hidden = true;
    this.$("schedules-section").hidden = detail;
    this.$("modes-section").hidden = detail;
    this.$("week-section").hidden = !detail;
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
    target.innerHTML = sortedModes.map((mode) => `<article class="card mode-card" draggable="${admin}" data-mode-drag="${escapeHTML(mode.id)}"><div class="mode-card-top"><h3>${escapeHTML(mode.name)}</h3></div><div class="mode-meta">${mode.color ? `<span class="mode-color" style="background:${escapeHTML(mode.color)}"></span>` : ""}${mode.icon ? `<ha-icon class="mode-icon" icon="${escapeHTML(mode.icon)}" aria-label="${escapeHTML(mode.icon)}" title="${escapeHTML(mode.icon)}"></ha-icon>` : ""}<span>${escapeHTML(this.temperatureText(mode.target_temperature))}</span><span class="muted mode-priority">${escapeHTML(this.t.priority)} ${escapeHTML(mode.priority ?? 0)}</span></div>${admin ? `<div class="actions"><button data-action="edit-mode" data-id="${escapeHTML(mode.id)}">${this.t.edit}</button><button class="danger" data-action="delete-mode" data-id="${escapeHTML(mode.id)}">${this.t.remove}</button></div>` : ""}</article>`).join("");
    if (admin) this.$("modes").querySelectorAll("[data-mode-drag]").forEach((card) => {
      card.addEventListener("dragstart", (event) => {
        this.dragActive = true;
        this.dragState = { modeId: card.dataset.modeDrag };
        event.dataTransfer.setData("text/plain", `mode:${card.dataset.modeDrag}`);
        event.dataTransfer.effectAllowed = "copy";
        card.classList.add("dragging");
        this.createModeDragCursor(this.mode(card.dataset.modeDrag));
      });
      card.addEventListener("dragend", () => { card.classList.remove("dragging"); this.finishDrag(); });
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

  schedulePhases(schedule) {
    return Object.entries(schedule?.assignments || {}).flatMap(([assignmentIndex, assignment]) => Object.entries(assignment.weekday_rules || {}).flatMap(([weekday, phases]) => phases.map((phase, phaseIndex) => ({ assignment, assignmentIndex, weekday, phase, phaseIndex }))));
  }

  phaseEntry(schedule, phaseId) {
    return this.schedulePhases(schedule).find((entry) => this.phaseId(entry.phase) === phaseId);
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
      const lastActivated = this.data.last_activated?.[schedule.id];
      const lastActivatedMode = lastActivated ? this.mode(lastActivated.mode_id) : null;
      const phases = this.schedulePhases(schedule);
      const external = this.scheduleHasExternalTarget(schedule, lastActivated);
      const lastActivatedMarkup = lastActivated
        ? `${escapeHTML(lastActivatedMode?.name || lastActivated.mode_name)} · ${escapeHTML(this.temperatureText(lastActivated.target_temperature))}${external ? ` <span class="external-badge">${escapeHTML(this.t.external)}</span>` : ""}`
        : escapeHTML(this.t.none);
      const availableModes = [];
      schedule.assignments.forEach((assignment) => {
        const mode = this.mode(assignment.mode_id);
        if (mode && !availableModes.some((item) => item.mode.id === mode.id)) {
          availableModes.push({ mode, enabled: assignment.enabled, assignmentId: assignment.id });
        } else if (mode && assignment.enabled) {
          const existing = availableModes.find((item) => item.mode.id === mode.id);
          if (existing) existing.enabled = true;
        }
      });
      availableModes.sort((left, right) => left.mode.name.localeCompare(right.mode.name, this._hass?.language, { sensitivity: "base" }));
      const modeButtonMarkup = availableModes.map(({ mode, enabled, assignmentId }) => {
        const selected = lastActivated?.mode_id === mode.id;
        const dot = mode.color ? `<span class="quick-mode-dot" style="background:${escapeHTML(mode.color)}"></span>` : "<span class=\"quick-mode-dot default\"></span>";
        const icon = mode.icon ? `<ha-icon class="quick-mode-icon" icon="${escapeHTML(mode.icon)}" aria-hidden="true"></ha-icon>` : "";
        const check = selected ? `<span class="quick-mode-check">✓</span>` : "";
        const toggle = admin ? `<button type="button" class="assignment-toggle" data-action="toggle-schedule-mode" data-schedule="${escapeHTML(schedule.id)}" data-id="${escapeHTML(mode.id)}" aria-pressed="${enabled}" aria-label="${escapeHTML(enabled ? this.t.pauseMode : this.t.activateMode)}" title="${escapeHTML(enabled ? this.t.pauseMode : this.t.activateMode)}">${enabled ? "⏸" : "▶"}</button>` : "";
        const remove = admin && assignmentId ? `<button type="button" class="assignment-delete" data-action="delete-assignment" data-schedule="${escapeHTML(schedule.id)}" data-id="${escapeHTML(assignmentId)}" aria-label="${escapeHTML(this.t.deleteAssignment)}" title="${escapeHTML(this.t.remove)}"><ha-icon icon="mdi:trash-can-outline" aria-hidden="true"></ha-icon></button>` : "";
        const tools = toggle || remove ? `<div class="assignment-tools">${toggle}${remove}</div>` : "";
        return `<div class="quick-mode-wrap ${selected ? "active" : ""} ${enabled ? "" : "paused"}"><button type="button" class="quick-mode" data-action="activate-mode" data-schedule="${escapeHTML(schedule.id)}" data-id="${escapeHTML(mode.id)}" ${admin ? "" : "disabled"}>${dot}${icon}<span class="quick-mode-copy"><strong>${escapeHTML(mode.name)}</strong><small>${escapeHTML(this.temperatureText(mode.target_temperature))}</small></span>${check}</button>${tools}</div>`;
      }).join("");
      const modeButtons = availableModes.length ? `<div class="quick-mode-title"><span>${this.t.chooseMode}</span></div><div class="quick-modes" aria-label="${escapeHTML(this.t.chooseMode)}">${modeButtonMarkup}</div>` : "";
      const scheduleToggle = admin ? `<button type="button" class="schedule-toggle" data-action="toggle-schedule" data-schedule="${escapeHTML(schedule.id)}" aria-pressed="${schedule.enabled}" aria-label="${escapeHTML(schedule.enabled ? this.t.pauseSchedule : this.t.activateSchedule)}" title="${escapeHTML(schedule.enabled ? this.t.pauseSchedule : this.t.activateSchedule)}">${schedule.enabled ? "⏸" : "▶"}</button>` : "";
      const scheduleDuplicate = admin ? `<button type="button" class="schedule-duplicate" data-action="duplicate-schedule" data-id="${escapeHTML(schedule.id)}" aria-label="${escapeHTML(this.t.duplicate)}" title="${escapeHTML(this.t.duplicate)}"><ha-icon icon="mdi:content-copy" aria-hidden="true"></ha-icon></button>` : "";
      return `<article class="card schedule-card compact ${schedule.id === this.selectedSchedule ? "selected" : ""}" data-schedule-card="${escapeHTML(schedule.id)}"><div class="schedule-card-top"><div><h3>${escapeHTML(schedule.name)} <span class="status-dot ${schedule.enabled ? "" : "off"}" aria-label="${escapeHTML(schedule.enabled ? this.t.enabled : this.t.unavailable)}">${schedule.enabled ? "●" : "○"}</span></h3><div class="schedule-entities">${this.climateEntityRows(schedule.climate_entity_ids)}</div></div><div class="schedule-card-top-tools"><span class="muted schedule-count">${phases.length} ${this.t.phase}</span>${admin ? `<div class="schedule-card-icon-tools">${scheduleToggle}${scheduleDuplicate}</div>` : ""}</div></div><div class="schedule-summary"><span><strong>${this.t.lastActivated}:</strong> ${lastActivatedMarkup}</span><span class="muted"><strong>${this.t.next}:</strong> ${escapeHTML(this.formatDate(this.data.next_events?.[schedule.id]))}</span></div>${modeButtons}<div class="actions"><button data-action="open-schedule-details" data-schedule="${escapeHTML(schedule.id)}">${this.t.details}</button>${admin ? `<button data-action="edit-schedule" data-id="${escapeHTML(schedule.id)}">${this.t.edit}</button><button class="danger" data-action="delete-schedule" data-id="${escapeHTML(schedule.id)}">${this.t.remove}</button>` : ""}</div></article>`;
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
        await this.handleAction(button.dataset.action, button.dataset.id, button.dataset.schedule);
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
      const segments = day.segments.map((segment, segmentIndex) => {
        const startText = `${String(Math.floor(segment.start / 60)).padStart(2, "0")}:${String(segment.start % 60).padStart(2, "0")}`;
        const endText = `${String(Math.floor(segment.end / 60)).padStart(2, "0")}:${String(segment.end % 60).padStart(2, "0")}`;
        const duplicate = admin && segment.phase_id
          ? `<button type="button" class="segment-duplicate" data-duplicate-phase aria-label="${escapeHTML(this.t.duplicate)}" title="${escapeHTML(this.t.duplicate)}" draggable="false"><ha-icon icon="mdi:content-copy" aria-hidden="true"></ha-icon></button>`
          : "";
        const transitionPhaseId = schedule ? this.phaseForSegmentStart(schedule, day.weekday, segment) : "";
        const previousSegment = day.segments[segmentIndex - 1];
        const nextSegment = day.segments[segmentIndex + 1];
        const minimumStart = previousSegment ? previousSegment.start + 15 : 0;
        const maximumStart = nextSegment ? nextSegment.start - 15 : 1439;
        const transition = admin && transitionPhaseId
          ? `<span class="transition-handle" data-phase-id="${escapeHTML(transitionPhaseId)}" data-segment-day="${escapeHTML(day.weekday)}" data-min-start="${minimumStart}" data-max-start="${maximumStart}" style="top:${(segment.start / 1440) * 100}%" tabindex="0" title="${escapeHTML(this.t.transition)}" draggable="false"></span>`
          : "";
        return `<div class="segment" draggable="${admin && Boolean(segment.phase_id)}" data-phase-id="${escapeHTML(segment.phase_id || "")}" data-segment-day="${escapeHTML(day.weekday)}" data-segment-start="${segment.start}" data-segment-end="${segment.end}" style="top:${(segment.start / 1440) * 100}%;height:${((segment.end - segment.start) / 1440) * 100}%;${segment.color ? `border-left-color:${escapeHTML(segment.color)};background:color-mix(in srgb,${escapeHTML(segment.color)} 20%,var(--card-background-color))` : ""}">${duplicate}<div class="segment-head">${segment.icon ? `<ha-icon class="segment-icon" icon="${escapeHTML(segment.icon)}"></ha-icon>` : ""}<strong>${escapeHTML(segment.mode_name)}</strong></div><small>${escapeHTML(this.temperatureText(segment.target_temperature))}</small><small class="segment-time">${escapeHTML(startText)}–${escapeHTML(endText)}</small></div>${transition}`;
      }).join("");
      const nowLine = view.current_weekday === day.weekday && view.current_minute != null
        ? `<div class="now-line" style="top:${(view.current_minute / 1440) * 100}%" title="now"></div>`
        : "";
      return `<section class="day-column"><h3>${escapeHTML(this.t[day.weekday])}</h3><div class="day-track" data-drop-day="${escapeHTML(day.weekday)}"><div class="drop-indicator" hidden><span></span></div>${segments}${nowLine}<div class="time-labels"><span style="top:0">00:00</span><span style="top:25%">06:00</span><span style="top:50%">12:00</span><span style="top:75%">18:00</span></div></div></section>`;
    }).join("") || "";
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
      return admin
        ? `<button type="button" class="week-mode-chip ${enabled ? "" : "paused"}" draggable="true" data-edit-assignment="${escapeHTML(assignmentId)}" data-assignment-drag="${escapeHTML(assignmentId)}" title="${escapeHTML(this.t.editAssignment)}">${content}</button>`
        : `<span class="week-mode-chip ${enabled ? "" : "paused"}">${content}</span>`;
    }).join("");
    const assignedModeIds = new Set(usedModes.map((item) => item.mode.id));
    const addModeButton = admin && this.data.modes.some((mode) => !assignedModeIds.has(mode.id))
      ? `<button type="button" class="week-mode-add" data-add-assignment>＋ ${escapeHTML(this.t.addAssignment)}</button>`
      : "";
    const modeToolbar = schedule
      ? `<div class="week-used-modes"><span class="week-used-modes-label">${escapeHTML(this.t.usedModes)}</span><div class="week-mode-list">${usedModeMarkup}${addModeButton}</div></div>`
      : "";
    target.innerHTML = `<div class="week-toolbar"><div class="week-toolbar-main"><label>${this.t.selectSchedule}<select id="week-select">${this.data.schedules.map((schedule) => `<option value="${escapeHTML(schedule.id)}" ${schedule.id === this.selectedSchedule ? "selected" : ""}>${escapeHTML(schedule.name)}</option>`).join("")}</select></label>${modeToolbar}</div><p class="muted timeline-hint">${admin ? this.t.dropTimeline : ""}</p></div>${view ? `<div class="week-scroll"><div class="week-grid">${days}</div></div>` : `<p class="empty">${this.t.noWeek}</p>`}`;
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
    target.querySelector("[data-add-assignment]")?.addEventListener("click", () => this.openAssignmentDialog(this.selectedSchedule));
    target.querySelectorAll(".segment[data-phase-id]").forEach((segment) => {
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
    const snapped = Math.round(minutes / 15) * 15;
    const value = Math.min(1439, snapped);
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
    const value = Math.max(0, Math.min(1439, Math.round(minutes / 15) * 15));
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
    dialog.innerHTML = `<form method="dialog" class="dialog-form"><h2>${phaseId ? this.t.editPhase : this.t.placeDuplicate}</h2>${duplicateTemplate ? `<p class="muted">${escapeHTML(this.t.duplicateTimeOccupied)}</p>` : ""}<div class="form-grid"><label>${this.t.modes}<select name="mode_id">${this.data.modes.map((item) => `<option value="${escapeHTML(item.id)}" ${item.id === mode?.id ? "selected" : ""}>${escapeHTML(item.name)} · ${escapeHTML(this.temperatureText(item.target_temperature))}</option>`).join("")}</select></label><label>${this.t.time}<input name="time" type="time" required step="900" value="${escapeHTML(currentTime)}"><small class="muted">${this.t.defaultDuration}</small></label><label>${this.t.temperature}<input name="target_temperature" type="number" step="0.1" value="${currentTemperature == null ? "" : escapeHTML(this.displayTemperature(currentTemperature))}" placeholder="${escapeHTML(this.temperatureText(mode?.target_temperature))}"><small class="muted">${this.t.localTemperature}</small></label><label>${this.t.weekday}<span class="fixed-weekday">${escapeHTML(this.t[currentWeekday])}</span></label></div><div class="dialog-actions">${phaseId ? `<button type="button" class="danger" data-delete-phase>${this.t.remove}</button>` : ""}<button type="button" data-cancel>${this.t.cancel}</button><button class="primary" type="submit">${this.t.save}</button></div></form>`;
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
        targetAssignment = { id: newId("assignment"), mode_id: selectedModeId, enabled: true, weekday_rules: {} };
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
    const assignedModeIds = new Set(schedule.assignments.filter((item) => item.id !== assignmentId).map((item) => item.mode_id));
    const selectableModes = this.data.modes.filter((mode) => mode.id === assignment?.mode_id || !assignedModeIds.has(mode.id));
    if (!selectableModes.length) return this.notice(this.t.modeAlreadyAssigned, true);
    const selectedMode = this.mode(assignment?.mode_id || normalizedModeId) || selectableModes[0];
    const phaseEntries = assignment
      ? this.schedulePhases(schedule).filter((item) => item.assignment.id === assignment.id)
      : [];
    const firstTime = phaseEntries[0] ? this.phaseTime(phaseEntries[0].phase) : initialTime;
    const overrides = phaseEntries.map((item) => typeof item.phase === "object" ? item.phase.target_temperature : undefined);
    const sharedOverride = overrides.length && overrides.every((value) => value === overrides[0]) ? overrides[0] : undefined;
    const initialDay = DAYS.includes(initialWeekday) ? initialWeekday : null;
    const dayMarkup = DAYS.map((day) => {
      const dayEntries = phaseEntries.filter((item) => item.weekday === day);
      const checked = dayEntries.length > 0 || (!assignment && (!initialDay || day === initialDay));
      const timeEntries = dayEntries.length ? dayEntries : [{ phase: null }];
      const timeLabel = `${this.t[day]} ${this.t.time}`;
      return `<div class="mode-day-card" data-mode-day="${escapeHTML(day)}"><label><input type="checkbox" data-day-enabled ${checked ? "checked" : ""}>${escapeHTML(this.t[day])}</label><div class="mode-day-times" data-day-times ${checked ? "" : "hidden"}>${timeEntries.map((entry) => `<input type="time" step="900" required data-day-time data-phase-id="${escapeHTML(entry.phase ? this.phaseId(entry.phase) : "")}" value="${escapeHTML(entry.phase ? this.phaseTime(entry.phase) : firstTime)}" aria-label="${escapeHTML(timeLabel)}" ${checked ? "" : "disabled"}>`).join("")}</div></div>`;
    }).join("");
    const dialog = this.$("dialog"); this.dialogKind = "assignment"; this.dialogContext = { scheduleId, assignmentId };
    dialog.innerHTML = `<form method="dialog" class="dialog-form"><h2>${assignment ? this.t.editAssignment : this.t.addAssignment}</h2><div class="form-grid"><label>${this.t.modes}<select name="mode_id">${selectableModes.map((item) => `<option value="${escapeHTML(item.id)}" ${item.id === selectedMode.id ? "selected" : ""}>${escapeHTML(item.name)} · ${escapeHTML(this.temperatureText(item.target_temperature))}</option>`).join("")}</select></label><label>${this.t.bulkTime}<input name="bulk_time" type="time" required step="900" value="${escapeHTML(firstTime)}"><small class="muted">${this.t.defaultDuration}</small></label><label>${this.t.temperature}<input name="target_temperature" type="number" step="0.1" value="${sharedOverride == null ? "" : escapeHTML(this.displayTemperature(sharedOverride))}" placeholder="${escapeHTML(this.temperatureText(selectedMode.target_temperature))}"><small class="muted">${this.t.localTemperature}</small></label><fieldset class="full"><legend>${this.t.weekdays}</legend><div class="mode-day-actions"><button type="button" data-select-days="all">${escapeHTML(this.t.selectAllDays)}</button><button type="button" data-select-days="none">${escapeHTML(this.t.clearAllDays)}</button></div><div class="mode-day-grid">${dayMarkup}</div></fieldset></div><div class="dialog-actions"><button type="button" data-cancel>${this.t.cancel}</button><button class="primary" type="submit">${this.t.save}</button></div></form>`;
    const form = dialog.querySelector("form");
    const bulkTime = form.elements.bulk_time;
    const temperature = form.elements.target_temperature;
    let temperatureTouched = false;
    const updateDayCard = (card, copyBulkTime = false) => {
      const checked = card.querySelector("[data-day-enabled]").checked;
      const times = card.querySelector("[data-day-times]");
      const inputs = [...times.querySelectorAll("[data-day-time]")];
      times.hidden = !checked;
      inputs.forEach((input, index) => {
        input.disabled = !checked;
        if (checked && copyBulkTime && index === 0) input.value = bulkTime.value;
        input.setCustomValidity("");
      });
    };
    dialog.querySelectorAll("[data-mode-day]").forEach((card) => {
      card.querySelector("[data-day-enabled]").addEventListener("change", () => updateDayCard(card));
      card.querySelectorAll("[data-day-time]").forEach((input) => input.addEventListener("input", () => input.setCustomValidity("")));
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
      const selectedCards = [...dialog.querySelectorAll("[data-mode-day]")].filter((card) => card.querySelector("[data-day-enabled]").checked);
      if (!selectedCards.length) return this.notice(this.t.missingDay, true);
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
        targetAssignment = { id: newId("assignment"), mode_id: form.elements.mode_id.value, enabled: true, weekday_rules: {} };
        targetSchedule.assignments.push(targetAssignment);
      }
      targetAssignment.mode_id = form.elements.mode_id.value;
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
    dialog.showModal(); form.querySelector("select")?.focus();
  }

  async handleAction(action, id, scheduleId) {
    if (action === "edit-mode") return this.openModeDialog(id);
    if (action === "delete-mode") return this.deleteMode(id);
    if (action === "activate-mode") return this.activateMode(scheduleId, id);
    if (action === "clear-override") return this.clearManualOverride(scheduleId);
    if (action === "open-schedule-details") return this.openScheduleDetails(scheduleId || id);
    if (action === "duplicate-schedule") return this.duplicateSchedule(id);
    if (action === "edit-schedule") return this.openScheduleDialog(id);
    if (action === "delete-schedule") return this.deleteSchedule(id);
    if (action === "add-assignment") return this.openAssignmentDialog(scheduleId);
    if (action === "edit-assignment") return this.openAssignmentDialog(scheduleId, id);
    if (action === "delete-assignment") return this.deleteAssignment(scheduleId, id);
    if (action === "toggle-assignment") return this.toggleAssignment(scheduleId, id);
    if (action === "toggle-schedule-mode") return this.toggleScheduleMode(scheduleId, id);
    if (action === "toggle-schedule") return this.toggleSchedule(scheduleId);
  }

  async activateMode(scheduleId, modeId) {
    if (!this._hass.user?.is_admin) return;
    try {
      await this._hass.callWS({ type: "climate_planner/activate_mode", schedule_id: scheduleId, mode_id: modeId });
      await this.load();
    } catch (error) {
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
    if (!await this.save(next)) return;
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
    dialog.innerHTML = `<form method="dialog" class="dialog-form"><h2>${modeId ? this.t.edit : this.t.addMode}</h2><div class="form-grid"><label>${this.t.name}<input name="name" required maxlength="160" value="${escapeHTML(mode.name)}"></label><label>${this.t.temperature}<span class="input-with-unit"><input name="target_temperature" type="number" step="0.1" required value="${escapeHTML(this.displayTemperature(mode.target_temperature))}" aria-label="${escapeHTML(this.t.temperature)}"><span class="unit-suffix">${unit}</span></span></label><label>${this.t.priority}<input name="priority" type="number" step="1" required value="${escapeHTML(mode.priority ?? 0)}"></label><label class="full">${this.t.color}<span class="color-controls"><input name="color_picker" type="color" value="${escapeHTML(initialColor)}" aria-label="${escapeHTML(this.t.color)}"><input name="color_hex" pattern="^#[0-9a-fA-F]{6}$" value="${escapeHTML(mode.color || "")}" placeholder="#4caf50" aria-label="${escapeHTML(this.t.hexColor)}"></span></label><label class="full">${this.t.icon}<ha-icon-picker id="mode-icon-picker"></ha-icon-picker><input name="icon_text" pattern="^mdi:[a-z0-9-]+$" value="${escapeHTML(mode.icon || "")}" placeholder="${escapeHTML(this.t.iconPlaceholder)}" aria-label="${escapeHTML(this.t.icon)}"></label></div><div class="dialog-actions"><button type="button" data-cancel>${this.t.cancel}</button><button class="primary" type="submit">${this.t.save}</button></div></form>`;
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

  climateEntityLabel(entityId) {
    return this.climateEntityInfo(entityId)?.label || entityId;
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

  scheduleHasExternalTarget(schedule, lastActivated) {
    const requested = Number(lastActivated?.target_temperature);
    if (!Number.isFinite(requested)) return false;
    const entityIds = schedule.climate_entity_ids || [];
    return entityIds.some((entityId) => {
      const entityTarget = this.climateEntityTemperatureValue(entityId, "temperature", "target_temperature");
      return entityTarget != null
        && Math.abs(entityTarget - requested) > this.targetTemperatureTolerance(entityId);
    });
  }

  climateEntityRows(entityIds) {
    const ids = Array.isArray(entityIds) ? entityIds : entityIds ? [entityIds] : [];
    if (!ids.length) return `<p class="muted schedule-entities-empty">${this.t.noClimate}</p>`;
    return ids.map((entityId) => `<div class="schedule-entity-row"><span class="schedule-entity-name">${escapeHTML(this.climateEntityLabel(entityId))}</span><span class="schedule-entity-values"><span><b title="${escapeHTML(this.t.targetRequest)}">${escapeHTML(this.t.targetRequestShort)}</b> ${escapeHTML(this.climateEntityTemperature(entityId, "temperature", "target_temperature"))}</span><span><b title="${escapeHTML(this.t.targetFeedback)}">${escapeHTML(this.t.targetFeedbackShort)}</b> ${escapeHTML(this.climateEntityTemperature(entityId, "target_temperature", "reported_target_temperature"))}</span><span><b>${escapeHTML(this.t.currentShort)}</b> ${escapeHTML(this.climateEntityTemperature(entityId, "current_temperature"))}</span></span></div>`).join("");
  }

  openScheduleDialog(scheduleId = null) {
    if (!this._hass.user?.is_admin) return;
    const schedule = scheduleId ? this.data.schedules.find((item) => item.id === scheduleId) : { name: "", climate_entity_ids: [], enabled: true, assignments: [] };
    let selectedEntityIds = [...(schedule.climate_entity_ids || [schedule.climate_entity_id].filter(Boolean))];
    const entities = this.climateEntities(); const dialog = this.$("dialog"); this.dialogKind = "schedule"; this.dialogContext = scheduleId;
    dialog.innerHTML = `<form method="dialog" class="dialog-form"><h2>${scheduleId ? this.t.edit : this.t.addSchedule}</h2><div class="form-grid"><label>${this.t.name}<input name="name" required maxlength="160" value="${escapeHTML(schedule.name)}"></label><label>${this.t.enabled}<input name="enabled" type="checkbox" ${schedule.enabled ? "checked" : ""}></label><div class="full climate-selector-field"><span class="climate-selector-label">${escapeHTML(this.t.climate)}</span><div id="climate-entity-selector"></div></div></div><div class="dialog-actions"><button type="button" data-cancel>${this.t.cancel}</button><button class="primary" type="submit">${this.t.save}</button></div></form>`;
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
          if (!value) selectedEntityIds.splice(index, 1);
          else if (typeof value === "string" && value.startsWith("climate.") && !otherSelected.has(value)) selectedEntityIds[index] = value;
          renderEntityPickers();
        });
        row.append(picker);
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
    dialog.querySelector("form").onsubmit = async (event) => { event.preventDefault(); const form = event.currentTarget; if (!selectedEntityIds.length) return this.notice(this.t.noClimate, true); const next = this.cloneData(); const item = { id: scheduleId || newId("schedule"), name: form.elements.name.value, climate_entity_ids: selectedEntityIds, enabled: form.elements.enabled.checked, assignments: schedule.assignments || [] }; next.schedules = [...next.schedules.filter((current) => current.id !== scheduleId), item]; await this.save(next); };
    if (!entities.length) this.notice(this.t.noClimate, true);
    dialog.showModal(); dialog.querySelector("input")?.focus();
  }

  openAssignmentDialog(scheduleId, assignmentId = null, draggedModeId = null, initialWeekday = null, initialTime = "06:00") {
    this.openModeScheduleDialog(scheduleId, assignmentId, draggedModeId, initialWeekday, initialTime);
  }

  closeDialog() { const dialog = this.$("dialog"); if (dialog.open) dialog.close(); dialog.innerHTML = ""; this.dialogKind = null; this.dialogContext = null; }
}

if (!customElements.get("climate-planner-panel")) customElements.define("climate-planner-panel", ClimatePlannerPanel);

