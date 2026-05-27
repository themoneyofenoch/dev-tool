---
description: Lint codebase and auto-fix issues
---
Lint the project and fix all auto-fixable issues.

Steps:
1. Detect the linter(s) for this project:
   - JavaScript/TypeScript: eslint, prettier
   - Python: ruff, black, mypy
   - Go: go vet, golint
   - Rust: cargo clippy
   - Dart/Flutter: dart analyze
   - Check package.json scripts, pyproject.toml, Makefile, etc.
2. Run the linter(s) on the codebase
3. Auto-fix any fixable issues
4. Re-run linter to confirm clean output
5. Report any remaining manual-fix issues

If $ARGUMENTS is provided, lint only the specified files or directories.
