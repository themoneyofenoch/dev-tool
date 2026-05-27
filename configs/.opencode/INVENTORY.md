# OpenCode Inventory

## Plugins (8)

| Plugin | Source |
|---|---|
| `oh-my-openagent` | `oh-my-openagent@latest` |
| `opencode-dcp` | `@tarquinen/opencode-dcp@latest` |
| `opencode-deepseek-thinking-fix` | `opencode-deepseek-thinking-fix` |
| `superpowers` | `superpowers@git+https://github.com/obra/superpowers.git` |
| `opencode-supermemory-max` | `opencode-supermemory-max` |
| `opencode-pty` | `opencode-pty` |
| `opencode-agent-skills` | `opencode-agent-skills@0.7.0` |
| `opencode-websearch-cited` | `opencode-websearch-cited@1.2.0` |

## MCPs (2)

| MCP | Type | Purpose |
|---|---|---|
| `clipboard-vision` | Local (Python venv) | Clipboard image vision via Groq API |
| `gitnexus` | Local (Go binary) | Code knowledge graph — Cypher queries, impact analysis, execution flows, API route mapping |

## Global npm Packages (4)

| Package | Version | Author | Description |
|---|---|---|---|
| `opencode-supermemory-max` | 2.1.0 | kandotrun | Enhanced memory plugin — Japanese support, incremental capture, signal extraction, 3-tier scopes |
| `opencode-pty` | 0.3.4 | shekohex | Interactive PTY management — background processes, send input, regex-filtered output |
| `opencode-websearch-cited` | 1.2.0 | ghoulr | LLM-grounded web search with citations |
| `opencode-agent-skills` | 0.7.0 | — | Dynamic skills plugin for reusable AI agent skills |

## Skills

### User-installed (1)

| Skill | Trigger | Description |
|---|---|---|
| `graphify` | `/graphify` | Any input → knowledge graph → clustered communities → HTML + JSON + audit report |

### Built-in (5)

| Skill | Trigger | Description |
|---|---|---|
| `playwright` | `/playwright` | Browser automation, testing, screenshots, web scraping |
| `frontend-ui-ux` | `/frontend-ui-ux` | Designer-turned-developer UI/UX |
| `git-master` | `/git-master` | Atomic commits, rebase/squash, history search |
| `review-work` | `/review-work` | Post-implementation 5-agent parallel review |
| `ai-slop-remover` | `/ai-slop-remover` | Remove AI code smells from files |

## Commands (22 user-defined)

| Command | Model | Agent | Description |
|---|---|---|---|
| `apppub` | default | — | Auto-fill AppPub from current project |
| `bob` | default | — | Full project audit (deps, perf, patterns, security, DX) |
| `build` | default | — | Run production build and fix errors |
| `commit` | default | — | Well-structured git commit |
| `debug` | V4 Pro | Prometheus | Debug plan — no edits until approved |
| `debug-exec` | V4 Flash | Atlas | Execute debug plan |
| `deploy` | default | — | Auto-detect platform, auto-commit, auto-retry |
| `doc` | V4 Flash | Atlas | Write documentation |
| `explore` | default | — | Explore and understand codebase |
| `feat` | V4 Pro | Prometheus | Feature planning |
| `gentest` | default | — | Generate comprehensive tests |
| `init-agents` | default | — | Auto-generate AGENTS.md |
| `keywords` | default | — | Keyword clusters + 30-day content calendar |
| `lint` | default | — | Lint + auto-fix |
| `perf` | V4 Pro | Prometheus | Performance profiling |
| `pr` | default | — | Create pull request |
| `refresh` | default | — | Resume from CONTEXT.md |
| `rev` | V4 Pro | Prometheus | Code review |
| `review` | default | — | Review current changes |
| `start` | default | — | Start app on browser + iOS simulator |
| `stop` | default | — | Clean up + save state |
| `test` | V4 Flash | Atlas | Generate tests |
| `wrap` | default | — | Wrap session (review → commit → push → PR) |

## Quick Shortcuts

| Shortcut | Action |
|---|---|
| `44` | Switch to DeepSeek V4 Pro |
| `ff` | Switch to DeepSeek V4 Flash |
| `fix` | Lint + type check + fix all |
| `type` | TypeScript type check + fix |
| `runn` | Start native mobile app (iOS + Android simulators) |
| `newapp` | Build IPA → TestFlight upload |
| `save` | Auto-save session changelog |
| `todo` | Show pending TODOs with priority |
| `runl` | Start local dev server |
| `gra` | Graphify current directory |

## AI Providers

| Provider | Models |
|---|---|
| **DeepSeek** | `deepseek-v4-flash` (default, 400K context), `deepseek-v4-pro` (1M context, reasoning, 393K output) |
| **Xiaomi Mimo** | `mimo-v2-omni`, `mimo-v2-pro`, `mimo-v2.5`, `mimo-v2.5-pro` |
| **Groq** | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it` |

## oh-my-openagent Agent Model Mapping

| Agent | Primary Model | Fallback | Role |
|---|---|---|---|
| Sisyphus | V4 Pro | V4 Flash | Main orchestrator |
| Prometheus | V4 Pro | V4 Flash | Strategic planner |
| Metis | V4 Pro | V4 Flash | Pre-plan consultant |
| Momus | V4 Pro | V4 Flash | Plan critic |
| Oracle | V4 Pro | V4 Flash | Architecture / debugging |
| Atlas | V4 Flash | V4 Pro | Plan executor |
| Sisyphus-Junior | V4 Flash | V4 Pro | Focused task executor |
| Explore | V4 Flash | — | Codebase search |
| Librarian | V4 Flash | — | Docs / code lookup |
| Multimodal-Looker | V4 Flash | — | Image / PDF analysis |
| Hephaestus | — | — | **Disabled** (requires GPT) |
