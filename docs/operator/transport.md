# Transport Protocol

The operator exposes three transport layers for client communication. TCP is the primary protocol used by the Tauri desktop app. HTTP/SSE and WebSocket are available for alternative clients.

## TCP Server (Primary)

**File**: `internal/transport/tcp.go`

The TCP server listens on `:60100` (configurable via `--port`) and uses a newline-delimited JSON protocol. Each message is a single JSON object terminated by `\n`.

### Protocol Format

```
Client → Operator:  {"type": "...", "payload": {...}}\n
Operator → Client:  {"type": "...", "payload": {...}}\n
```

Every message has a `type` field that determines how it's routed. The `payload` field carries type-specific data.

### Request/Response Pattern

```json
// Request (client → operator)
{"type": "agents.list", "id": "req-1"}

// Response (operator → client)
{"type": "agents.list", "id": "req-1", "payload": {"agents": [...]}}
```

The `id` field enables request-response matching when multiple requests are in flight.

### Streaming Pattern

Streaming uses the same TCP connection with chunked responses:

```json
// Start stream
{"type": "dispatch.stream", "id": "stream-1", "payload": {"agent": "coder", "task": "..."}}

// Stream chunks (operator → client, many)
{"type": "stream.chunk", "id": "stream-1", "payload": {"event": "text", "data": {"content": "Let me "}}}
{"type": "stream.chunk", "id": "stream-1", "payload": {"event": "text", "data": {"content": "analyze "}}}
{"type": "stream.chunk", "id": "stream-1", "payload": {"event": "tool.call", "data": {"tool": "read", "input": {...}}}}
{"type": "stream.chunk", "id": "stream-1", "payload": {"event": "tool.result", "data": {"call_id": "...", "content": "..."}}}

// Stream end
{"type": "stream.done", "id": "stream-1", "payload": {"content": "..."}}
```

### Connection Handling

The TCP server handles multiple concurrent connections. Each connection runs in its own goroutine with a dedicated JSON decoder:

```go
func (s *TCPServer) handleConnection(conn net.Conn) {
    decoder := json.NewDecoder(conn)
    encoder := json.NewEncoder(conn)

    for {
        var msg Message
        if err := decoder.Decode(&msg); err != nil {
            return  // Connection closed
        }
        go s.router.Handle(msg, encoder)
    }
}
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `ping` | → | Health check |
| `pong` | ← | Health response with version |
| `agents.list` | → ← | List available agents |
| `agents.get` | → ← | Get agent config by ID |
| `providers.list` | → ← | List available providers |
| `tools.list` | → ← | List available tools |
| `dispatch` | → ← | One-shot agent dispatch |
| `dispatch.stream` | → ← | Streaming agent dispatch |
| `chat` | → ← | Message-based chat |
| `chat.stream` | → ← | Streaming chat |
| `stream.chunk` | ← | Stream data chunk |
| `stream.done` | ← | Stream completion |
| `stream.error` | ← | Stream error |
| `mcp.servers` | → ← | List MCP servers |
| `mcp.connect` | → ← | Connect MCP server |
| `mcp.disconnect` | → ← | Disconnect MCP server |
| `skills.list` | → ← | List available skills |
| `skills.load` | → ← | Load skills from directory |
| `auth.set_api_base` | → ← | Set provider API base URL |
| `auth.set_token` | → ← | Set auth token |
| `context.set_project` | → ← | Set active project |
| `context.set_mode` | → ← | Set code/UI mode |
| `context.set_component` | → ← | Set selected component |
| `sessions.list` | → ← | List saved sessions |
| `sessions.load` | → ← | Load a session |
| `sessions.save` | → ← | Save current session |
| `bridge.request` | ← | Request to frontend (reverse direction) |
| `bridge.response` | → | Response from frontend |

---

## HTTP/SSE Server

**File**: `internal/transport/http.go`

An HTTP server for clients that can't use raw TCP. Provides REST endpoints for one-shot operations and Server-Sent Events for streaming:

### Endpoints

```
GET  /health                    → Health check
GET  /agents                    → List agents
GET  /providers                 → List providers
GET  /tools                     → List tools
POST /dispatch                  → One-shot dispatch (JSON body)
POST /dispatch/stream           → SSE streaming dispatch
POST /chat                      → One-shot chat
POST /chat/stream               → SSE streaming chat
GET  /mcp/servers               → List MCP servers
POST /mcp/connect               → Connect server
POST /mcp/disconnect            → Disconnect server
```

### SSE Streaming

Streaming endpoints return `text/event-stream`:

```
POST /dispatch/stream
Content-Type: application/json

{"agent": "coder", "task": "Build a login form"}
```

```
HTTP/1.1 200 OK
Content-Type: text/event-stream

event: text
data: {"content": "I'll create "}

event: text
data: {"content": "a login form."}

event: tool.call
data: {"tool": "write", "input": {...}, "call_id": "tc-1"}

event: tool.result
data: {"call_id": "tc-1", "content": "File written"}

event: done
data: {"content": "..."}
```

---

## WebSocket Server

**File**: `internal/transport/ws.go`

A WebSocket transport for bidirectional communication from web clients:

```
ws://localhost:60100/ws
```

Uses the same JSON message format as TCP. WebSocket frames replace newline delimiters — each frame is one complete JSON message.

---

## Frontend Integration

The frontend communicates through Tauri's IPC bridge, not directly over TCP. The flow is:

```
Vue → useOperator() → Tauri invoke("operator_send", {msg}) → Rust → TCP → Go Operator
                                                                              ↓
Vue ← onChunk callback ← Tauri event("operator-stream-chunk") ← Rust ← TCP ← Stream
```

Tauri handles connection management, reconnection, and event multiplexing. The frontend never sees raw TCP — it uses the `useOperator()` composable which abstracts all transport details. See [Operator Communication](/frontend/operator-client) for the frontend perspective.
