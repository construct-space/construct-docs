# State Store Reference

The State Store is a thread-safe, file-backed JSON storage system implemented in Go that provides persistent storage for operator state, settings, and session data.

## Storage Architecture

The state store is implemented in `operator/internal/state/store.go` with the following characteristics:

- **Thread-safe**: Protected by `RWMutex` for concurrent access
- **File-backed**: Data persisted to JSON files on disk
- **Transactional**: Atomic writes to prevent corruption
- **Typed**: Go interfaces ensure type safety
- **Efficient**: Read caching and batch writes

## Store Files

The state store manages multiple JSON files, each serving a specific purpose:

| File | Purpose | Data |
|------|---------|------|
| `storage.json` | General key-value storage | StorageEntry objects |
| `settings.json` | Configuration and preferences | SettingEntry objects |
| `pinned.json` | Pinned items (spaces, agents) | PinnedItem objects |
| `designs.json` | Design records and components | DesignRecord objects |
| `project-settings.json` | Project-specific configurations | ProjectSettings objects |
| `skill-states.json` | Skill runtime states | SkillRuntimeState objects |
| `hook-states.json` | Hook runtime states | HookRuntimeState objects |
| `mcp-states.json` | MCP server states | MCPRuntimeState objects |

All files are stored in the operator's data directory (platform-specific paths).

## Data Models

### StorageEntry

General-purpose key-value storage with timestamps:

```typescript
interface StorageEntry {
  key: string;              // Unique storage key
  value: any;               // Stored value (JSON-serializable)
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
  metadata?: {
    ttl?: number;           // Time-to-live in seconds
    expiresAt?: string;     // Expiration timestamp
    tags?: string[];        // Tags for organization
  };
}
```

**Usage:**

```go
store.Set("user.preferences", map[string]interface{}{
  "theme": "dark",
  "language": "en",
})

entry, _ := store.Get("user.preferences")
// Returns: { value: { theme: "dark", ... }, updatedAt: "..." }
```

### KVEntry

Simple key-value pair with optional TTL:

```typescript
interface KVEntry {
  key: string;
  value: any;
  ttl?: number;             // Seconds until expiration
  expiresAt?: string;       // Computed expiration time
}
```

Used for:
- Session tokens
- Cache entries
- Temporary data

### SettingEntry

Structured settings with grouping:

```typescript
interface SettingEntry {
  key: string;              // Setting key (e.g., "editor.fontSize")
  value: any;               // Setting value
  group: string;            // Category (e.g., "editor", "theme", "ai")
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
  readonly?: boolean;       // Cannot be modified at runtime
}
```

**Example:**

```json
{
  "key": "editor.fontSize",
  "value": 14,
  "group": "editor",
  "updatedAt": "2026-03-29T10:15:30Z"
}
```

**Common groups:**
- `editor`: Text editor settings
- `theme`: UI theme preferences
- `ai`: AI model and provider settings
- `security`: Security and permission settings
- `features`: Feature flags

### PinnedItem

Represents a pinned item in the sidebar (spaces, agents, projects):

```typescript
interface PinnedItem {
  id: string;               // Unique identifier
  type: string;             // Item type: "space", "agent", "project"
  data: {
    name: string;
    icon?: string;
    path?: string;          // File system path if applicable
    metadata?: Record<string, any>;
  };
  position: number;         // Sort order
  createdAt: string;        // ISO 8601 timestamp
}
```

**Example:**

```json
{
  "id": "space.architect",
  "type": "space",
  "data": {
    "name": "Code Architect",
    "icon": "code-brackets",
    "path": "/spaces/architect"
  },
  "position": 0,
  "createdAt": "2026-03-20T14:30:00Z"
}
```

### DesignRecord

Records design components and patterns:

```typescript
interface DesignRecord {
  id: string;               // Unique identifier
  name: string;             // Component name
  content: string;          // Component code/markup
  tags: string[];           // Search tags
  category: string;         // Category (button, card, form, etc.)
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
  author?: string;          // Creator user ID
  metadata?: {
    version?: string;
    deprecated?: boolean;
    replaces?: string[];    // IDs of superseded designs
  };
}
```

### ProjectSettings

Project-specific configuration:

