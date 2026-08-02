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

## 2026-08-02 — borda discreta (v0.2.0)

Pedido: deixar a borda parecida com a do `custom:mw-temp-humidity-card`, que
o dono aprovou.

O que era: anel de 1 px na cor **saturada** do estado (`rgba(154,205,50,1)`
aberto, `rgba(255,99,71,1)` fechado) sobre um fundo já pintado com a mesma
cor a 80% — dois avisos da mesma informação, e o anel roubava a leitura.

O que ficou: `border_mode`, com o padrão `theme` — `1px solid
var(--divider-color)`, exatamente o que o card de temperatura desenha na
escala canônica. A cor do estado passa a ser só do fundo.

Decisões:

- **Três valores, não um interruptor.** `theme` (padrão), `glass`
  (`rgba(255,255,255,0.16)` — o fio do temp-humidity fora do modo tema) e
  `status` (o anel colorido de antes). Sem `status` seria quebra de contrato
  para quem já escolheu cor de borda.
- **Migração igual à do `color_scale` do temp-humidity**: YAML sem
  `border_mode` mas *com* algum `color_*_border` nasce em `status`. Quem
  pintou a borda na mão não acorda com outro card.
- **Cores de borda continuam no editor**, com o rótulo dizendo que só valem no
  estilo colorido — esconder campo que ainda funciona confunde mais que ajuda.
- Probe ganhou 4 verificações (padrão, vidro, colorido, migração do YAML
  antigo).
