# MW Door / Window Card

[![CI](https://github.com/visaodeempresa/mw-ha-door-window-card/actions/workflows/ci.yml/badge.svg)](https://github.com/visaodeempresa/mw-ha-door-window-card/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/visaodeempresa/mw-ha-door-window-card?sort=semver)](https://github.com/visaodeempresa/mw-ha-door-window-card/releases)
[![HACS](https://img.shields.io/badge/HACS-Dashboard-41BDF5.svg)](https://hacs.xyz)

Card do Lovelace para **porta ou janela**: ícone, nome, estado e **bateria do
próprio sensor** num botão compacto que muda de cor entre aberto e fechado.

```
┌──────────────────────────┐
│ ▐▌  PORTA          53% 🔋│   verde  = aberto
│ ▐▌  Aberto               │   vermelho = fechado
└──────────────────────────┘
```

Arquivo único, **sem build**: `dist/mw-door-window-card.js` é fonte e artefato.
JS puro + `<ha-form>` do Home Assistant — nenhuma dependência externa.

## Por que ele existe

Fazer isso com `custom:button-card` exige ~150 linhas de YAML por porta, com
JavaScript embutido para a bateria e o `entity_id` da bateria escrito à mão em
cada card. Aqui é um card com editor visual: escolhe-se o **dispositivo**, e a
entidade de porta/janela e o sensor de bateria vêm filtrados; a bateria pode
até ser descoberta sozinha.

## Instalação

### HACS (recomendado)

1. HACS → **⋮** → **Repositórios personalizados**
2. URL: `https://github.com/visaodeempresa/mw-ha-door-window-card` ·
   Categoria: **Dashboard**
3. Instalar **MW Door / Window Card** e recarregar a página (⌘⇧R / Ctrl+Shift+R).

O HACS cadastra o recurso sozinho. As versões seguintes aparecem como
atualização assim que a release é publicada — nada a fazer à mão.

### Manual

Copie `dist/mw-door-window-card.js` para `/config/www/` e cadastre o recurso em
**Configurações → Painéis → ⋮ → Recursos**:

| Campo | Valor |
|---|---|
| URL | `/local/mw-door-window-card.js` |
| Tipo | Módulo JavaScript |

## Uso mínimo

```yaml
type: custom:mw-door-window-card
entity: binary_sensor.cozinha_porta_da_cozinha
```

Só isso: o ícone vem do `device_class`, o nome vem da entidade, o estado vem
traduzido pelo próprio HA e a bateria é descoberta pelo dispositivo do sensor.

## Editor visual

| Campo | O que faz |
|---|---|
| **Dispositivo (porta/janela)** | Lista só os dispositivos que têm alguma entidade de porta/janela (`device_class` `door`, `window`, `garage_door` ou `opening`). |
| **Entidade de porta/janela** | Filtrada pelo dispositivo escolhido. Sem dispositivo, lista todas as portas/janelas da casa; se a integração não expuser nenhuma, lista todos os `binary_sensor`. |
| **Sensor de bateria** | Começa em branco. Escolhido o dispositivo, lista **os sensores daquele dispositivo**; sem dispositivo conhecido, lista todos os sensores de bateria; em último caso, todos os sensores. A opção **— nenhum —** limpa o campo. |

Trocar de dispositivo limpa a entidade e a bateria do dispositivo antigo e já
seleciona a primeira porta/janela do novo — sem configuração órfã.

O resto está em seções recolhidas: **Mostrar/esconder**, **Ícones e textos**,
**Tamanhos e forma**, **Bateria**, **Ações** e, no rodapé, **Cores** (com
seletor de cor + transparência, gravando `#rrggbb` ou `rgba(...)`).

> O editor **não grava defaults no YAML**: só sai no arquivo o que você mudou.

## Propriedades

### Entidades

| Propriedade | Tipo | Padrão | Descrição |
|---|---|---|---|
| `entity` | string | — | **Obrigatória.** Entidade da porta/janela. |
| `device` | string | `""` | ID do dispositivo. Só o editor usa (para filtrar); pode ficar fora do YAML. |
| `battery_entity` | string | `""` | Sensor de bateria. Vazio = descoberta automática. |
| `battery_auto` | bool | `true` | Procurar a bateria no mesmo dispositivo (ou por nome parecido) quando `battery_entity` estiver vazio. |

### Conteúdo

| Propriedade | Tipo | Padrão | Descrição |
|---|---|---|---|
| `name` | string | `""` | Vazio = `friendly_name` da entidade. |
| `show_name` | bool | `true` | Mostrar o nome. |
| `show_state` | bool | `true` | Mostrar o estado. |
| `show_icon` | bool | `true` | Mostrar o ícone. |
| `show_battery` | bool | `true` | Mostrar a bateria. |
| `invert` | bool | `false` | Sensor invertido: `on` passa a significar fechado. |
| `icon_open` | ícone | auto | Vazio = automático pelo `device_class` (ver tabela abaixo). |
| `icon_closed` | ícone | auto | Idem. |
| `icon_unavailable` | ícone | `mdi:help-rhombus-outline` | Ícone quando indisponível/desconhecido. |
| `text_open` | string | `""` | Vazio = tradução do HA (`Aberto`). |
| `text_closed` | string | `""` | Vazio = tradução do HA (`Fechado`). |
| `text_unavailable` | string | `""` | Vazio = `Indisponível`. |
| `secondary_info` | `none` \| `last-changed` | `none` | `last-changed` acrescenta `· há 5min` ao estado (atualiza a cada minuto). |

Ícone automático:

| `device_class` | aberto | fechado |
|---|---|---|
| `door`, `opening` | `mdi:door-open` | `mdi:door-closed` |
| `window` | `mdi:window-open` | `mdi:window-closed` |
| `garage_door` | `mdi:garage-open` | `mdi:garage` |

### Tamanhos e forma

Números são pixels; texto com unidade (`2em`, `100%`) passa direto.

| Propriedade | Tipo | Padrão | Descrição |
|---|---|---|---|
| `icon_size` | número | `32` | Lado do ícone. |
| `name_size` | número | `10` | Fonte do nome. |
| `state_size` | número | `12` | Fonte do estado. |
| `battery_size` | número | `13` | Fonte do percentual. |
| `battery_icon_size` | número | `20` | Ícone da bateria. |
| `border_radius` | número | `10` | Arredondamento. |
| `padding` | número | `4` | Folga interna. |
| `gap` | número | `5` | Recuo do texto em relação ao ícone. |
| `height` | número/string | `""` | Vazio = altura automática. |
| `gradient` | bool | `true` | Brilho de vidro no fundo. |
| `shadow` | bool | `true` | Sombra em relevo. |
| `lift` | bool | `true` | Card 1 px levantado. |

### Cores

| Propriedade | Padrão |
|---|---|
| `color_open_bg` | `rgba(154, 205, 50, 0.8)` |
| `color_open_border` | `rgba(154, 205, 50, 1)` |
| `color_closed_bg` | `rgba(255, 99, 71, 0.8)` |
| `color_closed_border` | `rgba(255, 99, 71, 1)` |
| `color_unavailable_bg` | `rgba(120, 120, 120, 0.55)` |
| `color_unavailable_border` | `rgba(160, 160, 160, 0.9)` |
| `color_name` | `#ffffff` |
| `color_state` | `rgba(0, 0, 0, 0.7)` |
| `color_icon` | `#ffffff` |
| `color_battery_text` | `#ffffff` |
| `color_battery_low` | `#e53935` |
| `color_battery_medium` | `#fdd835` |
| `color_battery_high` | `#9ccc65` |
| `color_battery_full` | `#43a047` |

Qualquer notação CSS serve: `#rrggbb`, `rgba(...)`, `var(--primary-color)`.

### Bateria

| Propriedade | Tipo | Padrão | Descrição |
|---|---|---|---|
| `battery_show_percent` | bool | `true` | Mostrar o número. |
| `battery_rotate` | bool | `true` | Percentual girado 90° (economiza largura). |
| `battery_low` | número | `20` | Até esse valor usa `color_battery_low`. |
| `battery_medium` | número | `50` | Até esse valor, `color_battery_medium`. |
| `battery_high` | número | `70` | Até esse valor, `color_battery_high`; acima, `color_battery_full`. |

Bateria ausente, `unknown` ou `unavailable` vira `--%` com
`mdi:battery-unknown` — o card **não** quebra.

### Ações

| Propriedade | Tipo | Padrão |
|---|---|---|
| `tap_action` | `more-info` \| `toggle` \| `navigate` \| `url` \| `none` | `more-info` |
| `hold_action` | idem | `none` |
| `double_tap_action` | idem | `none` |
| `navigation_path` | string | `""` |
| `url_path` | string | `""` |

`hold` é o toque de 500 ms. Com `double_tap_action: none` (padrão) o toque
simples dispara **na hora** — sem os 250 ms de espera por um segundo toque.

## Exemplos

### 1. Porta da cozinha como no card antigo (com bateria)

```yaml
type: custom:mw-door-window-card
entity: binary_sensor.cozinha_porta_da_cozinha
battery_entity: sensor.cozinha_porta_da_cozinha_bateria
name: PORTA
```

### 2. Janela discreta, sem bateria e com detalhes no toque longo

```yaml
type: custom:mw-door-window-card
entity: binary_sensor.janela_esquerda_do_escritorio
name: JANELA ESQ.
show_battery: false
gradient: false
lift: false
hold_action: more-info
tap_action: none
```

### 3. Porta de garagem com cores invertidas (aberto = alerta)

```yaml
type: custom:mw-door-window-card
entity: binary_sensor.portao_da_garagem
color_open_bg: rgba(255, 99, 71, 0.85)
color_open_border: rgba(255, 99, 71, 1)
color_closed_bg: rgba(154, 205, 50, 0.8)
color_closed_border: rgba(154, 205, 50, 1)
secondary_info: last-changed
```

### 4. Grade de portas e janelas

```yaml
type: grid
columns: 2
square: false
cards:
  - type: custom:mw-door-window-card
    entity: binary_sensor.cozinha_porta_da_cozinha
    name: COZINHA
  - type: custom:mw-door-window-card
    entity: binary_sensor.porta_do_quarto
    name: QUARTO
  - type: custom:mw-door-window-card
    entity: binary_sensor.janela_direita_da_suite
    name: SUÍTE DIR.
  - type: custom:mw-door-window-card
    entity: binary_sensor.janela_esquerda_da_suite
    name: SUÍTE ESQ.
```

### 5. Sensor invertido e textos próprios

```yaml
type: custom:mw-door-window-card
entity: binary_sensor.contato_reed_antigo
invert: true
text_open: ESCANCARADA
text_closed: TRANCADA
icon_open: mdi:door-open
icon_closed: mdi:door-closed-lock
```

### 6. Compacto para celular (só ícone e estado)

```yaml
type: custom:mw-door-window-card
entity: binary_sensor.seguranca_porta_do_apartamento
show_name: false
icon_size: 24
state_size: 11
padding: 2
battery_rotate: false
```

Mais exemplos prontos em [`examples/`](examples/).

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Card não aparece / "Custom element doesn't exist" | recurso não carregado | Recarregue com ⌘⇧R (o `?hacstag=` do recurso é fixo por versão e o navegador não invalida sozinho). |
| Bateria em `--%` | sensor sem número (`unknown`) ou não encontrado | Escolha o sensor no editor; se o dispositivo não expõe bateria, `show_battery: false`. |
| Select de dispositivo não aparece | registro de dispositivos indisponível no `hass` | Normal em instalações antigas — use direto o select de entidade. |
| Aberto/fechado trocados | sensor com lógica invertida | `invert: true`. |
| HACS não mostra versão nova | commit ainda não chegou na `main` | O release só é gerado no merge para a `main`. |

## Desenvolvimento (DevOps)

Fluxo de branches — o mesmo do `new-floor3d-card`:

```
feature/<assunto> ──PR──► develop ──PR──► release ──PR──► main ──► auto-release ──► HACS
```

- `main` — o que está publicado. Push aqui tocando `dist/**` ou `hacs.json`
  dispara o **auto-release**: bump semântico pelos commits desde a última tag
  (`BREAKING`/`!:` = major, `feat` = minor, resto = patch), sincroniza a versão
  no banner do JS, cria a tag e publica a Release com o asset. O HACS notifica.
- `release` — homologação: o que vai na próxima versão.
- `develop` — integração do dia a dia.
- `feature/**`, `fix/**` — trabalho. **Uma branch por lote** (continuar
  empurrando numa branch já mergeada deixa commits órfãos, fora de qualquer
  release).

Verificação local antes do PR:

```bash
node --check dist/mw-door-window-card.js && node tools/probe.js
```

O probe instancia card e editor fora do navegador e confere grade, ícones,
bateria, filtros do editor e a regra de "default não vai para o YAML".

Commits em inglês, assinados (GPG), com autoria
`MAYCON WILLIAN OLIVEIRA <visaodeempresa@gmail.com>`.

## Licença

MIT © MAYCON WILLIAN OLIVEIRA
