---
description: Resume work — read CONTEXT.md and pick up where you left off
agent: Atlas
---

The user wants to continue working. Do this:

1. **Find context** — look for `CONTEXT.md`:
   - First check the current directory
   - If not found, check the project path saved in `~/.config/kilo/last-session.json` (store project path there on /stop)
   - If neither exists, ask "No saved session found. What would you like to work on?" and stop.

2. **Switch to project** — if the saved project path differs from current directory, tell the user: "Last session was in <path>. Switch to that directory first."

3. **Summarize** — print a quick summary of where you left off

3. **Continue** — pick up from the next steps listed in CONTEXT.md

4. **Update** — as you complete items, update CONTEXT.md

If $ARGUMENTS is provided, it overrides the saved context — work on that instead.
