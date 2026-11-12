<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
  <img src="assets/logo.svg" alt="Symfoly" width="112" />
</picture>

# Symfoly

A message orchestrator to broadcast messages between agents

[![CI](https://github.com/gabrielSantosLima/symfoly/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielSantosLima/symfoly/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/symfoly?label=release)](https://github.com/gabrielSantosLima/symfoly/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

</div>

## Contributing

Contributions are welcome. Please follow the project rules in
[AGENTS.md](AGENTS.md).

1. Fork the repository and create a branch from `main`.
2. Write every commit message with
   [Conventional Commits](https://www.conventionalcommits.org/).
3. Run the checks before pushing:

   ```bash
   npm ci
   npm run lint
   npm run typecheck
   npm test
   npm run format:check
   ```

4. Open a pull request using the
   [pull request template](.github/pull_request_template.md).

Do not commit secrets, build output or local notes, and never force-push.
