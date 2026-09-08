# Hooks & Skills

Hooks provide safety and automation around tool execution. Skills are reusable prompt templates that enhance agent capabilities.

## Hooks

**File**: `internal/hook/hook.go`

Hooks intercept tool execution at two points: before the tool runs (pre-hook) and after it completes (post-hook). They can inspect, modify, or block tool calls.

### Hook Interface

```go
type Hook struct {
    ID          string
    Name        string
    Description string
    Tools       []string          // Tool names this hook applies to ("*" for all)
    Phase       string            // "pre" or "post"
    Check       CheckFunc         // Go function hook
    Command     string            // Shell command hook (alternative to Check)
}

type CheckFunc func(tool string, input map[string]any) *HookResult

type HookResult struct {
    Blocked bool
    Reason  string
    Modified map[string]any      // Modified input (pre-hooks only)
}
```

A hook can be implemented as either a Go function (`Check`) or a shell command (`Command`). Shell command hooks receive tool input as JSON on stdin and return a JSON result.

### Pre-Hooks

Pre-hooks run before tool execution. They can:

- **Block** the tool call (return `Blocked: true` with a reason)
- **Modify** the input parameters (return `Modified` with altered values)
- **Pass** silently (return nil)

```go
// Example: prevent writing to protected directories
func safetyHook(tool string, input map[string]any) *HookResult {
    if tool == "write" || tool == "edit" {
        path := input["path"].(string)
        if strings.HasPrefix(path, "/etc/") || strings.HasPrefix(path, "/usr/") {
            return &HookResult{
                Blocked: true,
                Reason:  "Cannot modify system directories",
            }
        }
    }
    return nil
}
```

### Post-Hooks

Post-hooks run after tool execution. They receive the tool name, input, and result. They're used for logging, analytics, or triggering side effects:

```go
func auditHook(tool string, input map[string]any, result string) {
    log.Printf("[audit] tool=%s input=%v result_len=%d", tool, input, len(result))
}
```

### Hook Manager

**File**: `internal/hook/manager.go`

```go
type Manager struct {
    hooks []Hook
    mu    sync.RWMutex
}

func (m *Manager) Register(hook Hook)
func (m *Manager) Unregister(id string)
func (m *Manager) RunPre(tool string, input map[string]any) *HookResult
func (m *Manager) RunPost(tool string, input map[string]any, result string)
```

`RunPre()` executes all matching pre-hooks in registration order. The first hook that blocks wins. `RunPost()` runs all matching post-hooks (no blocking).

### Built-in Safety Hooks

The operator ships with safety hooks that are always active:

- **Path traversal prevention** — blocks reads/writes outside the project directory
- **System directory protection** — blocks modifications to `/etc`, `/usr`, `/sys`
- **Destructive command guard** — warns on `rm -rf`, `git push --force`, etc.

---

## Skills

**File**: `internal/skill/skill.go`

Skills are reusable prompt templates that get injected into the agent's system prompt when they match the user's task.

### Skill Structure

```yaml
---
id: docker-deploy
name: Docker Deployment
description: "Guides agent through Docker container deployment"
triggers:
  - pattern: "deploy|container|docker"
    type: regex
  - pattern: "kubernetes|k8s"
    type: regex
agents:
  - coder
  - architect
tags:
  - devops
  - deployment
---
When deploying with Docker:

1. Check for existing Dockerfile — if none, create one
2. Verify .dockerignore exists
3. Build the image: `docker build -t {{project_name}} .`
4. Test locally: `docker run -p 8080:8080 {{project_name}}`
5. Push to registry if deployment target specified

Always prefer multi-stage builds to minimize image size.
```

### Trigger Matching

Skills are activated when their triggers match the user's task:

```go
type Trigger struct {
    Pattern string
    Type    string   // "regex" or "keyword"
}
```

- **regex** — compiled regex matched against the task text
- **keyword** — simple substring match (case-insensitive)

### Variable Expansion

Skills support `{{variable}}` placeholders that are expanded at runtime:

| Variable | Source | Example |
|----------|--------|---------|
| `{{project_name}}` | Project directory name | `my-app` |
| `{{project_path}}` | Full project path | `/home/user/my-app` |
| `{{language}}` | Detected language | `typescript` |
| `{{framework}}` | Detected framework | `vue` |
| `{{agent_id}}` | Current agent ID | `coder` |
| `{{mode}}` | Current mode | `code` |

### Per-Agent Filtering

Skills specify which agents they apply to via the `agents` field. If empty, the skill applies to all agents. The skill manager filters based on the active agent:

```go
func (m *Manager) Match(task string, agentID string) []*Skill {
    var matched []*Skill
    for _, skill := range m.skills {
        if skill.MatchesAgent(agentID) && skill.MatchesTrigger(task) {
            matched = append(matched, skill)
        }
    }
    return matched
}
```

### Skill Manager

```go
type Manager struct {
    skills []*Skill
    mu     sync.RWMutex
}

func (m *Manager) Load(dir string) error      // Load skills from directory
func (m *Manager) Register(skill *Skill)
func (m *Manager) Unregister(id string)
func (m *Manager) Match(task, agentID string) []*Skill
func (m *Manager) Get(id string) (*Skill, bool)
func (m *Manager) List() []*Skill
```

Skills are loaded from:
1. Built-in directory (`operator/skills/`)
2. User directory (`{dataDir}/skills/`)
3. Space directories (when spaces are loaded)

---

## Space Integration

Spaces can provide their own hooks and skills by placing files in their respective directories:

```
my-space/
├── hooks/
│   ├── pre-write.yaml     # Hook config
│   └── pre-write.sh       # Hook implementation
├── skills/
│   └── specialist.yaml    # Skill with triggers
├── agents/
│   └── assistant.yaml
└── manifest.json
```

When a space is loaded via `internal/space/`, its hooks and skills are registered. When unloaded, they're removed. This keeps the operator clean between space switches.
