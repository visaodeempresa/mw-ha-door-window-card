/* mw-ha-door-window-card — custom:mw-door-window-card
 * Card de porta/janela: ícone + nome + estado + bateria, tudo configurável
 * pelo editor visual. Port fiel do button-card de porta do dono (grade
 * "i n battery" / "i s battery", vidro/gradiente, bateria girada 90°).
 * JS puro + <ha-form>, arquivo único, sem build.
 * Repo: https://github.com/visaodeempresa/mw-ha-door-window-card
 * Releases automáticas: merge na main → bump semântico → tag → HACS.
 */
(() => {
  "use strict";

  const DEFAULTS = {
    // --- entidades ---
    device: "",
    entity: "",
    battery_entity: "",
    battery_auto: true,
    // --- conteúdo ---
    name: "",                 // vazio = friendly_name da entidade
    show_name: true,
    show_state: true,
    show_icon: true,
    show_battery: true,
    invert: false,            // sensor invertido (on = fechado)
    icon_open: "",            // vazio = automático pelo device_class
    icon_closed: "",
    icon_unavailable: "mdi:help-rhombus-outline",
    text_open: "",            // vazio = tradução do próprio HA
    text_closed: "",
    text_unavailable: "",
    secondary_info: "none",   // none | last-changed
    // --- geometria ---
    icon_size: 32,
    name_size: 10,
    state_size: 12,
    battery_size: 13,
    border_radius: 10,
    padding: 4,
    height: "",               // vazio = altura automática
    gap: 5,                   // recuo do texto em relação ao ícone
    // --- efeitos ---
    gradient: true,
    shadow: true,
    lift: true,
    // --- cores ---
    color_open_bg: "rgba(154, 205, 50, 0.8)",
    color_open_border: "rgba(154, 205, 50, 1)",
    color_closed_bg: "rgba(255, 99, 71, 0.8)",
    color_closed_border: "rgba(255, 99, 71, 1)",
    color_unavailable_bg: "rgba(120, 120, 120, 0.55)",
    color_unavailable_border: "rgba(160, 160, 160, 0.9)",
    color_name: "#ffffff",
    color_state: "rgba(0, 0, 0, 0.7)",
    color_icon: "#ffffff",
    color_battery_text: "#ffffff",
    // --- bateria ---
    battery_rotate: true,
    battery_show_percent: true,
    battery_icon_size: 20,
    battery_low: 20,
    battery_medium: 50,
    battery_high: 70,
    color_battery_low: "#e53935",
    color_battery_medium: "#fdd835",
    color_battery_high: "#9ccc65",
    color_battery_full: "#43a047",
    // --- ações ---
    tap_action: "more-info",
    hold_action: "none",
    double_tap_action: "none",
    navigation_path: "",
    url_path: "",
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // número vira px; string com unidade ("2em", "40%") passa direto; vazio = automático
  const px = (v) => {
    if (v === "" || v === null || v === undefined) return "";
    const s = String(v).trim();
    return /^-?\d+(\.\d+)?$/.test(s) ? `${s}px` : s;
  };

  // classes de dispositivo que contam como porta/janela
  const DW_CLASSES = ["door", "window", "garage_door", "opening"];

  // ícone automático por device_class: [aberto, fechado]
  const DW_ICONS = {
    door: ["mdi:door-open", "mdi:door-closed"],
    window: ["mdi:window-open", "mdi:window-closed"],
    garage_door: ["mdi:garage-open", "mdi:garage"],
    opening: ["mdi:door-open", "mdi:door-closed"],
  };

  // ícone da bateria por faixa de 10% (mesma escala do mdi)
  const batteryIcon = (v) => {
    if (v >= 95) return "mdi:battery";
    if (v < 5) return "mdi:battery-outline";
    const step = Math.max(10, Math.floor(v / 10) * 10);
    return `mdi:battery-${step}`;
  };

  const relTime = (iso) => {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "";
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return `há ${s}s`;
    if (s < 3600) return `há ${Math.round(s / 60)}min`;
    if (s < 86400) return `há ${Math.round(s / 3600)}h`;
    return `há ${Math.round(s / 86400)}d`;
  };

  /* ---------- descoberta de entidades (usada pelo card e pelo editor) ---------- */

  const isDoorWindow = (hass, id) =>
    id.startsWith("binary_sensor.") &&
    DW_CLASSES.includes(hass.states[id]?.attributes?.device_class);

  const isBattery = (hass, id) =>
    hass.states[id]?.attributes?.device_class === "battery";

  const friendly = (hass, id) => hass.states[id]?.attributes?.friendly_name || id;

  // device_id de uma entidade, quando o registro está disponível no hass
  const deviceOf = (hass, id) => hass?.entities?.[id]?.device_id || "";

  const deviceName = (hass, devId) => {
    const d = hass?.devices?.[devId];
    if (!d) return devId;
    const area = d.area_id && hass.areas?.[d.area_id]?.name;
    return (d.name_by_user || d.name || devId) + (area ? ` · ${area}` : "");
  };

  // dispositivos que têm ao menos uma entidade porta/janela
  const doorWindowDevices = (hass) => {
    if (!hass?.entities || !hass?.devices) return [];
    const ids = new Set();
    for (const id of Object.keys(hass.states)) {
      if (!isDoorWindow(hass, id)) continue;
      const d = deviceOf(hass, id);
      if (d) ids.add(d);
    }
    return [...ids]
      .map((d) => ({ value: d, label: deviceName(hass, d) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  };

  // entidades porta/janela — do dispositivo escolhido; sem dispositivo, todas.
  // Sem nenhuma (integração exótica), cai para todos os binary_sensor.
  const doorWindowEntities = (hass, devId) => {
    const all = Object.keys(hass.states).filter((id) => isDoorWindow(hass, id));
    let list = all;
    if (devId) {
      const own = all.filter((id) => deviceOf(hass, id) === devId);
      if (own.length) list = own;
    }
    if (!list.length) list = Object.keys(hass.states).filter((id) => id.startsWith("binary_sensor."));
    return list
      .map((id) => ({ value: id, label: `${friendly(hass, id)} (${id})` }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  };

  // sensores do mesmo dispositivo da porta/janela; sem dispositivo conhecido,
  // todos os sensores de bateria; em último caso, todos os sensores.
  const batteryEntities = (hass, devId, entityId) => {
    const dev = devId || deviceOf(hass, entityId);
    // a própria porta/janela não é candidata a bateria
    const isSensor = (id) => (id.startsWith("sensor.") || id.startsWith("binary_sensor.")) &&
      id !== entityId && !isDoorWindow(hass, id);
    let list = [];
    if (dev && hass.entities) {
      list = Object.keys(hass.entities).filter(
        (id) => hass.entities[id].device_id === dev && isSensor(id) && hass.states[id]);
    }
    if (!list.length) list = Object.keys(hass.states).filter((id) => isBattery(hass, id));
    if (!list.length) list = Object.keys(hass.states).filter((id) => id.startsWith("sensor."));
    return list
      .map((id) => ({ value: id, label: `${friendly(hass, id)} (${id})` }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  };

  // bateria automática: mesma device_id; sem registro, tenta pelo entity_id
  const autoBattery = (hass, entityId) => {
    const dev = deviceOf(hass, entityId);
    if (dev && hass.entities) {
      const found = Object.keys(hass.entities).find(
        (id) => hass.entities[id].device_id === dev && isBattery(hass, id) && hass.states[id]);
      if (found) return found;
    }
    const base = String(entityId).split(".")[1] || "";
    for (const suf of ["_bateria", "_battery", "_battery_level", "_nivel_da_bateria"]) {
      if (hass.states[`sensor.${base}${suf}`]) return `sensor.${base}${suf}`;
    }
    return Object.keys(hass.states).find(
      (id) => id.startsWith("sensor.") && isBattery(hass, id) && id.includes(base)) || "";
  };

  /* ------------------------------- CARD ------------------------------- */

  class MwDoorWindowCard extends HTMLElement {
    setConfig(config) {
      if (!config || !config.entity) {
        throw new Error("mw-door-window-card: defina a propriedade 'entity'");
      }
      this._config = { ...DEFAULTS, ...config };
      this._key = null;
      if (this._hass) this._render();
    }

    set hass(hass) {
      this._hass = hass;
      if (!this._config) return;
      const st = hass.states[this._config.entity];
      const bat = this._batteryEntity();
      const bst = bat ? hass.states[bat] : null;
      const key = [st ? st.state : "·", st ? st.last_changed : "", bst ? bst.state : "·"].join("|");
      if (key !== this._key) { this._key = key; this._render(); }
    }

    connectedCallback() {
      // "há 5min" envelhece sozinho: sem tique de 1 min o texto congela
      if (this._config?.secondary_info === "last-changed" && !this._tick) {
        this._tick = setInterval(() => { if (this._hass) this._render(); }, 60000);
      }
    }

    disconnectedCallback() {
      if (this._tick) { clearInterval(this._tick); this._tick = null; }
    }

    getCardSize() { return 1; }

    static getConfigElement() { return document.createElement("mw-door-window-card-editor"); }

    static getStubConfig(hass) {
      const first = Object.keys(hass?.states || {}).find((id) => isDoorWindow(hass, id)) || "";
      return { entity: first };
    }

    _batteryEntity() {
      const c = this._config;
      if (c.battery_entity) return c.battery_entity;
      if (c.battery_auto === false || !this._hass) return "";
      if (this._autoBat === undefined || this._autoBatFor !== c.entity) {
        this._autoBatFor = c.entity;
        this._autoBat = autoBattery(this._hass, c.entity);
      }
      return this._autoBat;
    }

    _stateText(st, open, dead) {
      const c = this._config;
      if (dead) return c.text_unavailable || "Indisponível";
      if (open && c.text_open) return c.text_open;
      if (!open && c.text_closed) return c.text_closed;
      try {
        if (this._hass.formatEntityState) return this._hass.formatEntityState(st);
      } catch (e) { /* HA antigo: cai para a tradução manual */ }
      const dc = st?.attributes?.device_class || "door";
      const key = `component.binary_sensor.entity_component.${dc}.state.${st.state}`;
      return this._hass.localize?.(key) || (open ? "Aberto" : "Fechado");
    }

    _batteryHtml() {
      const c = this._config;
      const id = this._batteryEntity();
      const raw = id ? this._hass.states[id]?.state : undefined;
      const v = Number.parseFloat(raw);
      const size = px(c.battery_icon_size) || "20px";
      if (!Number.isFinite(v)) {
        return `<span class="bt"><span class="bp">--%</span>
          <ha-icon icon="mdi:battery-unknown" style="color:rgba(255,255,255,0.75);
            width:${size};height:${size};--mdc-icon-size:${size};"></ha-icon></span>`;
      }
      const color = v <= c.battery_low ? c.color_battery_low
        : v <= c.battery_medium ? c.color_battery_medium
        : v <= c.battery_high ? c.color_battery_high
        : c.color_battery_full;
      const pct = c.battery_show_percent === false ? ""
        : `<span class="bp">${Math.round(v)}%</span>`;
      return `<span class="bt">${pct}
        <ha-icon icon="${esc(batteryIcon(v))}" style="color:${esc(color)};
          width:${size};height:${size};--mdc-icon-size:${size};
          filter:drop-shadow(0 1px 1px rgba(0,0,0,0.30));"></ha-icon></span>`;
    }

    _render() {
      const c = this._config;
      const st = this._hass.states[c.entity];
      const state = st ? st.state : "unavailable";
      const dead = !st || state === "unavailable" || state === "unknown";
      const open = c.invert ? state === "off" : state === "on";

      const dc = st?.attributes?.device_class || "door";
      const pair = DW_ICONS[dc] || DW_ICONS.door;
      const icon = dead ? c.icon_unavailable
        : open ? (c.icon_open || pair[0])
        : (c.icon_closed || pair[1]);

      const bg = dead ? c.color_unavailable_bg : open ? c.color_open_bg : c.color_closed_bg;
      const border = dead ? c.color_unavailable_border
        : open ? c.color_open_border : c.color_closed_border;

      // grade dinâmica: colunas e linhas só existem para o que está visível
      const showIcon = c.show_icon !== false;
      const showBat = c.show_battery !== false;
      const rows = [];
      if (c.show_name !== false) rows.push("n");
      if (c.show_state !== false) rows.push("s");
      const cols = [];
      if (showIcon) cols.push("i");
      if (rows.length) cols.push("t");
      if (showBat) cols.push("b");
      if (!cols.length) cols.push("t");
      const areaRows = (rows.length ? rows : ["t"])
        .map((r) => `"${cols.map((col) => (col === "t" ? r : col)).join(" ")}"`).join(" ");
      const colSizes = cols.map((col) => (col === "t" ? "1fr" : "min-content")).join(" ");

      const isz = px(c.icon_size) || "32px";
      const pad = px(c.padding) || "4px";
      const gap = px(c.gap) || "0px";
      const gradient = c.gradient === false ? "none"
        : `linear-gradient(145deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 42%, rgba(0,0,0,0.08) 100%)`;
      const shadow = c.shadow === false ? "none"
        : `inset 1px 1px 0 rgba(255,255,255,0.28), inset -1px -1px 0 rgba(0,0,0,0.10),
           0 2px 3px rgba(0,0,0,0.18), 0 6px 12px rgba(0,0,0,0.14)`;
      const lift = c.lift === false ? "none" : "translateY(-1px)";
      const height = px(c.height);

      let stateText = dead ? this._stateText(st, open, true) : this._stateText(st, open, false);
      if (c.secondary_info === "last-changed" && st?.last_changed) {
        const rel = relTime(st.last_changed);
        if (rel) stateText += ` · ${rel}`;
      }

      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          ha-card{box-sizing:border-box;padding:${pad};border-radius:${px(c.border_radius) || "10px"};
            background-color:${esc(bg)};border:1px solid ${esc(border)} !important;
            background-image:${gradient};transform:${lift};box-shadow:${shadow};
            ${height ? `height:${height};` : ""}
            transition:transform 180ms ease, box-shadow 180ms ease,
              background-color 250ms ease, border-color 250ms ease;
            cursor:pointer;overflow:hidden;-webkit-tap-highlight-color:transparent;
            touch-action:manipulation;user-select:none;}
          .ct{display:grid;width:100%;height:100%;align-items:center;
            grid-template-areas:${areaRows};grid-template-columns:${colSizes};}
          .ic{grid-area:i;display:flex;align-items:center;justify-self:start;
            width:${isz};height:${isz};}
          .ic ha-icon{width:${isz};height:${isz};--mdc-icon-size:${isz};
            color:${esc(c.color_icon)};filter:drop-shadow(0 1px 1px rgba(0,0,0,0.25));}
          .nm{grid-area:n;justify-self:start;padding-left:${gap};
            font-size:${px(c.name_size) || "10px"};color:${esc(c.color_name)};
            text-shadow:0 1px 1px rgba(0,0,0,0.25);line-height:1.2;}
          .stt{grid-area:s;justify-self:start;padding-left:${gap};font-weight:bold;
            font-size:${px(c.state_size) || "12px"};color:${esc(c.color_state)};line-height:1.2;}
          .bat{grid-area:b;align-self:center;justify-self:end;
            font-size:${px(c.battery_size) || "13px"};color:${esc(c.color_battery_text)};
            text-shadow:0 1px 1px rgba(0,0,0,0.25);}
          .bt{display:inline-flex;align-items:center;justify-content:center;gap:1px;overflow:visible;}
          .bp{display:inline-block;${c.battery_rotate === false ? "" : "width:30px;transform:rotate(90deg);"}}
        </style>
        <ha-card>
          <div class="ct">
            ${showIcon ? `<div class="ic"><ha-icon icon="${esc(icon)}"></ha-icon></div>` : ""}
            ${c.show_name !== false
              ? `<div class="nm">${esc(c.name || st?.attributes?.friendly_name || c.entity)}</div>` : ""}
            ${c.show_state !== false ? `<div class="stt">${esc(stateText)}</div>` : ""}
            ${showBat ? `<div class="bat">${this._batteryHtml()}</div>` : ""}
          </div>
        </ha-card>`;

      this._wireActions(this.shadowRoot.querySelector("ha-card"));
    }

    // tap curto · hold (500 ms) · duplo toque — cada um com ação configurável
    _wireActions(card) {
      let holdTimer = null, held = false, taps = 0, tapTimer = null;
      const c = this._config;
      const fire = (which) => this._runAction(c[which] || "none");
      card.addEventListener("pointerdown", () => {
        held = false;
        holdTimer = setTimeout(() => { held = true; holdTimer = null; fire("hold_action"); }, 500);
      });
      ["pointerleave", "pointercancel"].forEach((t) => card.addEventListener(t, () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      }));
      card.addEventListener("pointerup", () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (held) return;
        // com double_tap_action desligado o toque não espera — sem atraso na tela
        if ((c.double_tap_action || "none") === "none") { fire("tap_action"); return; }
        taps += 1;
        if (taps === 1) {
          tapTimer = setTimeout(() => { taps = 0; fire("tap_action"); }, 250);
        } else {
          clearTimeout(tapTimer); taps = 0; fire("double_tap_action");
        }
      });
    }

    _runAction(action) {
      const c = this._config;
      switch (action) {
        case "none": return;
        case "toggle":
          this._hass.callService("homeassistant", "toggle", { entity_id: c.entity }); return;
        case "navigate":
          if (!c.navigation_path) return;
          history.pushState(null, "", c.navigation_path);
          window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
          return;
        case "url":
          if (c.url_path) window.open(c.url_path, "_blank", "noopener"); return;
        case "more-info":
        default:
          this.dispatchEvent(new CustomEvent("hass-more-info",
            { bubbles: true, composed: true, detail: { entityId: c.entity } }));
      }
    }
  }

  /* ------------------------------ EDITOR ------------------------------ */

  const LABELS = {
    device: "Dispositivo (porta/janela)",
    entity: "Entidade de porta/janela",
    battery_entity: "Sensor de bateria",
    battery_auto: "Descobrir a bateria sozinho (quando o campo acima estiver vazio)",
    name: "Nome (vazio = nome da entidade)",
    show_name: "Mostrar o nome",
    show_state: "Mostrar o estado",
    show_icon: "Mostrar o ícone",
    show_battery: "Mostrar a bateria",
    invert: "Sensor invertido (ligado = fechado)",
    icon_open: "Ícone (aberto)",
    icon_closed: "Ícone (fechado)",
    icon_unavailable: "Ícone (indisponível)",
    text_open: "Texto do estado aberto (vazio = tradução do HA)",
    text_closed: "Texto do estado fechado (vazio = tradução do HA)",
    text_unavailable: "Texto de indisponível",
    secondary_info: "Informação extra ao lado do estado",
    icon_size: "Tamanho do ícone",
    name_size: "Tamanho do nome",
    state_size: "Tamanho do estado",
    battery_size: "Tamanho do texto da bateria",
    battery_icon_size: "Tamanho do ícone da bateria",
    border_radius: "Arredondamento da borda",
    padding: "Folga interna",
    gap: "Recuo do texto",
    height: "Altura do card (vazio = automática)",
    gradient: "Brilho de vidro no fundo",
    shadow: "Sombra em relevo",
    lift: "Card levemente levantado",
    battery_rotate: "Girar o percentual 90°",
    battery_show_percent: "Mostrar o percentual",
    battery_low: "Bateria baixa até (%)",
    battery_medium: "Bateria média até (%)",
    battery_high: "Bateria alta até (%)",
    tap_action: "Toque",
    hold_action: "Toque longo",
    double_tap_action: "Toque duplo",
    navigation_path: "Caminho para navegar (ação Navegar)",
    url_path: "Endereço para abrir (ação Abrir link)",
    color_open_bg: "Aberto: fundo",
    color_open_border: "Aberto: borda",
    color_closed_bg: "Fechado: fundo",
    color_closed_border: "Fechado: borda",
    color_unavailable_bg: "Indisponível: fundo",
    color_unavailable_border: "Indisponível: borda",
    color_name: "Nome: texto",
    color_state: "Estado: texto",
    color_icon: "Ícone",
    color_battery_text: "Bateria: texto",
    color_battery_low: "Bateria baixa",
    color_battery_medium: "Bateria média",
    color_battery_high: "Bateria alta",
    color_battery_full: "Bateria cheia",
  };

  const COLOR_FIELDS = ["color_open_bg", "color_open_border", "color_closed_bg",
    "color_closed_border", "color_unavailable_bg", "color_unavailable_border",
    "color_name", "color_state", "color_icon", "color_battery_text",
    "color_battery_low", "color_battery_medium", "color_battery_high", "color_battery_full"];

  const ACTIONS = [
    { value: "more-info", label: "Abrir detalhes (more-info)" },
    { value: "toggle", label: "Alternar a entidade" },
    { value: "navigate", label: "Navegar para uma tela" },
    { value: "url", label: "Abrir um link" },
    { value: "none", label: "Nada" },
  ];

  const NO_BATTERY = "__none__";

  const parseColor = (str) => {
    const s = String(str || "").trim();
    let m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    m = s.match(/^#([0-9a-f]{6})$/i);
    if (m) { const n = parseInt(m[1], 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 }; }
    m = s.match(/^#([0-9a-f]{3})$/i);
    if (m) { const [r, g, b] = m[1].split("").map((x) => parseInt(x + x, 16)); return { r, g, b, a: 1 }; }
    return { r: 128, g: 128, b: 128, a: 1 };
  };
  const toHex = ({ r, g, b }) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  const toRgba = ({ r, g, b, a }) => `rgba(${r}, ${g}, ${b}, ${a})`;

  class MwDoorWindowCardEditor extends HTMLElement {
    setConfig(config) { this._config = { ...config }; this._renderForm(); }
    set hass(hass) {
      this._hass = hass;
      if (this._form) { this._form.hass = hass; this._form.schema = this._schema(); }
    }

    _schema() {
      const hass = this._hass;
      const cfg = this._config || {};
      const num = (min, max) => ({ number: { min, max, step: 1, mode: "box", unit_of_measurement: "px" } });
      const pct = { number: { min: 0, max: 100, step: 1, mode: "box", unit_of_measurement: "%" } };
      if (!hass) return [{ name: "entity", required: true, selector: { entity: { domain: "binary_sensor" } } }];

      const devices = doorWindowDevices(hass);
      const entities = doorWindowEntities(hass, cfg.device);
      const batteries = [{ value: NO_BATTERY, label: "— nenhum —" }]
        .concat(batteryEntities(hass, cfg.device, cfg.entity));

      return [
        // dispositivo primeiro: escolher a porta filtra a entidade e a bateria
        ...(devices.length
          ? [{ name: "device", selector: { select: { mode: "dropdown", options: devices } } }]
          : []),
        { name: "entity", required: true, selector: { select: { mode: "dropdown", options: entities } } },
        { name: "battery_entity", selector: { select: { mode: "dropdown", options: batteries } } },
        { name: "battery_auto", selector: { boolean: {} } },
        { name: "name", selector: { text: {} } },
        {
          name: "", type: "expandable", title: "Mostrar / esconder", schema: [
            { name: "show_icon", selector: { boolean: {} } },
            { name: "show_name", selector: { boolean: {} } },
            { name: "show_state", selector: { boolean: {} } },
            { name: "show_battery", selector: { boolean: {} } },
            { name: "secondary_info", selector: { select: { mode: "dropdown", options: [
              { value: "none", label: "Nenhuma" },
              { value: "last-changed", label: "Desde quando (há 5min)" },
            ] } } },
          ],
        },
        {
          name: "", type: "expandable", title: "Ícones e textos", schema: [
            { name: "invert", selector: { boolean: {} } },
            { name: "icon_open", selector: { icon: {} } },
            { name: "icon_closed", selector: { icon: {} } },
            { name: "icon_unavailable", selector: { icon: {} } },
            { name: "text_open", selector: { text: {} } },
            { name: "text_closed", selector: { text: {} } },
            { name: "text_unavailable", selector: { text: {} } },
          ],
        },
        {
          name: "", type: "expandable", title: "Tamanhos e forma", schema: [
            { name: "icon_size", selector: num(8, 200) },
            { name: "name_size", selector: num(6, 40) },
            { name: "state_size", selector: num(6, 40) },
            { name: "battery_size", selector: num(6, 40) },
            { name: "border_radius", selector: num(0, 60) },
            { name: "padding", selector: num(0, 40) },
            { name: "gap", selector: num(0, 40) },
            { name: "height", selector: { text: {} } },
            { name: "gradient", selector: { boolean: {} } },
            { name: "shadow", selector: { boolean: {} } },
            { name: "lift", selector: { boolean: {} } },
          ],
        },
        {
          name: "", type: "expandable", title: "Bateria", schema: [
            { name: "battery_show_percent", selector: { boolean: {} } },
            { name: "battery_rotate", selector: { boolean: {} } },
            { name: "battery_icon_size", selector: num(8, 60) },
            { name: "battery_low", selector: pct },
            { name: "battery_medium", selector: pct },
            { name: "battery_high", selector: pct },
          ],
        },
        {
          name: "", type: "expandable", title: "Ações", schema: [
            { name: "tap_action", selector: { select: { mode: "dropdown", options: ACTIONS } } },
            { name: "hold_action", selector: { select: { mode: "dropdown", options: ACTIONS } } },
            { name: "double_tap_action", selector: { select: { mode: "dropdown", options: ACTIONS } } },
            { name: "navigation_path", selector: { text: {} } },
            { name: "url_path", selector: { text: {} } },
          ],
        },
      ];
    }

    _renderForm() {
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (f) => LABELS[f.name] || f.name;
        this._form.addEventListener("value-changed", (ev) => this._onChange(ev));
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.schema = this._schema();
      // campo vazio (ex.: altura automática) não vai para o ha-form: o seletor
      // numérico mostra lixo em vez de caixa vazia
      const data = { ...DEFAULTS, ...this._config };
      for (const k of Object.keys(data)) if (data[k] === "") delete data[k];
      this._form.data = data;
      this._renderColors();
    }

    _renderColors() {
      if (!this._colorsEl) {
        this._colorsEl = document.createElement("details");
        this._colorsEl.style.cssText =
          "margin-top:16px;border:1px solid var(--divider-color);border-radius:8px;padding:8px 12px;";
        this.appendChild(this._colorsEl);
      }
      const rows = COLOR_FIELDS.map((name) => {
        const cur = this._config[name] ?? DEFAULTS[name] ?? "";
        const c = parseColor(cur || "rgba(128,128,128,1)");
        return `<div class="dwc-crow" data-name="${name}">
          <span class="lbl">${LABELS[name] || name}</span>
          <input type="color" value="${toHex(c)}" title="cor">
          <input type="range" min="0" max="1" step="0.01" value="${c.a}" title="transparência (alfa)">
          <code>${cur || "—"}</code>
        </div>`;
      }).join("");
      this._colorsEl.innerHTML = `
        <summary style="cursor:pointer;font-weight:500;">Cores (clique para ajustar — cor + transparência)</summary>
        <style>
          .dwc-crow{display:grid;grid-template-columns:1fr 44px 110px minmax(120px,1fr);gap:10px;
            align-items:center;padding:6px 0;}
          .dwc-crow .lbl{font-size:13px;}
          .dwc-crow input[type=color]{width:40px;height:28px;border:none;background:none;cursor:pointer;padding:0;}
          .dwc-crow code{font-size:11px;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        </style>${rows}`;
      this._colorsEl.querySelectorAll(".dwc-crow").forEach((rowEl) => {
        const name = rowEl.dataset.name;
        const apply = () => {
          const hex = rowEl.querySelector("input[type=color]").value;
          const a = parseFloat(rowEl.querySelector("input[type=range]").value);
          const { r, g, b } = parseColor(hex);
          const value = a >= 1 ? hex : toRgba({ r, g, b, a });
          const clean = { ...this._config };
          if (value === DEFAULTS[name]) delete clean[name]; else clean[name] = value;
          this._config = clean;
          rowEl.querySelector("code").textContent = clean[name] || "—";
          this.dispatchEvent(new CustomEvent("config-changed",
            { bubbles: true, composed: true, detail: { config: clean } }));
        };
        rowEl.querySelector("input[type=color]").addEventListener("input", apply);
        rowEl.querySelector("input[type=range]").addEventListener("input", apply);
      });
    }

    _onChange(ev) {
      ev.stopPropagation();
      const v = { ...ev.detail.value };
      const clean = {};
      let noBattery = false;
      for (const [k, val] of Object.entries(v)) {
        // campo limpo volta ao default em vez de gravar `chave: null` no YAML
        if (val === undefined || val === null || val === "") continue;
        // "— nenhum —" não pode ser desfeito pela descoberta automática:
        // limpar o campo e deixar battery_auto ligado traria a bateria de volta
        if (k === "battery_entity" && val === NO_BATTERY) { noBattery = true; continue; }
        if (k === "entity" || k === "device" || val !== DEFAULTS[k]) clean[k] = val;
      }
      if (noBattery) { delete clean.battery_entity; clean.battery_auto = false; }
      // trocar de dispositivo invalida entidade e bateria do dispositivo antigo
      if (clean.device && clean.device !== this._config.device) {
        if (clean.entity && deviceOf(this._hass, clean.entity) !== clean.device) delete clean.entity;
        if (clean.battery_entity && deviceOf(this._hass, clean.battery_entity) !== clean.device) {
          delete clean.battery_entity;
        }
        if (!clean.entity) {
          const first = doorWindowEntities(this._hass, clean.device)[0];
          if (first) clean.entity = first.value;
        }
      }
      for (const k of COLOR_FIELDS) {
        if (this._config[k] !== undefined) clean[k] = this._config[k];
      }
      this._config = clean;
      this.dispatchEvent(new CustomEvent("config-changed",
        { bubbles: true, composed: true, detail: { config: clean } }));
      this._renderForm();
    }
  }

  customElements.define("mw-door-window-card", MwDoorWindowCard);
  customElements.define("mw-door-window-card-editor", MwDoorWindowCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "mw-door-window-card",
    name: "MW Door / Window Card",
    description: "Porta ou janela com estado, cor por aberto/fechado e bateria do sensor.",
    preview: true,
    documentationURL: "https://github.com/visaodeempresa/mw-ha-door-window-card",
  });

  console.info("%c MW-DOOR-WINDOW-CARD %c 0.1.0 ",
    "background:#1a1a1a;color:#fdfaf3;font-weight:700;",
    "background:#9acd32;color:#1a1a1a;font-weight:700;");
})();
