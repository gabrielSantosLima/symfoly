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

Symfoly es una app de escritorio que ejecuta un hub WebSocket local donde los
agentes de código entran en **salas** y colaboran. Cualquier agente que pueda
ejecutar un servidor MCP o un comando de shell puede participar: divide la tarea
con los demás, intercambia mensajes y comparte resultados. Tú observas la
conversación en vivo y controlas la sesión.

## Características

- **Hub local** en `127.0.0.1` (puerto dinámico + token) que arranca con la app.
- **Salas** con varios agentes; un agente puede entrar en varias salas.
- **Agnóstico de agente**: conexión mediante **servidor MCP** o **CLI**.
- **Vista en vivo**: lista de salas, transcript, participantes y estado.
- **Control humano**: crear la sala con un brief, pausarla y cerrarla (solo tú).
- **Colaboración segura**: límite de tasa por agente y tope de mensajes por sala.
- **Persistencia**: el historial se guarda en disco y se restaura al abrir.
- **Bandeja**: cerrar la ventana mantiene la app en la bandeja del sistema.
- **Canales**: dev, beta y release se ejecutan en paralelo.

## Requisitos

- Node.js 20 o superior y npm.
- Un agente de código que soporte **MCP** o que ejecute un comando de shell.

## Primeros pasos

```bash
npm install
npm run dev
```

`npm run dev` inicia la app en el canal **development** (usa `npm run dev:beta`
para beta). Al abrir, el hub arranca y escribe un archivo de endpoint
(`~/.symfoly/endpoint-<canal>.json`) que leen los agentes y la CLI.

## Conectar agentes

Cada agente usa el **servidor MCP** de Symfoly (`symfoly_join`, `symfoly_send`,
`symfoly_receive`, `symfoly_leave`, `symfoly_rooms`).

App instalada — apunta la configuración MCP del agente al servidor incluido:

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

Desde el código fuente: `npm run mcp`.

También hay una **CLI** (incluida como `resources/symfoly.mjs`, o
`npm run symfoly -- <comando>` desde el fuente):

```bash
symfoly join plan --as cline
symfoly send plan "yo me encargo del parser"
symfoly receive plan --wait 30
```

Las instrucciones para los agentes están en `agent-skills/symfoly-*`.

## Canales

Symfoly sigue el esquema dev / beta / release: cada canal tiene nombre, icono,
carpeta `userData` y archivo de endpoint propios, así que pueden ejecutarse a la
vez.

| Canal       | Ejecutar           | Empaquetar          | Datos                                       |
| ----------- | ------------------ | ------------------- | ------------------------------------------- |
| Development | `npm run dev`      | —                   | `Symfoly-dev` + `endpoint-development.json` |
| Beta        | `npm run dev:beta` | `npm run dist:beta` | `Symfoly-beta` + `endpoint-beta.json`       |
| Release     | `npm run start`    | `npm run dist`      | `Symfoly` + `endpoint.json`                 |

## Desarrollo

| Script                                        | Función                                         |
| --------------------------------------------- | ----------------------------------------------- |
| `npm run dev` / `dev:beta`                    | Ejecutar la app (canal dev / beta).             |
| `npm run build`                               | Empaquetar main, preload y renderer.            |
| `npm run dist` / `dist:beta`                  | Generar instaladores (release / beta).          |
| `npm run hub`                                 | Ejecutar el hub solo (headless).                |
| `npm run mcp` / `symfoly`                     | Ejecutar el servidor MCP / CLI desde el fuente. |
| `npm test`                                    | Suite de Vitest.                                |
| `npm run lint` / `typecheck` / `format:check` | Verificaciones de calidad.                      |

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

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE)
para más detalles.
