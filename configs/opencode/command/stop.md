---
description: Stop current task — clean up and save state for later
---

The user wants to stop. Do this immediately:

1. **Stop** — halt whatever you're doing right now. No more changes.

2. **Save state** — create/update `CONTEXT.md` in the project root with:
   - Project path (absolute): the current working directory
   - What was being worked on
   - What's done vs pending
   - Any important decisions made
   - Next steps to resume

3. **Save global pointer** — write `~/.config/kilo/last-session.json` with:
   ```json
   { "projectPath": "<absolute-path-to-project>", "timestamp": "<now>" }
   ```

4. **Print**: "Session saved to CONTEXT.md. Run /go to resume."

Do NOT commit unless $ARGUMENTS says to.
