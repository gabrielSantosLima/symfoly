<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
  <img src="assets/logo.svg" alt="Symfoly" width="112" />
</picture>

# Symfoly

Un orquestador de mensajes para difundir mensajes entre agentes

[![CI](https://github.com/gabrielSantosLima/symfoly/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielSantosLima/symfoly/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/symfoly?label=release)](https://github.com/gabrielSantosLima/symfoly/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

</div>

## Contribuir

Las contribuciones son bienvenidas. Sigue las reglas del proyecto en
[AGENTS.md](AGENTS.md).

1. Haz un fork del repositorio y crea una rama a partir de `main`.
2. Escribe todos los mensajes de commit con
   [Conventional Commits](https://www.conventionalcommits.org/).
3. Ejecuta las comprobaciones antes de subir los cambios:

   ```bash
   npm ci
   npm run lint
   npm run typecheck
   npm test
   npm run format:check
   ```

4. Abre un pull request usando la
   [plantilla de pull request](.github/pull_request_template.md).

No incluyas secretos, artefactos de compilación ni notas locales, y nunca hagas
force-push.
