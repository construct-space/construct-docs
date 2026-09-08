# MCP Integration

The operator includes a Model Context Protocol (MCP) client for connecting to external tool servers. MCP enables agents to use tools provided by third-party services without custom integration code.

## What is MCP

MCP (Model Context Protocol) is a JSON-RPC 2.0 based protocol for LLM tool servers. An MCP server exposes tools that an LLM client can discover and call. The operator acts as an MCP client — it connects to servers, discovers their tools, and makes them available to agents.

## Client Architecture

**File**: `internal/mcp/client.go`

```go
type Client struct {
    servers    map[string]*ServerConnection
    tools      map[string]ToolDefinition     // Flattened tool map
    mu         sync.RWMutex
}

func (c *Client) Connect(config ServerConfig) error
func (c *Client) Disconnect(name string) error
func (c *Client) DiscoverTools(name string) ([]ToolDefinition, error)
func (c *Client) CallTool(server, tool string, input map[string]any) (string, error)
func (c *Client) ListServers() []ServerStatus
func (c *Client) ListTools() []ToolDefinition
```

## Transports

The MCP client supports multiple transport types:

### stdio

The most common transport. The operator spawns the MCP server as a child process and communicates over stdin/stdout:

```json
{
  "name": "github",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

The operator manages the process lifecycle — starting it on connect and stopping it on disconnect.

### HTTP (Streamable HTTP)

For remote MCP servers accessible over HTTP:

```json
{
  "name": "remote-tools",
  "transport": "http",
  "url": "https://mcp.example.com/tools"
}
```

Uses HTTP POST for requests and Server-Sent Events for streaming responses.

### URL

A variant of HTTP that auto-discovers the server endpoint from a well-known URL:

```json
{
  "name": "service",
  "transport": "url",
  "url": "https://example.com/.well-known/mcp"
}
```

## JSON-RPC 2.0 Protocol

All MCP communication uses JSON-RPC 2.0:

### Tool Discovery

```json
// Request
{"jsonrpc": "2.0", "method": "tools/list", "id": 1}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "search_repositories",
        "description": "Search GitHub repositories",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

### Tool Execution

```json
// Request
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "id": 2,
  "params": {
    "name": "search_repositories",
    "arguments": { "query": "construct-space" }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      { "type": "text", "text": "Found 3 repositories..." }
    ]
  }
}
```

## Tool Registration

When an MCP server is connected and tools are discovered, they're registered in the operator's tool registry with a namespace prefix:

```
mcp:{serverName}:{toolName}
```

For example, connecting a server named `github` with a tool `search_repositories` registers:

```
mcp:github:search_repositories
```

This prevents collisions between MCP tools and built-in tools. Agents can reference MCP tools by their full namespaced name.

## Server Configuration

MCP server configs are stored in `{dataDir}/mcp/servers.json`:

```json
{
  "servers": [
    {
      "name": "github",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      },
      "auto_connect": true
    },
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"],
      "auto_connect": false
    }
  ]
}
```

### Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique server identifier |
| `transport` | string | `"stdio"`, `"http"`, or `"url"` |
| `command` | string | Command to spawn (stdio only) |
| `args` | []string | Command arguments (stdio only) |
| `env` | map | Environment variables (supports `${VAR}` expansion) |
| `url` | string | Server URL (http/url transports) |
| `auto_connect` | bool | Connect automatically at boot |

## Connection Lifecycle

```
1. Load server config
2. Start transport (spawn process or open HTTP connection)
3. Send initialize request (protocol handshake)
4. Discover tools (tools/list)
5. Register tools in operator's tool registry
   ↕ (active — tool calls flow through)
6. Disconnect request or operator shutdown
7. Unregister tools from registry
8. Close transport (kill process or close connection)
```

## Environment Variable Expansion

Server configs support `${VAR}` syntax that expands from the operator's environment:

```json
{
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}",
    "API_BASE": "${CUSTOM_API_URL}"
  }
}
```

This lets users configure MCP servers through environment variables without hardcoding secrets in config files.

## Error Handling

| Error | Behavior |
|-------|----------|
| Server fails to start | Log error, mark as disconnected, skip tool registration |
| Tool call timeout | Return error result to LLM (configurable timeout per server) |
| Server crash | Detect via process exit, attempt auto-reconnect (stdio only) |
| Protocol error | Log and return error to LLM |
| Invalid tool response | Wrap error message as tool result |

The operator never blocks on a failed MCP server. Agents continue working with remaining available tools.
