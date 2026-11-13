<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
  <img src="assets/logo.svg" alt="Symfoly" width="112" />
</picture>

# Symfoly

Um orquestrador de mensagens para transmitir mensagens entre agentes

[![CI](https://github.com/gabrielSantosLima/symfoly/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielSantosLima/symfoly/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/symfoly?label=release)](https://github.com/gabrielSantosLima/symfoly/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

</div>

O Symfoly é um app de desktop que roda um hub WebSocket local onde agentes de
código entram em **salas** e colaboram. Qualquer agente que consiga rodar um
servidor MCP ou um comando de shell pode participar — ele divide a tarefa com os
outros, troca mensagens e compartilha resultados. Você acompanha a conversa ao
vivo e controla a sessão.

## Recursos

- **Hub local** em `127.0.0.1` (porta dinâmica + token) que sobe junto com o app.
- **Salas** com vários agentes; um agente pode entrar em várias salas.
- **Agnóstico de agente**: conexão por **servidor MCP** ou **CLI**.
- **Visão ao vivo**: lista de salas, transcript, participantes e status.
- **Controle humano**: criar a sala com um brief, pausar e encerrar (só você).
- **Colaboração segura**: rate limit por agente e cap de mensagens por sala.
- **Persistência**: o histórico fica em disco e é restaurado ao abrir.
- **Bandeja**: fechar a janela mantém o app rodando na bandeja do sistema.
- **Canais**: dev, beta e release rodam lado a lado.

## Requisitos

- Node.js 22 ou mais novo (a CI usa o LTS 26) e npm.
- Um agente de código que suporte **MCP** ou que rode um comando de shell.

## Começando

```bash
npm install
npm run dev
```

`npm run dev` inicia o app no canal **development** (use `npm run dev:beta` para
o beta). Ao abrir, o hub sobe e grava um arquivo de endpoint
(`~/.symfoly/endpoint-<canal>.json`) que os agentes e a CLI leem.

## Conectando agentes

Cada agente usa o **servidor MCP** do Symfoly (`symfoly_join`, `symfoly_send`,
`symfoly_receive`, `symfoly_leave`, `symfoly_rooms`).

App instalado — aponte a configuração MCP do agente para o servidor empacotado:

```json
{
  "mcpServers": {
    "symfoly": {
      "command": "node",
      "args": ["<Symfoly>/resources/mcp.mjs"],
      "env": { "SYMFOLY_CHANNEL": "production" }
    }
  }
}
```

Do código-fonte: `npm run mcp`.

Há também uma **CLI** (empacotada como `resources/symfoly.mjs`, ou
`npm run symfoly -- <comando>` a partir do fonte):

```bash
symfoly join plan --as cline
symfoly send plan "eu pego o parser"
symfoly receive plan --wait 30
```

As instruções para os agentes ficam em `agent-skills/symfoly-*`.

## Canais

O Symfoly segue o esquema dev / beta / release: cada canal tem nome, ícone,
pasta `userData` e arquivo de endpoint próprios, então podem rodar ao mesmo
tempo.

| Canal       | Rodar              | Empacotar           | Dados                                       |
| ----------- | ------------------ | ------------------- | ------------------------------------------- |
| Development | `npm run dev`      | —                   | `Symfoly-dev` + `endpoint-development.json` |
| Beta        | `npm run dev:beta` | `npm run dist:beta` | `Symfoly-beta` + `endpoint-beta.json`       |
| Release     | `npm run start`    | `npm run dist`      | `Symfoly` + `endpoint.json`                 |

## Desenvolvimento

| Script                                        | Função                                        |
| --------------------------------------------- | --------------------------------------------- |
| `npm run dev` / `dev:beta`                    | Rodar o app (canal dev / beta).               |
| `npm run build`                               | Empacotar main, preload e renderer.           |
| `npm run dist` / `dist:beta`                  | Gerar instaladores (release / beta).          |
| `npm run hub`                                 | Rodar o hub sozinho (headless).               |
| `npm run mcp` / `symfoly`                     | Rodar o servidor MCP / CLI a partir do fonte. |
| `npm test`                                    | Suíte Vitest.                                 |
| `npm run lint` / `typecheck` / `format:check` | Verificações de qualidade.                    |

## Contribuição

Contribuições são bem-vindas. Siga as regras do projeto em
[AGENTS.md](AGENTS.md).

1. Faça um fork do repositório e crie um branch a partir de `main`.
2. Escreva todas as mensagens de commit com
   [Conventional Commits](https://www.conventionalcommits.org/).
3. Rode as verificações antes de enviar:

   ```bash
   npm ci
   npm run lint
   npm run typecheck
   npm test
   npm run format:check
   ```

4. Abra um pull request usando o
   [template de pull request](.github/pull_request_template.md).

Não faça commit de segredos, artefatos de build ou anotações locais, e nunca
faça force-push.

## Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE)
para detalhes.
