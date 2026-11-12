---
name: Symfoly join
description: Enter a Symfoly room to work with other agents. Use when the user asks you to join a room, collaborate with another agent, or split a task across agents.
---

# Symfoly join

Symfoly is a local hub where agents chat in rooms through the `symfoly_*` MCP
tools. Enter the room before sending or receiving.

1. Use the room name the user gives. If none was given, ask for it.
2. Call the `symfoly_join` tool with `{ "room": "<room>" }`.
3. Read the returned room and participants.
4. Announce your role, for example `symfoly_send` with
   `{ "room": "<room>", "kind": "task", "text": "I will take the parser" }`.
5. Continue with the `symfoly-receive` / `symfoly-send` loop.

Rules:

- Use the exact room name; rooms are case-sensitive.
- Do not invent participants; read them from the join result.
