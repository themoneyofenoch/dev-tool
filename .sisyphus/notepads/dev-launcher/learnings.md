# Dev Launcher — Learnings

## Patterns & Conventions
- Inventory table has 7-8 columns (WeThePeople has extra Expo note in Status column). Parser uses cells[0-4] only (num, name, path, port, configType).
- Paths in inventory are relative to `/Users/ammaniel/myapps/` — prefixed with APPS_ROOT.
- WeThePeople is listed as "Next.js" in config type but actually uses Expo; handled as special case in `getStartCommand`.
- Port 8888 is reserved for Jupyter — handled by not assigning it to any project.

## Successful Approaches
- Markdown table parsing: split by `|`, trim cells, filter empties, parse numeric columns.
- ANSI color codes for green/gray dots without chalk dependency.
- `spawn` with `detached: true` + `child.unref()` allows launcher to exit independently.
- `shell: true` needed for `npx` resolution in some environments.
- `lsof -ti :{port}` for port-in-use detection (cross-platform on macOS).
- `process.on('SIGINT')` for graceful Ctrl+C handling with readline cleanup.

## Tech Stack
- Node.js built-ins only: fs, child_process, readline, path
- No npm dependencies
- macOS `open` command for browser launch
