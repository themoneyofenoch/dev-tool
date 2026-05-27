---
description: Review current changes for issues
agent: Atlas
---
Review all uncommitted changes in the current git repository.

Steps:
1. Run `git diff` and `git diff --staged` to see all changes
2. Run `git status` to see the full picture
3. Analyze every changed file for:
   - Bugs and logic errors
   - Security vulnerabilities
   - Performance issues
   - Missing error handling
   - Code style inconsistencies
   - Incomplete implementations
   - Missing tests
4. Provide a structured review with severity levels (critical, warning, suggestion)
5. If $ARGUMENTS is provided, focus the review on those specific files or concerns

Output format:
## Critical
## Warnings
## Suggestions
## Summary