```typescript
interface ProjectSettings {
  projectId: string;        // Project identifier
  settings: {
    name: string;
    description?: string;
    icon?: string;
    theme?: {
      color: string;        // Primary color
      bg: string;           // Background color
    };
    agents?: string[];      // Available agents
    tools?: string[];       // Available tools
    defaultAgent?: string;  // Default agent ID
  };
  createdAt: string;
  updatedAt: string;
}
```

### SkillRuntimeState

Tracks loaded and enabled skills:

```typescript
interface SkillRuntimeState {
  id: string;               // Skill identifier
  loaded: boolean;          // Is skill currently loaded?
  enabled: boolean;         // Is skill enabled?
  loadedAt?: string;        // ISO 8601 timestamp when loaded
  updatedAt: string;        // ISO 8601 timestamp of last change
  errorMessage?: string;    // If load failed, error details
  version?: string;         // Skill version
}
```

**Example:**

```json
{
  "id": "pdf-generator",
  "loaded": true,
  "enabled": true,
  "loadedAt": "2026-03-29T08:00:15Z",
  "updatedAt": "2026-03-29T08:00:15Z",
  "version": "1.2.0"
}
```

### HookRuntimeState

Tracks hook execution metrics:

```typescript
interface HookRuntimeState {
  id: string;               // Hook identifier
  enabled: boolean;         // Hook is active
  lastExecuted: string;     // ISO 8601 timestamp
  totalRuns: number;        // Total invocations
  blockedCount: number;     // Times execution was blocked
  errorCount: number;       // Times hook errored
  avgExecutionMs: number;   // Average execution time
  lastError?: string;       // Most recent error message
}
```

See [Hooks Reference](./hooks.md) for details on hook states.

### MCPRuntimeState

Tracks MCP (Model Context Protocol) server states:

```typescript
interface MCPRuntimeState {
  id: string;               // MCP server identifier
  name: string;             // Server name
  connected: boolean;       // Is server connected?
  connectedAt?: string;     // ISO 8601 timestamp
  lastHealthCheck?: string; // Last successful health check
  toolCount: number;        // Number of tools available
  status: "ready" | "connecting" | "failed" | "disconnected";
  errorMessage?: string;    // If failed, error details
}
```

## Session Persistence

Sessions are stored in two ways depending on type:

### Operator Sessions (JSONL format)

Chat sessions with AI agents are stored in JSONL format (one JSON object per line) in `sessions/`:

```jsonl
{"sessionID":"sess_abc123","agentID":"architect","createdAt":"2026-03-29T10:00:00Z","turns":[]}
{"sessionID":"sess_abc123","agentID":"architect","turns":[{"request":...,"response":...}]}
{"sessionID":"sess_abc123","agentID":"architect","turns":[...],"status":"completed"}
```

**Why JSONL?**
- Efficient streaming: Read/write individual turns without parsing entire file
- Append-only: Turns are appended as they complete
- Recovery: If process crashes, can resume from last line
- Analytics: Can process logs line-by-line without loading entire file

### Chat Sessions (JSON format, Frontend-Facing)

Short-lived chat sessions presented to the user are stored as complete JSON files:

```json
{
  "id": "chat_xyz789",
  "space": "architect",
  "createdAt": "2026-03-29T10:15:30Z",
  "messages": [
    {
      "role": "user",
      "content": "Analyze this code"
    },
    {
      "role": "assistant",
      "content": "Looking at the code..."
    }
  ],
  "metadata": {
    "title": "Code Review",
    "pinned": false
  }
}
```

## Store Operations

### Reading Data

```go
// Get single entry
entry, err := store.Get("user.preferences")
if err != nil {
  // Handle error
}

// Get all entries by prefix
entries, _ := store.GetByPrefix("user.")

// Get all entries by tag
entries, _ := store.GetByTag("important")
```

### Writing Data

```go
// Set entry (overwrites if exists)
store.Set("user.preferences", map[string]interface{}{
  "theme": "dark",
})

// Set with TTL (automatic expiration)
store.SetWithTTL("session.token", token, 3600) // 1 hour

// Batch write (atomic)
store.BatchWrite([]StorageEntry{
  {Key: "a", Value: "1"},
  {Key: "b", Value: "2"},
})
```

### Deleting Data

