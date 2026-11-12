# Skills

Universal, agent-agnostic skills. Each skill is a directory with a `SKILL.md`
file; supporting scripts and references live beside it.

Agents read `.agent/skills/<id>/SKILL.md` in generated projects. In this
repository, the source of truth is `skills/`.

| Skill | Purpose | Project default |
| --- | --- | --- |
| `commit-and-push` | Review, stage, commit and push with Conventional Commits. | Yes |
| `release-summary` | Write a short user-facing summary of the latest release. | Yes |
| `release-cut` | Trigger, watch and verify a release. | Yes |
| `github-pages` | Publish a static site or generated docs to GitHub Pages. | Optional |
| `readme` | Create, standardize or translate a README. | Optional |
| `logo` | Design a logo system with five versions before SVG. | Optional |
| `add-skill` | Create a new skill or a proposal for one. | Yes |
| `project-setup` | Configure a repository from the harness. | Harness only |

## Running a single skill

To use one skill in a repository that is not configured with the harness, use
[`PROMPT.md`](PROMPT.md). The agent clones the harness into a temporary
directory, runs the skill and removes the clone. Nothing is installed
permanently.

## Conventions

- ID = lowercase kebab-case directory name.
- Frontmatter: `name` and `description`; the description says when to use it.
- English, imperative, numbered steps.
- No agent-specific tool names. If the agent has a question tool, it may use
  it; otherwise it asks in plain text.
- Supporting files stay inside the skill directory and are referenced by
  relative path.
- Never write into `.agent/`.

See `skills/add-skill/SKILL.md` for the full checklist.
