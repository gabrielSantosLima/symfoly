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
