---
name: Add skill
description: Create a new reusable skill, either in the harness library or as a proposal from a generated project. Use when the user asks to add, create or extract a skill, or wants to turn a repeated workflow into instructions.
---

# Add skill

Create a new skill that any agent can read and follow. Skills must stay
self-contained and agent-agnostic.

## 1. Decide the scope

- **Harness repository** (the working tree contains `setup/decisions.md` and
  `skills/`): write the skill directly to `skills/<id>/SKILL.md`.
- **Generated project** (`.agent/` is a read-only submodule): write a proposal
  to `docs/skill-proposals/<id>.md` and tell the user to apply it in the harness
  repository. Never write into `.agent/`.

## 2. Define the skill

Ask for, or infer from the conversation:

- the task it automates;
- when it should be used (the trigger);
- the exact steps and commands;
- what it must never do;
- whether it needs scripts or reference files.

## 3. Name and describe it

- ID: lowercase kebab-case, 1-64 characters, unique in `skills/`. The directory
  name is the ID.
- Frontmatter:

```markdown
---
name: Short display name
description: One or two sentences covering what the skill does and when to use it. Include the words a user is likely to type.
---
```

- Write the body in English, in the imperative, with numbered steps.
- Use plain `git`, `gh` and shell commands. Do not depend on a specific agent's
  tools; when a decision is needed, say "ask the user" and optionally note that
  a dedicated question tool may be used.
- Keep it under roughly 150 lines. Move long output samples to `references/`.
- Scripts go beside `SKILL.md`, for example `skills/<id>/scripts/run.mjs`, and
  must be referenced by relative path.

## 4. Write it

Harness repository:

```text
skills/<id>/SKILL.md
skills/<id>/scripts/...      (optional)
skills/<id>/references/...   (optional)
```

Then add the skill to the index in `skills/README.md`.

Project proposal:

```text
docs/skill-proposals/<id>.md
```

Use the same frontmatter and body, plus a short section explaining why the
project needs it.

## 5. Validate

- The file is named exactly `SKILL.md` and lives in `skills/<id>/`.
- The frontmatter has `name` and `description`.
- `description` states when to use the skill.
- No absolute paths, no project-specific secrets, no references to the harness
  repository path.
- Commands are copy-pasteable and use placeholders such as `<id>`.
- The boundaries section exists when the skill performs git, release or file
  writes.

## Boundaries

- Never write into `.agent/`.
- Never add a skill that duplicates an existing one; extend the existing skill
  instead.
- Never include credentials, tokens or user-specific paths.
- Never change the locked decisions in `setup/decisions.md` through a skill.
