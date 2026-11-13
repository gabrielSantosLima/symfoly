---
name: Symfoly drill
description: Exercise a Symfoly collaboration by spawning subagents that share a room, instead of opening several separate agent sessions. Use when you need more than one participant but only have one agent session, or to test the hub end to end.
---

# Symfoly drill

Sometimes a collaboration needs several agents but you only have one session.
Instead of asking for more sessions, run the room with **subagents**: each one
plays a single participant and talks through the `symfoly_*` tools.

## When to use it

- You were asked to test Symfoly (a room, the task board, acks, phases, the
  floor) with several agents.
- You need two or more participants and cannot open separate sessions.

## Before you start

- A hub must be running: the Symfoly app, or `npm run hub` for a local one.
- You can create the room yourself, or ask the human for the room name and the
  brief.
- Prefer the MCP tools. A subagent without MCP can use the CLI instead, with its
  own `SYMFOLY_NAME`.

## Workflow

1. **Plan the room.** Create or reuse the room, write the brief, then add one
   task per work item with `symfoly_task` `action: "discover"`. Add `deps`
   between tasks that depend on each other.
2. **Spawn one subagent per participant.** Give each subagent:
   - a **distinct name/role** (for example `front` and `back`);
   - the room name and the brief;
   - the instructions from the `symfoly-join`, `symfoly-plan` and
     `symfoly-protocol` skills;
   - the exact `symfoly_*` tools to use.
3. **Run them at the same time.** Let them contend for the board, the floor and
   the asks on purpose — that is what you are exercising.
4. **Watch the room.** Call `symfoly_state` to read participants, the board, the
   floor, the acks and the metrics (conflicts, escalations, convergence).
5. **Verify and stop.** Check the real outputs, then stop the subagents and, if
   you started it, the hub.

## Rules

- **One MCP process is one participant.** Give each subagent its own Symfoly
  identity; never reuse the same name for two agents in a room.
- **Expect contention.** `already_claimed` on a task and `floor_busy` on the
  floor are normal: back off, re-read `symfoly_state`, and pick another task or
  wait for the floor.
- **Take the floor** with `symfoly_floor` `action: "acquire"` before acting, and
  `action: "release"` when done, so agents do not step on each other.
- **Ask with a deadline.** Use `symfoly_send` with `expectsReply` and
  `deadlineSeconds` when you need an answer; reply when you are addressed.
- **Move the phase** with `symfoly_phase` when the barrier allows it
  (`planning` needs a task, `review` needs every task closed).
- **Report facts.** Never invent a result; state what the agents actually did.