```go
// Delete single entry
store.Delete("user.preferences")

// Delete by prefix
store.DeleteByPrefix("session.")

// Clear all (dangerous!)
store.Clear()
```

### Expiration

Entries with TTL are automatically cleaned up:

```go
// Get entry with TTL
store.SetWithTTL("cache.item", data, 300) // 5 minutes

// After 5 minutes, entry is automatically removed
// during periodic cleanup (runs every minute)
```

## Concurrency & Thread Safety

The store uses `RWMutex` for thread-safe access:

```go
type Store struct {
  mu    sync.RWMutex       // Reader-writer lock
  data  map[string]interface{}
  file  string             // Underlying JSON file
}

// Multiple goroutines can read simultaneously
func (s *Store) Get(key string) (interface{}, error) {
  s.mu.RLock()           // Acquire read lock
  defer s.mu.RUnlock()
  return s.data[key], nil
}

// Only one goroutine can write at a time
func (s *Store) Set(key string, value interface{}) {
  s.mu.Lock()            // Acquire write lock
  defer s.mu.Unlock()
  s.data[key] = value
  s.persist()            // Write to file
}
```

This ensures:
- Multiple readers don't block each other
- Writers have exclusive access
- Data consistency is maintained

## Persistence & Durability

The store persists data to disk using atomic writes:

1. **In-memory cache**: Recent data cached in `Store.data`
2. **Write to temporary file**: New data written to `.tmp` file
3. **Atomic rename**: Temporary file renamed to actual file (atomic on most filesystems)
4. **Read validation**: Read back to verify write succeeded

This approach prevents partial writes and data corruption on power loss.

## Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|-----------------|-------|
| Get | O(1) | Cached in memory |
| Set | O(n) | n = file size, includes disk write |
| GetByPrefix | O(n) | n = number of keys |
| BatchWrite | O(n) | n = batch size, single disk write |
| Delete | O(n) | Rewrites entire file |

**Optimization tips:**

1. **Batch writes**: Use `BatchWrite` for multiple entries
2. **Use prefixes**: Organize keys hierarchically (e.g., `user.settings.theme`)
3. **Archive old data**: Move old entries to separate store
4. **Limit TTL entries**: Too many expiring entries slow cleanup
5. **Cache frequently accessed**: Read once, reuse in memory

## Store Initialization

The store is initialized at operator startup:

```go
store, err := state.NewStore(dataDir)
if err != nil {
  // Handle initialization error
  // Usually: directory doesn't exist, permissions issue
}

// Verify store is healthy
if err := store.Health(); err != nil {
  // Store corrupted or inaccessible
  // May need to recover from backup
}

// Load existing data
entries, _ := store.GetByPrefix("")  // Load all
```

If the operator crashes before persisting, JSONL session logs can be recovered by replaying from the last complete line.

## Data Migration

When store schema changes (new field types, renamed keys):

1. **Backup existing store**: Copy JSON files
2. **Create migration function**: Map old format to new
3. **Run migration**: Process each file with function
4. **Validate**: Verify migrated data
5. **Archive old files**: Keep backup for reference

Example migration:

```go
func migrateSettings(old SettingEntry) SettingEntry {
  // Rename old fields
  if old.Key == "editor.lineHeight" {
    old.Key = "editor.spacing.lineHeight"
  }
  return old
}
```

## Backup & Recovery

Recommended backup strategy:

1. **Daily backups**: Snapshot entire operator data directory
2. **Retention**: Keep at least 7 days of backups
3. **Verification**: Test restore process monthly
4. **Encryption**: Encrypt backups if they contain sensitive data

To restore:

```bash
# Stop operator
systemctl stop construct-operator

# Restore from backup
cp -r backup/operator-data/* /var/lib/construct/operator-data/

# Restart operator
systemctl start construct-operator
```

## Best Practices

1. **Use typed accessors**: Create helper functions for common patterns
2. **Set reasonable TTLs**: Prevent unbounded store growth
3. **Monitor store size**: Alert if store files grow unexpectedly
4. **Validate on read**: Verify data matches expected schema
5. **Use transactions**: Batch related updates together
6. **Document key naming**: Establish naming conventions (`group.key.subkey`)
7. **Clean up periodically**: Archive old data to reduce file size
8. **Test persistence**: Verify data survives process restart
