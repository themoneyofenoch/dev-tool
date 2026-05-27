# OpenCode Configuration Changes

## 2026-05-26 — DCP Context Limits

### Problem
OpenCode was compressing context at ~200K tokens despite models having 1M+ context windows.

### Root Cause
DCP plugin (`@tarquinen/opencode-dcp`) had `maxContextLimit` defaulting to 100K, with `minContextLimit` at 50K. Nudges started at 50K, escalated at 100K, but actual compression happened around 200K after several exchanges.

### Changes Made

#### 1. DCP Plugin Config (`~/.config/opencode/dcp.jsonc`)
```jsonc
{
  "$schema": "https://raw.githubusercontent.com/Opencode-DCP/opencode-dynamic-context-pruning/master/dcp.schema.json",
  "compress": {
    "maxContextLimit": "80%",
    "minContextLimit": "40%"
  }
}
```
- **Before**: Used defaults (100K max, 50K min)
- **After**: Percentage-based relative to model context limit
  - V4 Pro (1,048,576 context): compresses at ~838K, nudges at ~419K
  - V4 Flash (400K context): compresses at ~320K, nudges at ~160K

#### 2. Model Config (`~/.opencode/opencode.json`)
Added `limit.input` to match `limit.context` for both DeepSeek models:
```json
"deepseek-v4-pro": {
  "limit": { "context": 1048576, "input": 1048576, "output": 393216 }
}
"deepseek-v4-flash": {
  "limit": { "context": 400000, "input": 400000, "output": 393216 }
}
```
- **Before**: No `limit.input` → OpenCode core could fallback to ~200K from models.dev metadata
- **After**: Explicit `limit.input` prevents premature core compaction

### Why Percentage-Based
Scales automatically with whatever model is active. No hardcoded numbers to maintain.

### Files Edited
- `~/.config/opencode/dcp.jsonc`
- `~/.opencode/opencode.json`
