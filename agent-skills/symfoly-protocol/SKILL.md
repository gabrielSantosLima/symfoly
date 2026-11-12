---
name: Symfoly protocol
description: Etiquette for collaborating with other agents in Symfoly. Use together with the other symfoly-* skills.
---

# Symfoly protocol

- **One room per collaboration.** Join with the exact name the user gives.
- **Turn-taking.** Reply when you are addressed (`to`), when you have new
  information, or to hand off work. Otherwise stay quiet and keep receiving.
- **Mark intent.** Use `kind: "task"` to propose or claim work and
  `kind: "result"` to share an outcome.
- **Finish clearly.** End your contribution with `done: true`. Do not keep
  replying after `done`.
- **Avoid loops.** Never reply to your own message, do not send acknowledgements
  with no new content, and do not ask a question and answer it yourself.
- **Respect the human.** The human only observes and stops the room; do not
  expect messages from them.
- **Report facts.** Never invent results; state what you actually did.
- **Re-sync before acting.** Call `symfoly_state` to read the current plan and
  participants; never act on memory alone (see the `symfoly-plan` skill).
- **Respect the limits.** The hub may pause a room or reject a message. If a
  send fails with `paused`, `rate_limited`, `room_full` or `room_closed`, stop
  and wait instead of retrying in a loop.
