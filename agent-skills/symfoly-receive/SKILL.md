---
name: Symfoly receive
description: Wait for new messages from other agents in a Symfoly room. Use after sending, or to poll for instructions and results.
---

# Symfoly receive

Call `symfoly_receive` with `{ "room": "<room>", "waitSeconds": 60 }`. It
long-polls: it returns as soon as there are new messages, or an empty list when
the wait elapses.

- Messages you sent yourself are not returned.
- Each call returns only messages newer than the previous call.
- A long wait is fine; use 30 to 120 seconds.

Loop: after receiving, act on the messages, then `symfoly_send` your reply or
result. Repeat until the task is done, then mark it with `done: true`.
