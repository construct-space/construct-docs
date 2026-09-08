# Operator Overview

The Operator is Construct's Go sidecar process — a local TCP server that runs alongside the Tauri desktop app and handles all AI interactions. It manages agents, tool execution, provider connections, sessions, and the MCP protocol.

## Role in the Stack

```
┌─────────────────────────────────────────┐
│  Frontend (Vue 3 SPA)                   │
│  UI, assistant panel, space rendering   │
└──────────────┬──────────────────────────┘
               │ Tauri IPC
┌──────────────▼──────────────────────────┐
│  Desktop Shell (Tauri 2 / Rust)         │
│  Window management, IPC bridge, tray    │
└──────────────┬──────────────────────────┘
               │ TCP :60100
┌──────────────▼──────────────────────────┐
│  Operator (Go)                          │
│  Agents, tools, providers, MCP, state   │
└─────────────────────────────────────────┘
```

The frontend never calls AI providers directly. Every prompt, tool call, and streaming response flows through the operator.

## What It Does

The operator is responsible for:

- **Agent orchestration** — loading agent configs, building system prompts, managing multi-turn loops
- **Tool execution** — 7 built-in tools (read, write, edit, bash, glob, grep, listdir) plus bridge tools, MCP tools, and space tools
- **Provider abstraction** — unified interface across Anthropic, OpenAI-compatible (DeepSeek, xAI, Z.ai), OpenRouter, GitHub Copilot, Google Gemini
- **MCP client** — JSON-RPC 2.0 protocol for connecting to external tool servers
- **Skill system** — reusable prompt templates with trigger matching and variable expansion
- **Hook system** — pre/post-tool execution hooks for safety and automation
- **State persistence** — file-backed JSON store for settings, sessions, and credentials
- **Transport** — TCP (primary), HTTP/SSE, and WebSocket servers

## Package Structure

The operator lives in `construct-app/operator/` and follows Go's `internal/` convention:

```
operator/
├── main.go                    # Entry point, CLI flags, lifecycle
├── go.mod                     # Minimal deps (google/uuid, yaml.v3)
├── go.sum
└── internal/
    ├── agent/                 # Agent config, types, registry
    ├── chatsession/           # UI block model (turns, blocks)
    ├── config/                # Global configuration
    ├── context/               # Project/component context
    ├── hook/                  # Pre/post-tool hooks, safety
    ├── mcp/                   # MCP client (JSON-RPC 2.0)
    ├── module/                # Router-based module system
    ├── oauth/                 # OAuth provider, credential storage
    ├── provider/              # AI provider interface + connectors
    ├── runner/                # Agent execution loop
    ├── session/               # Agent session management
    ├── skill/                 # Prompt templates, trigger matching
    ├── space/                 # Space loading (agents, tools, hooks)
    ├── state/                 # File-backed JSON state store
    ├── tool/                  # Tool registry + built-in tools
    └── transport/             # TCP, HTTP/SSE, WebSocket servers
```

## Dependencies

The operator keeps dependencies minimal. From `go.mod`:

- `github.com/google/uuid` — unique ID generation
- `gopkg.in/yaml.v3` — YAML parsing for agent configs

Everything else uses the Go standard library.

## Module System

The operator uses a router-based modular architecture. Each module registers message handlers on a central `Router`:

```go
type Module interface {
    Name() string
    Register(router *Router, deps *Dependencies)
}
```

Modules are loaded during boot and handle typed messages like `agents.list`, `dispatch.stream`, `auth.set_api_base`, etc. See [Module System](./modules.md) for details.

## Key Design Decisions

**No frameworks.** The operator is built entirely on the Go standard library plus two dependencies. No web framework, no DI container, no ORM.

**File-backed state.** All persistent state (settings, credentials, sessions) is stored as JSON files under the Construct data directory. No database.

**Newline-delimited JSON.** The primary transport protocol is simple: one JSON object per line over TCP. This makes debugging trivial with `nc` or `telnet`.

**Agent configs are YAML.** Agent behavior (system prompt, allowed tools, model, temperature) is defined in markdown-frontmatter YAML files, not code.

## Next Steps

- [Boot & Lifecycle](./boot.md) — how the operator starts and shuts down
- [Agent System](./agents.md) — agent configuration and the registry
- [Runner Loop](./runner.md) — the core execution loop
- [Tools](./tools.md) — built-in tools and the tool registry
- [Providers](./providers.md) — AI provider abstraction
- [Hooks & Skills](./hooks-skills.md) — safety hooks and prompt templates
- [MCP Integration](./mcp.md) — Model Context Protocol client
- [State & Sessions](./state-sessions.md) — persistence and session management
- [Transport Protocol](./transport.md) — TCP, HTTP, WebSocket servers
- [Testing](./testing.md) — test patterns and running tests
