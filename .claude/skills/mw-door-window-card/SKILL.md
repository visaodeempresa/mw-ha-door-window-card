---
name: mw-door-window-card
description: Trabalhar no custom:mw-door-window-card (card de porta/janela do HA com bateria). Use ao adicionar propriedade, mexer em cores/ícones/grade, ajustar os selects de dispositivo/entidade/bateria do editor, publicar release pelo HACS, ou quando o dono disser "a bateria não aparece", "o select não lista o sensor certo", "mudei e a tela não muda" ou "o HACS não mostra versão nova".
---

# mw-door-window-card — fábrica

Arquivo único `dist/mw-door-window-card.js` (fonte **e** artefato, sem build).
JS puro + `<ha-form>`. Instala por HACS, tipo Dashboard.
Regras da família: `IA/rules/projects/mw-ha-cards.md`.

## Anatomia

- `DEFAULTS` — toda propriedade nasce aqui; o editor remove do YAML tudo que
  for igual ao default (e ignora `undefined`/`null`/`""`).
- `DW_CLASSES` / `DW_ICONS` — o que conta como porta/janela (`door`, `window`,
  `garage_door`, `opening`) e o par de ícones aberto/fechado de cada classe.
- Funções de descoberta (`doorWindowDevices`, `doorWindowEntities`,
  `batteryEntities`, `autoBattery`) — usadas pelo card **e** pelo editor.
  Toda uma tem queda em cascata; nenhuma pode devolver lista vazia.
- `_render()` — grade montada a partir dos `show_*`: colunas `i`/`t`/`b` e
  linhas `n`/`s`. Esconder o nome não deixa buraco.
- `_schema()` — campos de topo + cinco seções
  `{ name: "", type: "expandable", ... }`. **`name` vazio é obrigatório**:
  com `name` preenchido o `ha-form` aninha o `data` e o card não lê mais.
- Bloco de cores (`COLOR_FIELDS` + `<details>`) — mesmo padrão dos cards irmãos
  (`a==1` grava hex, senão `rgba(...)`).

## Fluxo

`feature/** → develop → release → main`. Merge na `main` tocando `dist/**` ou
`hacs.json` dispara o auto-release (patch/minor/major pelos commits), que
sincroniza o banner `%c 0.0.0` do JS, cria a tag e publica a Release — o HACS
sinaliza a atualização sozinho. **Merge é do dono.**

## Verificação (o que faz a tarefa estar pronta)

```bash
node --check dist/mw-door-window-card.js
node tools/probe.js                       # card + editor, sem navegador
curl -s http://192.168.1.71:8123/hacsfiles/mw-ha-door-window-card/mw-door-window-card.js \
  | grep -o '%c [0-9.]*'
git log -1 --pretty='%G? %an'             # G + MAYCON WILLIAN OLIVEIRA
```

A conferência **de tela** é do dono (regra global 30) — dizer isso em vez de
deixar implícito que houve teste visual.

## Armadilhas (com sintoma)

| Sintoma | Causa | Correção |
|---|---|---|
| Select de bateria não lista o sensor certo | selector nativo não filtra por `device_id` | opções calculadas de `hass.entities`/`hass.devices` (já é assim — manter a cascata) |
| Escolhi "— nenhum —" e a bateria voltou | descoberta automática ligada | `— nenhum —` grava `battery_auto: false`; não regredir isso |
| Editor grava `chave: null` no YAML | `_onChange` aceitando campo limpo | ignorar `undefined`/`null`/`""` |
| Seções do editor sumiram / config aninhada | `expandable` com `name` preenchido | usar `name: ""` |
| `curl` mostra código novo, tela não muda | `.js.gz` velho servido (deploy manual por SSH) | subir `.js` **e** `.js.gz` (`IA/runbooks/deploy-card-hacs-ssh.md`) |
| Repositório novo, workflow certo, zero releases | o primeiro push do repo não cria execução | publicar a v0.1.0 pela tag (`git tag -s`), o fallback `release.yml` cuida |
| HACS não vê a release recém-publicada | `available_version` em cache | `hacs/repository/download` com `version="vX.Y.Z"` explícita (runbook do WebSocket) |
