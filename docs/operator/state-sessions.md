# State & Sessions

The operator uses file-backed JSON for all persistent state. No database — just JSON files protected by read-write mutexes.

## State Store

**File**: `internal/state/store.go`

```go
type Store struct {
    dir  string           // State directory path
    mu   sync.RWMutex     // Thread-safe access
    data map[string]any   // In-memory cache
}

func NewStore(dir string) *Store
func (s *Store) Get(key string) (any, bool)
func (s *Store) Set(key string, value any) error
func (s *Store) Delete(key string) error
func (s *Store) Load(filename string) error
func (s *Store) Save(filename string) error
func (s *Store) All() map[string]any
```

### How It Works

The state store loads JSON files into memory at boot and writes back on mutation. All access is guarded by `sync.RWMutex`:

- **Reads** acquire a read lock (concurrent reads allowed)
- **Writes** acquire a write lock (exclusive access, flushes to disk)

### State Files

The operator maintains several state files under `{dataDir}/state/`:

| File | Contents |
|------|----------|
| `settings.json` | User preferences (default provider, theme, editor settings) |
| `credentials.json` | OAuth tokens, API keys (encrypted at rest) |
| `providers.json` | Provider configuration and status |
| `sessions.json` | Session index (list of saved sessions) |
| `mcp-servers.json` | MCP server configurations |
| `spaces.json` | Installed spaces and their state |
| `hooks.json` | Custom hook configurations |
| `skills.json` | Custom skill configurations |
| `context.json` | Last active project, mode, component context |

### Thread Safety

The `RWMutex` ensures safe concurrent access from multiple goroutines (e.g., a streaming response writing tool results while a new request reads agent config):

```go
func (s *Store) Get(key string) (any, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    val, ok := s.data[key]
    return val, ok
}

func (s *Store) Set(key string, value any) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.data[key] = value
    return s.flush()  // Write to disk
}
```

---

## Sessions

Sessions track agent execution history — both the internal execution turns and the UI-facing block model.

### Agent Sessions

**File**: `internal/session/session.go`

An agent session records the full execution history of a dispatch:

```go
type Session struct {
    ID        string
    AgentID   string
    Turns     []agent.Turn
    StartedAt time.Time
    EndedAt   time.Time
    Status    string          // "active", "done", "error"
    Usage     Usage
}

type Usage struct {
    InputTokens  int
    OutputTokens int
    TotalTokens  int
}
```

Sessions are created when `runner.Dispatch()` or `runner.DispatchStream()` is called and completed when the agent loop finishes.

### Session Manager

```go
type Manager struct {
    sessions map[string]*Session
    store    *state.Store
    mu       sync.RWMutex
}

func (m *Manager) Create(agentID string) *Session
func (m *Manager) Get(id string) (*Session, bool)
func (m *Manager) List() []*Session
func (m *Manager) Save(id string) error
func (m *Manager) Load(id string) (*Session, error)
func (m *Manager) Delete(id string) error
```

### Chat Sessions (UI Block Model)

**File**: `internal/chatsession/chatsession.go`

Chat sessions provide the higher-level block model that the frontend renders:

```go
type ChatSession struct {
    ID        string
    Turns     []ChatTurn
    AgentID   string
    CreatedAt time.Time
    UpdatedAt time.Time
}

type ChatTurn struct {
    ID        string
    Request   []RequestBlock
    Response  []ResponseBlock
    Status    string            // "pending", "streaming", "done", "error"
    Timestamp time.Time
}
```

This maps to the frontend's `Turn` type described in [Assistant & Blocks](/frontend/assistant-system).

### Block Types

Request blocks (user input):

```go
type RequestBlock struct {
    Type    string   // "text", "image", "file"
    Content string
    Meta    map[string]any
}
```

Response blocks (agent output):

```go
type ResponseBlock struct {
    Type    string   // "text", "tool", "code", "error", "status", etc.
    Content string
    Meta    map[string]any
}
```

### Session Persistence

Sessions are saved as JSON files under `{dataDir}/sessions/`:

```
sessions/
├── index.json                    # Session list with metadata
├── abc123.json                   # Full session data
├── def456.json
└── ...
```

The index file keeps lightweight metadata for the session list UI:

```json
[
  {
    "id": "abc123",
    "agent_id": "general",
    "title": "Build a login page",
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T10:05:00Z",
    "turn_count": 5
  }
]
```

Full session data (with all turns, tool calls, and content) is loaded on demand when a session is restored.

### Session Scope

Different assistant types use different session scopes:

| Scope | Behavior | Used By |
|-------|----------|---------|
| `global` | Single session across all projects | general |
| `assistant` | Per-assistant type session | brainstorm |
| `project` | Per-project session (cleared on project switch) | architect, coder |

The session manager handles scope transitions — when the user switches projects, `project`-scoped sessions are saved and the new project's sessions are loaded.
