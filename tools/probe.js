/* Probe headless — instancia o card e o editor fora do navegador.
 * Pega erro de template, grade quebrada e campo sumido do editor sem
 * depender do HA. Roda no CI e antes de qualquer PR:  node tools/probe.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const stub = {
  style: {}, dataset: {},
  addEventListener() {}, appendChild() {}, querySelector() { return stub; },
  querySelectorAll() { return []; }, dispatchEvent() {},
};
global.HTMLElement = class {
  constructor() { this.children = []; }
  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      querySelector: () => stub,
      querySelectorAll: () => [],
    };
    return this.shadowRoot;
  }
  appendChild(el) { this.children.push(el); return el; }
  dispatchEvent() {}
  addEventListener() {}
};
const reg = {};
global.customElements = { define: (n, c) => (reg[n] = c) };
global.document = {
  createElement: () => ({
    style: { cssText: "" }, dataset: {},
    addEventListener() {}, appendChild() {}, dispatchEvent() {},
    querySelector: () => stub, querySelectorAll: () => [],
  }),
};
global.window = {};
global.CustomEvent = class { constructor(t, d) { this.type = t; Object.assign(this, d); } };
console.info = () => {};

const file = path.join(__dirname, "..", "dist", "mw-door-window-card.js");
eval(fs.readFileSync(file, "utf8"));

const hass = {
  states: {
    "binary_sensor.porta_cozinha": {
      state: "on",
      last_changed: "2026-01-01T00:00:00+00:00",
      attributes: { device_class: "door", friendly_name: "PORTA DA COZINHA" },
    },
    "binary_sensor.janela_quarto": {
      state: "off",
      attributes: { device_class: "window", friendly_name: "Janela do Quarto" },
    },
    "sensor.porta_cozinha_bateria": {
      state: "53",
      attributes: { device_class: "battery", friendly_name: "Bateria da porta" },
    },
    "sensor.porta_cozinha_sinal": { state: "-60", attributes: { friendly_name: "Sinal" } },
  },
  entities: {
    "binary_sensor.porta_cozinha": { device_id: "dev1" },
    "sensor.porta_cozinha_bateria": { device_id: "dev1" },
    "sensor.porta_cozinha_sinal": { device_id: "dev1" },
    "binary_sensor.janela_quarto": { device_id: "dev2" },
  },
  devices: { dev1: { name: "Sensor da cozinha", area_id: "a1" }, dev2: { name: "Sensor do quarto" } },
  areas: { a1: { name: "Cozinha" } },
  callService() {},
  localize: () => "",
};

let fails = 0;
const check = (label, cond, extra = "") => {
  if (cond) { console.log(`  ok   ${label}`); return; }
  fails += 1;
  console.log(`  FAIL ${label}${extra ? " — " + extra : ""}`);
};

console.log("card:");
const card = new reg["mw-door-window-card"]();
card.setConfig({ entity: "binary_sensor.porta_cozinha", name: "PORTA" });
card.hass = hass;
const html = card.shadowRoot.innerHTML;
check("grade i/n/s/b", /grid-template-areas:"i n b" "i s b"/.test(html), html.slice(0, 200));
check("nome renderizado", html.includes(">PORTA<"));
check("ícone de porta aberta", html.includes("mdi:door-open"));
check("bateria automática (53%)", html.includes("53%") && html.includes("mdi:battery-50"));
check("fundo de aberto", html.includes("rgba(154, 205, 50, 0.8)"));
check("borda discreta por padrão", html.includes("border:1px solid var(--divider-color)"));

const glass = new reg["mw-door-window-card"]();
glass.setConfig({ entity: "binary_sensor.porta_cozinha", border_mode: "glass" });
glass.hass = hass;
check("borda de vidro", glass.shadowRoot.innerHTML.includes("border:1px solid rgba(255,255,255,0.16)"));

const ring = new reg["mw-door-window-card"]();
ring.setConfig({ entity: "binary_sensor.porta_cozinha", border_mode: "status" });
ring.hass = hass;
check("estilo colorido mantém o anel do estado",
  ring.shadowRoot.innerHTML.includes("border:1px solid rgba(154, 205, 50, 1)"));

// quem já pintou a borda na mão não pode acordar com o card mudado
const old = new reg["mw-door-window-card"]();
old.setConfig({ entity: "binary_sensor.porta_cozinha", color_open_border: "#123456" });
old.hass = hass;
check("YAML antigo com cor de borda continua colorido",
  old.shadowRoot.innerHTML.includes("border:1px solid #123456"));

const closed = new reg["mw-door-window-card"]();
closed.setConfig({ entity: "binary_sensor.janela_quarto" });
closed.hass = hass;
const chtml = closed.shadowRoot.innerHTML;
check("janela fechada usa mdi:window-closed", chtml.includes("mdi:window-closed"));
check("fundo de fechado", chtml.includes("rgba(255, 99, 71, 0.8)"));
check("sem bateria vira --%", chtml.includes("--%"));

const bare = new reg["mw-door-window-card"]();
bare.setConfig({ entity: "binary_sensor.porta_cozinha", show_battery: false, show_state: false });
bare.hass = hass;
check("grade sem bateria e sem estado", /grid-template-areas:"i n"/.test(bare.shadowRoot.innerHTML));

let threw = false;
try { new reg["mw-door-window-card"]().setConfig({}); } catch (e) { threw = true; }
check("setConfig sem entity falha", threw);

console.log("editor:");
const ed = new reg["mw-door-window-card-editor"]();
ed.hass = hass;
ed.setConfig({ entity: "binary_sensor.porta_cozinha", device: "dev1" });
const schema = ed._schema();
const byName = (n) => schema.find((f) => f.name === n);
check("select de dispositivo", !!byName("device") && byName("device").selector.select.options.length === 2);
const entOpts = byName("entity").selector.select.options;
check("entidade filtrada pelo dispositivo", entOpts.length === 1 &&
  entOpts[0].value === "binary_sensor.porta_cozinha", JSON.stringify(entOpts));
const batOpts = byName("battery_entity").selector.select.options;
check("bateria lista sensores do dispositivo + '— nenhum —'",
  batOpts.length === 3 && batOpts[0].value === "__none__", JSON.stringify(batOpts.map((o) => o.value)));
check("seções expansíveis presentes",
  schema.filter((f) => f.type === "expandable").length === 5);

const edAll = new reg["mw-door-window-card-editor"]();
edAll.hass = hass;
edAll.setConfig({ entity: "binary_sensor.porta_cozinha" });
check("sem dispositivo, lista todas as portas/janelas",
  edAll._schema().find((f) => f.name === "entity").selector.select.options.length === 2);

// o editor não pode gravar default nenhum no YAML
const captured = [];
edAll.dispatchEvent = (ev) => captured.push(ev.detail.config);
edAll._onChange({
  stopPropagation() {},
  detail: { value: { entity: "binary_sensor.porta_cozinha", name: "", padding: 4, gap: 9,
    battery_entity: "__none__", height: null } },
});
const out = captured[0];
check("defaults fora do YAML", JSON.stringify(out) ===
  JSON.stringify({ entity: "binary_sensor.porta_cozinha", gap: 9, battery_auto: false }),
  JSON.stringify(out));
check("'— nenhum —' desliga a descoberta automática", out.battery_auto === false &&
  out.battery_entity === undefined);

const noBat = new reg["mw-door-window-card"]();
noBat.setConfig({ entity: "binary_sensor.porta_cozinha", battery_auto: false });
noBat.hass = hass;
check("battery_auto:false não inventa bateria", noBat.shadowRoot.innerHTML.includes("--%"));

const drained = new reg["mw-door-window-card"]();
drained.setConfig({ entity: "binary_sensor.porta_cozinha", battery_entity: "sensor.zerada" });
hass.states["sensor.zerada"] = { state: "2", attributes: { device_class: "battery" } };
drained.hass = hass;
check("2% usa mdi:battery-outline em vermelho",
  drained.shadowRoot.innerHTML.includes("mdi:battery-outline") &&
  drained.shadowRoot.innerHTML.includes("#e53935"));

console.log(fails ? `\n${fails} verificação(ões) falharam` : "\ntudo ok");
process.exit(fails ? 1 : 0);
