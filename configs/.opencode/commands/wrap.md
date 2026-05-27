---
description: Wrap up session — review, commit, push, PR if needed
agent: Atlas
---
You finished working. Now wrap everything up cleanly.

Steps:

1. **Git check** — check if the current directory is inside a git repo:
   - Run `git rev-parse --show-toplevel` to find the repo root
   - If the repo root is a PARENT directory (not the current project), warn the user:
     "This project doesn't have its own git repo. The git repo is at <root>. 
     Run `git init` in this project first, or the /done command can't isolate changes for this project."
   - If there is no git repo at all, offer to initialize one with `git init`

2. **Status check** — run `git status` and `git diff` scoped to the current project directory only
   - Use `git status .` and `git diff .` to only see changes in this project
   - Ignore changes from parent/sibling directories

3. **Review** — briefly scan the changes for obvious issues (secrets, debug code, console.logs)

4. **Clean up** — remove any leftover debug code, console.logs, TODO markers you added

5. **Commit** — stage relevant files (only in this project) and create a clear commit message following the project's existing style

6. **Push** — check if a remote is configured (`git remote`):
    - If remote exists, push the branch
    - If no remote, check if `gh` CLI is available (`gh auth status`):
      - If `gh` is available, offer: "No remote configured. Want me to create a GitHub repo and push? (public/private)"
        - If yes: run `gh repo create <repo-name> --public|--private --source=. --push`
        - If no, print the manual steps: `git remote add origin <url>` and `git push -u origin <branch>`
      - If `gh` is NOT available, remind the user: "No remote configured and `gh` CLI not found. To push:
        1. Install gh: https://cli.github.com
        2. Or manually: `git remote add origin <your-github-repo-url>` then `git push -u origin <branch>`"

7. **PR check** — if this branch is not main/master, ask: "Want me to create a pull request?"
   - If yes, create a PR with `gh pr create`
   - If no, skip

8. **Summary** — print a short summary:
   - What was changed
   - Commit hash
   - Branch name
   - Remote URL if pushed

If $ARGUMENTS is provided, use it as the commit message or additional context.

Do NOT push if there are uncommitted secrets, .env files, or large generated files.
Always confirm before pushing to main/master.
