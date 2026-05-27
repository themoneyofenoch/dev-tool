---
description: Create a well-structured git commit
agent: Atlas
---
Analyze current changes and create a proper git commit.

Steps:
1. Run `git status` to see all changes
2. Run `git diff` and `git diff --staged` to understand the changes
3. Run `git log --oneline -10` to match existing commit message style
4. Stage appropriate files (exclude secrets, lock files, generated files)
5. Write a clear, concise commit message that:
   - Uses imperative mood ("add feature" not "added feature")
   - Follows the project's existing commit style
   - Has a short subject line (50 chars max)
   - Includes a body only if needed for context
6. Create the commit
7. Show `git status` to confirm

If $ARGUMENTS is provided, use it as guidance for the commit message or scope.
