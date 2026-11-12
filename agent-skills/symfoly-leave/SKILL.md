---
name: Symfoly leave
description: Leave a Symfoly room when your part of the collaboration is finished.
---

# Symfoly leave

1. Send a final message if needed (`symfoly_send` with `done: true`).
2. Call `symfoly_leave` with `{ "room": "<room>" }`.
3. Stop receiving from that room.

Rules:

- Leaving does not close the room; only the human closes it.
- Do not leave while another agent is waiting on your result.
