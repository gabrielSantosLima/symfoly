---
name: Release summary
description: Write a short, non-technical summary of the latest release, asking the user for the language first. Use when the user asks for a release message, release notes, or a summary of what changed recently.
---

# Release summary

Create a short, user-facing message about the latest release. The readers are
end users, not developers.

## 1. Ask the language

Ask with a single-selection question containing exactly these options:

1. `Portuguese (Brazil)` - `pt-BR`
2. `English` - `en`
3. `Spanish` - `es`

Ask every time, even when the conversation is already in one of those languages.
Never infer the language from context.

If your agent has a dedicated question tool, use it; otherwise ask in plain text
and wait.

## 2. Collect the release scope

Run:

```bash
git describe --tags --abbrev=0
git log --oneline <latest-tag>..HEAD
```

If the range is empty, use `git log --oneline <previous-tag>..<latest-tag>`.
Ignore merge commits and `chore(release)` commits. If both ranges are empty,
say there is nothing new to summarize and stop.

## 3. Translate commits into user-facing changes

- Group related commits into one bullet. For example, several sync fixes become
  one "more reliable sync" bullet.
- Keep only what the user can notice or do.
- Drop everything internal: refactors, dependency bumps, CI, tests, tooling,
  migrations, file names, internal identifiers.
- Fixes without a visible outcome become one "stability fixes" bullet.
- Never invent features that are not in the commits.

## 4. Write the message

- Start with a bold title: `What changed` (en), `O que mudou` (pt-BR) or
  `Que cambio` (es).
- 4 to 7 bullets, one line each, ordered by user impact.
- Plain, friendly language and short sentences.
- Avoid technical vocabulary: API, refactor, agent, job, commit, dependency,
  retry, payload, migration, CI.
- No file names, commit hashes, branch names or version numbers unless the user
  asks for them.
- No emoji, no extra headings, no closing paragraph.
- Output only the message, in the chosen language.

## Examples

English:

```text
**What changed**

- You can now sync your data with another device nearby, with no internet.
- Log today's reading right from the home screen in a few taps.
- Scanning is more accurate because it uses both the photo and the text.
- If a scan takes too long, a cancel button appears.
```

Portuguese (Brazil):

```text
**O que mudou**

- Agora da para sincronizar seus dados com outro aparelho por proximidade, sem internet.
- Registre a leitura de hoje direto da tela inicial, em poucos toques.
- A leitura ficou mais precisa, usando a foto e o texto juntos.
- Se a leitura demorar, aparece um botao para cancelar.
```

Spanish:

```text
**Que cambio**

- Ahora puedes sincronizar tus datos con otro dispositivo cercano, sin internet.
- Registra la lectura de hoy desde la pantalla de inicio en pocos toques.
- La lectura es mas precisa porque usa la foto y el texto juntos.
- Si la lectura tarda demasiado, aparece un boton para cancelar.
```
