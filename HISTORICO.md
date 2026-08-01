# Histórico — mw-ha-door-window-card

## 2026-08-01 — nascimento (v0.1.0)

Pedido: replicar em card próprio o `custom:button-card` de porta do dono
(~150 linhas de YAML por porta, com JS embutido para a bateria), com editor
visual escolhendo dispositivo → entidade → bateria.

Decisões:

- **Selects computados, não `selector: entity`.** O selector nativo de
  entidade do HA não filtra por dispositivo; as opções são montadas a partir
  de `hass.states` + `hass.entities` + `hass.devices`, com queda em cascata
  (dispositivo → todas as portas/janelas → todos os `binary_sensor`).
- **Bateria automática** quando o campo está vazio: mesma `device_id` e,
  sem registro, sufixos `_bateria`/`_battery`/`_battery_level`.
- **Grade dinâmica**: colunas e linhas são montadas a partir dos `show_*`,
  então esconder o nome não deixa buraco na grade.
- **`double_tap_action: none` não atrasa o toque** — sem espera de 250 ms
  por um segundo toque quando não há ação dupla configurada.
- Bateria sem número vira `--%` com `mdi:battery-unknown` (o YAML original
  do dono já tratava isso; virou comportamento do card).
- Fluxo de branches `feature → develop → release → main` (padrão
  new-floor3d-card) com auto-release no push da `main`.
