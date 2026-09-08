# Tools

Tools are the operator's interface to the outside world. When an LLM decides it needs to take an action — read a file, run a command, search code — it issues a tool call that the operator executes.

## Tool Registry

**File**: `internal/tool/registry.go`

The registry holds all available tools and resolves them by name or alias:

```go
type Registry struct {
    tools   map[string]Tool
    aliases map[string]string
    mu      sync.RWMutex
}

func (r *Registry) Register(tool Tool)
func (r *Registry) Get(name string) (Tool, bool)
func (r *Registry) Execute(name string, input map[string]any, ctx ExecContext) (string, error)
func (r *Registry) List() []ToolDefinition
func (r *Registry) AddAlias(alias, target string)
```

Aliases allow tools to be referenced by multiple names (e.g., `list` → `listdir`).

## Tool Interface

Every tool implements:

```go
type Tool interface {
    Name() string
    Description() string
    Schema() map[string]any          // JSON Schema for input parameters
    Execute(input map[string]any, ctx ExecContext) (string, error)
}
```

The `Schema()` method returns a JSON Schema object that the LLM uses to understand what parameters the tool accepts.

## Built-in Tools

The operator ships with 7 built-in tools:

### read

Reads file contents from disk.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | yes | File path (relative to project or absolute) |
| `offset` | int | no | Start line number |
| `limit` | int | no | Number of lines to read |

Returns file contents with line numbers. Resolves relative paths against the project directory.

### write

Creates or overwrites a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | yes | File path |
| `content` | string | yes | File content |

Creates parent directories if they don't exist.

### edit

Performs targeted string replacement in a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | yes | File path |
| `old` | string | yes | Text to find |
| `new` | string | yes | Replacement text |

Fails if `old` is not found or is ambiguous (matches multiple locations). This is safer than full file rewrites for small changes.

### bash

Executes a shell command.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | yes | Shell command to run |
| `timeout` | int | no | Timeout in seconds (default: 120) |

Runs in the project directory. Captures both stdout and stderr. Respects timeout limits.

### glob

Finds files matching a glob pattern.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | yes | Glob pattern (e.g., `**/*.go`) |
| `path` | string | no | Base directory (defaults to project) |

Returns matching file paths sorted by modification time.

### grep

Searches file contents using regex.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | yes | Regex pattern |
| `path` | string | no | Directory to search |
| `include` | string | no | File glob filter |

Returns matching lines with file paths and line numbers.

### listdir

Lists directory contents.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | yes | Directory path |

Returns files and subdirectories with basic metadata (size, modification time).

## Bridge Tools

Bridge tools call back into the frontend via the Tauri IPC bridge. They let the operator access frontend state and trigger UI actions:

| Tool | Direction | Description |
|------|-----------|-------------|
| `space.snapshot` | operator → frontend | Get current space state |
| `space.list_actions` | operator → frontend | List available automation actions |
| `space.run_action` | operator → frontend | Execute a space automation action |
| `space.context_request` | operator → frontend | Request data from a space |

Bridge tools are registered at boot and use the bridge listener mechanism described in [Operator Communication](/frontend/operator-client#bridge-listener).

## MCP Tools

Tools discovered from MCP servers are dynamically added to the registry with a `mcp:` prefix:

```
mcp:{serverName}:{toolName}
```

For example, a tool `search` from an MCP server named `github` becomes `mcp:github:search`. See [MCP Integration](./mcp.md) for details.

## Space Tools

Spaces can provide custom tools via their `tools/` directory. Each tool is a Go plugin or a shell script wrapper:

```
my-space/
├── tools/
│   ├── deploy.yaml       # Tool definition
│   └── deploy.sh         # Implementation
```

Space tools are registered with the `space:{id}:` prefix and removed when the space is unloaded.

## Input Sanitization

**File**: `internal/tool/sanitize.go`

All tool inputs are sanitized before execution:

- Path traversal prevention (`../` resolution and boundary checks)
- Command injection detection for `bash` tool
- Size limits on file content for `write` tool
- Timeout enforcement for all tools

## Tool Definitions for LLM

When building the LLM request, the runner includes tool definitions based on the agent's `tools` list:

```go
func (r *Registry) DefinitionsFor(toolIDs []string) []ToolDefinition {
    var defs []ToolDefinition
    for _, id := range toolIDs {
        if tool, ok := r.Get(id); ok {
            defs = append(defs, ToolDefinition{
                Name:        tool.Name(),
                Description: tool.Description(),
                InputSchema: tool.Schema(),
            })
        }
    }
    return defs
}
```

The LLM uses these definitions to decide when and how to call tools.
