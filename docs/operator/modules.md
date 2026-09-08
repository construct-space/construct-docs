# Module System

The operator uses a router-based modular architecture. Each module encapsulates a domain (AI, tools, MCP, etc.) and registers message handlers on a central router.

## Router

**File**: `internal/module/router.go`

The router maps message types to handler functions:

```go
type Router struct {
    handlers map[string]Handler
    mu       sync.RWMutex
}

type Handler func(msg Message, respond Responder) error
type Responder func(payload any) error

func (r *Router) Register(msgType string, handler Handler)
func (r *Router) Handle(msg Message, respond Responder) error
```

When a message arrives via any transport (TCP, HTTP, WebSocket), it's dispatched to the matching handler by `type` field.

## Dependencies

All modules receive shared dependencies at registration time:

```go
type Dependencies struct {
    Agents    *agent.Registry
    Tools     *tool.Registry
    Providers *provider.Registry
    Runner    *runner.Runner
    MCP       *mcp.Client
    Skills    *skill.Manager
    Hooks     *hook.Manager
    State     *state.Store
    Sessions  *session.Manager
    Context   *context.Manager
    OAuth     *oauth.Manager
}
```

This is explicit dependency injection — no global state, no service locator.

## Module Interface

```go
type Module interface {
    Name() string
    Register(router *Router, deps *Dependencies)
}
```

Each module's `Register()` method adds its handlers to the router.

## Built-in Modules

### AI Module

Handles agent dispatch and chat operations:

| Message Type | Description |
|-------------|-------------|
| `dispatch` | One-shot agent dispatch |
| `dispatch.stream` | Streaming agent dispatch |
| `chat` | Message-based chat |
| `chat.stream` | Streaming chat |

### Agent Module

Manages agent configuration:

| Message Type | Description |
|-------------|-------------|
| `agents.list` | List all available agents |
| `agents.get` | Get agent config by ID |

### Tool Module

Tool discovery and management:

| Message Type | Description |
|-------------|-------------|
| `tools.list` | List available tools for current agent |

### Provider Module

AI provider management:

| Message Type | Description |
|-------------|-------------|
| `providers.list` | List providers with their models |

### MCP Module

MCP server management:

| Message Type | Description |
|-------------|-------------|
| `mcp.servers` | List connected MCP servers |
| `mcp.connect` | Connect to an MCP server |
| `mcp.disconnect` | Disconnect from a server |
| `mcp.tools` | List tools from MCP servers |

### Skill Module

Skill loading and management:

| Message Type | Description |
|-------------|-------------|
| `skills.list` | List loaded skills |
| `skills.load` | Load skills from a directory |

### Session Module

Session persistence:

| Message Type | Description |
|-------------|-------------|
| `sessions.list` | List saved sessions |
| `sessions.load` | Restore a saved session |
| `sessions.save` | Save current session |
| `sessions.delete` | Delete a saved session |

### Context Module

Project and mode context:

| Message Type | Description |
|-------------|-------------|
| `context.set_project` | Set active project path |
| `context.set_mode` | Set code/UI mode |
| `context.set_component` | Set selected component |
| `context.get` | Get current context |

### Auth Module

Authentication and credentials:

| Message Type | Description |
|-------------|-------------|
| `auth.set_token` | Store auth token |
| `auth.set_api_base` | Set provider API base URL |
| `auth.device_code` | Start device code OAuth flow |
| `auth.status` | Check auth status |

### OAuth Module

OAuth flow management:

| Message Type | Description |
|-------------|-------------|
| `oauth.start` | Initiate OAuth flow for a provider |
| `oauth.callback` | Handle OAuth callback |
| `oauth.refresh` | Refresh expired token |

### State Module

Direct state access:

| Message Type | Description |
|-------------|-------------|
| `state.get` | Read a state value |
| `state.set` | Write a state value |

## Adding a Module

To add a new module:

1. Create a package under `internal/`:

```go
package myfeature

import "operator/internal/module"

type Module struct{}

func (m *Module) Name() string { return "myfeature" }

func (m *Module) Register(router *module.Router, deps *module.Dependencies) {
    router.Register("myfeature.action", m.handleAction(deps))
}

func (m *Module) handleAction(deps *module.Dependencies) module.Handler {
    return func(msg module.Message, respond module.Responder) error {
        // Handle the message
        return respond(map[string]any{"result": "done"})
    }
}
```

2. Register it in `main.go`:

```go
router.RegisterModule(&myfeature.Module{})
```

The module will immediately start receiving messages matching its registered types.
