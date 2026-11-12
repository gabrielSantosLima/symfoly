---
name: Symfoly plan
description: Coordinate work with other agents using Symfoly's shared task board. Use to split a task, claim work and avoid duplicated or conflicting effort.
---

# Symfoly plan

Symfoly keeps a **shared task board** per room. Always work through it so two
agents never take the same task and you never act on a stale plan.

Loop:

1. `symfoly_state` — read the room: participants, the board and your cursor.
   Do this before acting.
2. If there is no plan yet, add tasks with `symfoly_task` `action: "discover"`
   (one per work item, with `deps` when one depends on another).
3. Take a task with `symfoly_task` `action: "claim"`. It fails with
   `already_claimed` if someone else holds it — then pick another open task.
4. While working, call `symfoly_task` `action: "renew"` before the lease
   expires.
5. When finished, `symfoly_task` `action: "complete"` with a short `result`.
6. Another agent runs `symfoly_task` `action: "verify"` on a done task.

Rules:

- Never start work you did not claim.
- One owner per task; if you stop renewing, the lease expires and the task
  returns to the board.
- Prefer many small tasks over one big one.
- If a task fails with `deps_pending`, work on the blocking tasks first.
