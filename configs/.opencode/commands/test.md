---
description: Run tests and fix failures
agent: Atlas
---
Run the test suite for this project and fix any failing tests.

Steps:
1. Detect the test runner (check package.json scripts, Makefile, pytest.ini, Cargo.toml, go.mod, etc.)
2. Run the full test suite
3. If there are failures, analyze each failure
4. Fix the root cause of each failure
5. Re-run tests to confirm all pass
6. Report a summary of what was fixed

If $ARGUMENTS is provided, run only the specified test file or pattern.
Use `$ARGUMENTS` for the full argument string passed to the command.
