---
description: Create a pull request for current branch
agent: Atlas
---
Create a pull request from the current branch.

Steps:
1. Run `git status` to confirm working tree is clean
2. Run `git log main..HEAD --oneline` to see all commits for this PR
3. Run `git diff main...HEAD` to see the full diff
4. Analyze all changes and draft a PR with:
   - Clear title summarizing the change
   - Body with Summary, Changes, and Testing sections
   - Reference any related issues
5. Push the branch to remote if not already pushed
6. Create the PR using `gh pr create`

If $ARGUMENTS is provided, use it as the target branch or additional context.
