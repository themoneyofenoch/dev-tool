---
description: Auto-generate AGENTS.md by scanning the project
agent: Atlas
---
Scan the current project and generate a comprehensive AGENTS.md file.

Steps:

1. **Detect project type** — look for:
   - `package.json` → Node.js/JS/TS
   - `pyproject.toml`, `setup.py`, `requirements.txt` → Python
   - `Cargo.toml` → Rust
   - `go.mod` → Go
   - `pubspec.yaml` → Dart/Flutter
   - `Gemfile` → Ruby
   - `pom.xml`, `build.gradle` → Java/Kotlin
   - `*.sln`, `*.csproj` → C#/.NET

2. **Scan project structure**:
   - List top-level directories and their purpose
   - Identify entry points (main files, index files, app files)
   - Find config files (tsconfig, eslint, prettier, vite, webpack, etc.)
   - Check for Docker, CI/CD, env files

3. **Extract commands** from the relevant config:
   - `package.json` scripts (test, lint, build, dev, start, typecheck)
   - `Makefile` targets
   - `pyproject.toml` tool configs
   - `Cargo.toml` profiles
   - `go.mod` + Makefile combos
   - Any `justfile`, `Taskfile.yml`, or similar

4. **Detect conventions**:
   - Language version from `.node-version`, `.python-version`, `rust-toolchain.toml`
   - Framework from dependencies (React, Next.js, Django, FastAPI, Axum, Flutter, etc.)
   - Testing framework (vitest, jest, pytest, cargo test, go test, etc.)
   - Linter/formatter (eslint, prettier, ruff, black, clippy, etc.)
   - Monorepo setup (turborepo, nx, lerna, workspaces)

5. **Check for existing AGENTS.md** — if one exists:
   - Read it and preserve any manual sections
   - Only add/update the auto-detected sections
   - Ask before overwriting

6. **Generate AGENTS.md** with this structure:

```
# Project: <name>

## Tech Stack
- Language: <detected>
- Framework: <detected>
- Runtime: <detected version>

## Commands
- Install: <command>
- Dev: <command>
- Build: <command>
- Test: <command>
- Lint: <command>
- Typecheck: <command> (if applicable)

## Project Structure
<tree of key directories with descriptions>

## Conventions
<detected from linter configs, existing code patterns>

## Architecture
<high-level description of how the codebase is organized>

## Notes
<any gotchas, special configs, or important details found>
```

7. Write the file to `AGENTS.md` in the project root.

If `$ARGUMENTS` is provided, use it as additional context or focus areas to document.
Do NOT overwrite any existing AGENTS.md without first reading and preserving its content.
