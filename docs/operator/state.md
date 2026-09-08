# State & Sessions

The operator manages persistent state (settings, credentials, context) through a file-backed JSON store and maintains agent sessions for conversation history.

## State Store

**File**: `operator/internal/state/store.go`

The state store provides thread-safe, file-backed JSON persistence:

```go
type Store struct {
    dir   string          // Base directory for state files
    mu    sync.RWMutex    // Thread safety
    cache map[string]interface{}  // In-memory cache
}

store.Get(key, &value)       // Read a value (from cache or disk)
store.Set(key, value)        // Write a value (to cache + disk)
store.Delete(key)            // Remove a value
store.List(prefix)           // List keys matching prefix
```

### Thread Safety

The store uses a `sync.RWMutex`:

- **Reads** acquire a read lock (multiple concurrent reads allowed)
- **Writes** acquire a write lock (exclusive access)
- Cache is always in sync with disk

### State Files

Each state domain is stored as a separate JSON file:

| File | Contents |
|------|----------|
| `settings.json` | User preferences (default provider, model, theme) |
| `credentials.json` | OAuth tokens and API keys (sensitive) |
| `context.json` | Active project path, mode, component |
| `mcp/servers.json` | MCP server configurations |
| `providers.json` | Custom provider configs |
| `sessions/index.json` | Session metadata index |

### State Module

**File**: `operator/internal/module/state/`

The state module exposes read/write endpoints over the transport:

```json
// Read
{ "type": "state.get", "payload": { "key": "settings" } }
→ { "result": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" } }

// Write
{ "type": "state.set", "payload": { "key": "settings", "value": { "provider": "anthropic" } } }
→ { "result": "ok" }
```

---

## Sessions

Sessions track agent conversation history for persistence and restoration.

### Agent Sessions

**File**: `operator/internal/session/`

Each dispatch creates an agent session:

```go
type Session struct {
    ID        string
    AgentID   string
    Turns     []Turn
    Usage     Usage
    Status    string    // "active", "completed", "error"
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

Agent sessions store the raw conversation data — messages, tool calls, results, token usage.

### Chat Sessions

**File**: `operator/internal/chatsession/`

Chat sessions provide the UI-facing block model. They wrap agent sessions with the block structure the frontend expects:

```go
type ChatSession struct {
    ID         string
    AgentID    string
    Turns      []ChatTurn
    Metadata   map[string]interface{}
}

type ChatTurn struct {
    ID        string
    Request   []RequestBlock
    Response  []ResponseBlock
    Status    string    // "pending", "streaming", "done", "error"
    Timestamp int64
}
```

Chat sessions are what the frontend saves/loads via the sessions module.

### Session Persistence

The sessions module handles save/load/list operations:

```json
// Save current session
{ "type": "sessions.save", "payload": { "id": "sess-123", "turns": [...] } }

// Load a session
{ "type": "sessions.load", "payload": { "id": "sess-123" } }

// List sessions
{ "type": "sessions.list" }
→ { "result": [{ "id": "sess-123", "agent": "general", "updatedAt": "..." }] }

// Delete a session
{ "type": "sessions.delete", "payload": { "id": "sess-123" } }
```

Sessions are stored as JSON files under `~/.construct/sessions/`:

```
sessions/
├── index.json          # Session metadata (id, agent, timestamps)
├── sess-abc123.json    # Full session data
└── sess-def456.json
```

---

## Context Manager

**File**: `operator/internal/context/`

The context manager tracks the active project and UI state:

```go
type Manager struct {
    ProjectPath string    // Active project directory
    Mode        string    // "code" or "ui"
    Component   string    // Selected UI component name
}
```

Context is set by the frontend and read by the runner when building system prompts:

```json
// Set active project
{ "type": "context.set_project", "payload": { "path": "/Users/me/my-project" } }

// Set mode
{ "type": "context.set_mode", "payload": { "mode": "code" } }

// Set component
{ "type": "context.set_component", "payload": { "component": "LoginForm" } }
```

The context is injected into the system prompt so agents know what project they're working in and what the user is looking at.

---

## OAuth Manager

**File**: `operator/internal/oauth/`

Manages OAuth credentials for LLM providers:

```go
type Manager struct {
    store    *state.Store
    providers map[string]OAuthProvider
}

manager.GetToken(providerID)          // Get stored token
manager.SetToken(providerID, token)   // Store token
manager.RefreshToken(providerID)      // Refresh expired token
manager.StartDeviceFlow(providerID)   // Begin device code auth
```

### Device Code Flow

For providers that support it (GitHub Copilot), the OAuth manager implements the device code flow:

1. Request device code from provider
2. Show user the verification URL and code
3. Poll for token completion
4. Store token in credentials store
5. Bootstrap provider with new token

### Credential Storage

Tokens are stored in `credentials.json` with the provider ID as the key. The file is read/written through the state store with the same thread-safety guarantees.
