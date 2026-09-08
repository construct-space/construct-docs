# Boot & Lifecycle

How the operator starts, initializes its subsystems, and shuts down.

## Entry Point

**File**: `main.go`

The operator is a single Go binary. It accepts CLI flags and runs through a deterministic boot sequence:

```go
func main() {
    port := flag.Int("port", 60100, "TCP listen port")
    dir  := flag.String("dir", "", "Construct data directory")
    dev  := flag.Bool("dev", false, "Enable development mode")
    flag.Parse()
    // ... boot sequence
}
```

### CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `60100` | TCP listen port for the primary transport |
| `--dir` | Platform default | Construct data directory (settings, state, sessions) |
| `--dev` | `false` | Enable dev mode (verbose logging, relaxed timeouts) |

## Boot Sequence

The operator initializes subsystems in a specific order, with each step depending on the previous:

```
1. Parse CLI flags
2. Resolve data directory
3. Initialize state store (file-backed JSON)
4. Load configuration
5. Bootstrap providers (OAuth tokens, env vars, settings)
6. Initialize tool registry (built-in + bridge tools)
7. Load agent configs from disk
8. Initialize MCP client
9. Load skills
10. Initialize hook system
11. Start module router
12. Register all modules
13. Start TCP server on :port
14. Start HTTP/SSE server (if enabled)
15. Ready — accepting connections
```

## Data Directory

The operator stores all persistent data under a platform-specific directory:

| Platform | Default Path |
|----------|-------------|
| macOS | `~/Library/Application Support/Construct/` |
| Linux | `~/.config/construct/` |
| Windows | `%APPDATA%\Construct\` |

Override with `--dir` flag. The directory contains:

```
construct-data/
├── settings.json          # User preferences
├── credentials.json       # OAuth tokens, API keys
├── state/                 # Per-feature state files
├── sessions/              # Saved chat sessions
├── agents/                # Custom agent configs
├── skills/                # User skill files
├── mcp/                   # MCP server configs
└── spaces/                # Installed spaces
```

## Provider Bootstrap

During boot, the operator discovers available AI providers by checking multiple sources in priority order:

1. **OAuth credentials** — stored tokens from device code flow
2. **Environment variables** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.
3. **Settings file** — user-configured API keys and base URLs

Each provider connector is tested with a lightweight ping. Failed providers are marked unavailable but don't block boot.

## Module Registration

After core subsystems are ready, modules register their message handlers on the router:

```go
router.Register("agents.list", agentModule.HandleList)
router.Register("dispatch", aiModule.HandleDispatch)
router.Register("dispatch.stream", aiModule.HandleStreamDispatch)
router.Register("tools.list", toolModule.HandleList)
router.Register("mcp.servers", mcpModule.HandleListServers)
// ... etc
```

See [Module System](./modules.md) for the full module list.

## Shutdown

The operator handles `SIGINT` and `SIGTERM` for graceful shutdown:

1. Stop accepting new connections
2. Cancel active streams (with drain timeout)
3. Close MCP client connections
4. Flush state store to disk
5. Close TCP/HTTP listeners
6. Exit

In development mode (`--dev`), shutdown is more aggressive with shorter drain timeouts.

## Health Check

The frontend pings the operator after Tauri starts it:

```json
{"type": "ping"}
```

Response:

```json
{"type": "pong", "version": "1.0.0"}
```

The frontend retries with backoff until the operator responds, then sets `operator.connected = true`.

## Dev Mode

When started with `--dev`:

- Verbose logging to stdout (all message types, tool executions, provider calls)
- Relaxed timeouts for debugging
- Hot-reload of agent configs and skills (watches file changes)
- Additional debug endpoints on the HTTP server
