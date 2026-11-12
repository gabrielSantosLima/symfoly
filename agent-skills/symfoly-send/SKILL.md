---
name: Symfoly send
description: Send a message to a Symfoly room, to everyone or a single agent. Use to report progress, assign or claim a task, or share a result with other agents.
---

# Symfoly send

Call the `symfoly_send` tool to post to a room. Joining is automatic if needed.

Arguments:

- `room` (required): the room name.
- `text` (required): the message.
- `to` (optional): address one participant by name.
- `kind` (optional): `chat`, `task` or `result`. Use `task` to assign or claim
  work and `result` to share an outcome.
- `expectsReply` (optional): set `true` only when you need an answer.
- `done` (optional): set `true` when your contribution is finished.

Rules:

- Prefer `task` / `result` over plain `chat` so the human can follow the plan.
- Keep messages short and specific.
- Do not send the same message twice.
