# Plano — mw-ha-door-window-card

Card de porta/janela com bateria, feito na fábrica de cards MW
(arquivo único, sem build; editor `<ha-form>`; HACS tipo Dashboard).

## Entrega 1 — v0.1.0 (fechada)

- [x] Card `custom:mw-door-window-card`: grade `i n b` / `i s b`, vidro,
      cores por estado, bateria girada 90° (port do button-card do dono).
- [x] Editor visual: select de **dispositivo** (só quem tem porta/janela),
      select de **entidade** filtrado pelo dispositivo, select de **bateria**
      começando em branco e listando os sensores do dispositivo.
- [x] Todas as propriedades configuráveis (conteúdo, geometria, efeitos,
      cores, bateria, ações) com defaults fora do YAML.
- [x] Descoberta automática da bateria (mesmo dispositivo → nome parecido).
- [x] Probe headless (`tools/probe.js`) rodando no CI.
- [x] DevOps: `feature/** → develop → release → main` + auto-release para HACS.
- [x] README com tabela de propriedades e 6 exemplos + `examples/`.

## Próximas (só com pedido do dono)

- [ ] Ação `call-service` com `service_data` no editor.
- [ ] Modo "lista" (várias aberturas num card só, uma linha por entidade).
- [ ] Badge de "aberta há mais de X min" (cor pulsando).
- [ ] Ícone opcional vindo do `entity.attributes.icon`.

## Regras deste repositório

- Nunca commitar direto na `main`; merge é do dono.
- Versão no banner `console.info` não se mexe à mão — quem sobe é o workflow.
- Um lote de trabalho = uma branch nova (commit órfão em branch já mergeada
  não vira release).
- `memoria-ia/` é ignorada pelo git — memória de IA não vai para o público.
