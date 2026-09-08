# Agent System

Agents are the core abstraction for AI interactions in the operator. Each agent defines a persona with a system prompt, allowed tools, model preference, and behavioral parameters.

## Agent Configuration

**File**: `internal/agent/config.go`

Agents are configured via YAML files with markdown body for the system prompt:

```yaml
---
id: architect
name: Architect
description: "Software architecture and design planning"
model: claude-sonnet-4-5-20250514
temperature: 0.3
max_turns: 30
tools:
  - read
  - glob
  - grep
  - listdir
  - bash
tags:
  - planning
  - architecture
---
You are a software architect. Analyze codebases, design systems, and create implementation plans.

When asked to plan:
1. Understand the current codebase structure
2. Identify dependencies and constraints
3. Propose a clear, actionable plan with steps

Always read relevant code before making recommendations.
```

### Config Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | required | Unique identifier |
| `name` | string | required | Display name |
| `description` | string | `""` | Short description shown in UI |
| `model` | string | `""` | Preferred model (falls back to default) |
| `temperature` | float | `0.7` | Sampling temperature |
| `max_turns` | int | `20` | Maximum agent turns before stopping |
| `tools` | []string | `[]` | Allowed tool IDs |
| `tags` | []string | `[]` | Categorization tags |
| `skills` | []string | `[]` | Skill IDs to load for this agent |

The YAML frontmatter is separated from the markdown system prompt by `---` delimiters.

## Built-in Agents

The operator ships with 5 built-in agents:

| Agent | Model | Max Turns | Tools | Purpose |
|-------|-------|-----------|-------|---------|
| `general` | default | 20 | all built-in | General-purpose chat |
| `brainstorm` | default | 15 | read, glob, grep | Idea exploration (read-only) |
| `architect` | sonnet | 30 | read, glob, grep, listdir, bash | Design and planning |
| `coder` | sonnet | 50 | all built-in | Code writing and editing |
| `project` | default | 25 | all built-in | Project management |

Built-in configs live in `operator/agents/` and are loaded at boot.

## Agent Registry

**File**: `internal/agent/registry.go`

The registry manages all available agents (built-in + space-provided + custom):

```go
type Registry struct {
    agents map[string]*Config
    mu     sync.RWMutex
}

func (r *Registry) Get(id string) (*Config, bool)
func (r *Registry) List() []*Config
func (r *Registry) Register(cfg *Config)
func (r *Registry) Unregister(id string)
```

### Loading Order

1. **Built-in agents** — from `operator/agents/` directory
2. **Custom agents** — from `{dataDir}/agents/` directory
3. **Space agents** — loaded when a space is activated

Space agents are prefixed with `space:{spaceId}:` to avoid collisions.

## Types

**File**: `internal/agent/types.go`

```go
// Turn represents one LLM call + response cycle
type Turn struct {
    Request     Request
    Response    Response
    ToolCalls   []ToolExecution
    TurnNumber  int
}

// ToolExecution tracks a single tool call within a turn
type ToolExecution struct {
    Tool    string                 // Tool name
    Input   map[string]any         // Tool input parameters
    Result  string                 // Tool output
    IsError bool                   // Whether execution failed
    CallID  string                 // Unique call identifier
}

// Request is what gets sent to the LLM
type Request struct {
    Messages []Message
    Model    string
    Tools    []ToolDefinition
    System   string
}

// Response is what comes back from the LLM
type Response struct {
    Content    string
    ToolCalls  []ToolCall
    StopReason string             // 'end_turn', 'max_tokens', 'tool_use'
    Usage      Usage
}
```

## System Prompt Building

The runner builds the final system prompt by combining multiple sources:

```
Agent YAML body (base system prompt)
  + Project context (path, language, framework)
  + Active skills (matched by trigger)
  + Mode context (code vs UI)
  + Component context (if set)
  = Final system prompt
```

See [Runner Loop](./runner.md) for the full prompt assembly process.

## Space Agents

Spaces can define their own agents by placing YAML config files in their `agents/` directory:

```
my-space/
├── manifest.json
├── agents/
│   └── specialist.yaml    # Space-specific agent
├── tools/
└── hooks/
```

When a space is loaded, its agents are registered with the `space:{id}:` prefix. When the space is unloaded, they are removed from the registry. See [Space Integration](./hooks-skills.md#space-integration) for details.
