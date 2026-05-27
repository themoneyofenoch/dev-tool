---
description: Full project audit — deps, perf, patterns, security, DX. Industry-standard suggestions with auto-fix option.
agent: Atlas
---

Audit this project for industry-standard quality. Be thorough, opinionated, and practical.

## Phase 1: Scan

Run these in parallel to understand the project:

- **Stack**: `ls` project root, read `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` (whichever exists)
- **Structure**: `find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' | head -100`
- **Deps**: read lockfile or manifest for outdated/heavy/unneeded deps
- **Lint/Format config**: check for eslint, prettier, ruff, biome, etc.
- **Test setup**: check for test runner config, coverage
- **CI/CD**: check for `.github/workflows`, `Makefile`, `Dockerfile`
- **Git health**: check `.gitignore`, hooks, commit style

## Phase 2: Analyze

Grade the project A-F on each category, then give specific suggestions:

### 1. Dependencies & Libraries
- Are deps minimal, well-maintained, and the best-in-class for their purpose?
- Suggest better alternatives (e.g., zod vs joi, vitest vs jest, biome vs eslint+prettier)
- Flag unused, duplicate, or bloated deps
- Check for known vulnerabilities (`npm audit`, `pip audit`, or equivalent)

### 2. Performance
- Bundle size / build time / startup time
- Lazy loading, tree-shaking, code splitting where applicable
- Unnecessary re-renders, heavy computations, memory leaks
- Caching strategies
- Database/query optimization if applicable

### 3. Code Patterns & Architecture
- File/folder structure (clean, scalable)
- Separation of concerns (routes, services, data layer)
- Error handling (consistent, typed)
- Type safety (strict mode, no `any`, proper generics)
- State management pattern
- API design (RESTful, versioned, consistent)

### 4. Security
- No secrets in code
- Input validation / sanitization
- Auth/cookie/CSRF best practices
- Dependency vulnerabilities
- HTTPS, headers, CSP

### 5. Developer Experience (DX)
- Fast feedback loop (hot reload, fast tests)
- Good error messages
- Consistent code style (formatter + linter)
- Type checking
- Documentation (README, inline for complex logic)
- Scripts in package.json / Makefile for common tasks

### 6. Testing
- Unit tests for logic
- Integration tests for APIs
- Coverage threshold
- Fast test runner
- CI integration

### 7. CI/CD & DevOps
- GitHub Actions or equivalent
- Lint + typecheck + test on push
- Automated deploys
- Docker / containerization if applicable
- Environment variable management

## Phase 3: Report

Print a clean report in this format:

```
## Audit Report — <project-name>

| Category            | Grade | Issues |
|---------------------|-------|--------|
| Dependencies        | B     | 3      |
| Performance         | A     | 1      |
| Code Patterns       | C     | 5      |
| Security            | B+    | 2      |
| Developer Experience| A-    | 1      |
| Testing             | D     | 4      |
| CI/CD               | F     | 3      |

### Top 5 Quick Wins (biggest impact, least effort)
1. ...
2. ...
3. ...
4. ...
5. ...

### Top 5 High-Impact Improvements
1. ...
2. ...
3. ...
4. ...
5. ...

### Suggested Library Upgrades
| Current | Suggested | Why |
|---------|-----------|-----|
| ...     | ...       | ... |
```

## Phase 4: Action

After the report, ask the user:

"**What would you like to do?**
1. Fix all safe improvements (auto-fix lint config, add missing .gitignore entries, update deps)
2. Pick specific categories to improve
3. Just save this report for later"

If option 1 or 2, implement the changes following the project's existing conventions.

If $ARGUMENTS is provided, focus the audit only on those categories (e.g., `/audit security perf`).
