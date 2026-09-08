# Operator Communication

How the frontend communicates with the Go operator sidecar.

## Architecture

The Go operator runs as a local sidecar on TCP `:60100`. The frontend does not connect directly to TCP — instead it communicates via Tauri IPC bridge. All requests go through the `useOperator()` composable.

```
Vue Component → useOperator() → Tauri IPC (invoke) → Go Operator (:60100)
                                                         ↓
Vue Component ← onChunk callback ← Tauri event channel ← Stream response
```

Streaming responses use Tauri event channels with request ID multiplexing, allowing multiple concurrent streams through a single channel.

## useOperator() Composable

**File**: `operator/client.ts`

The single entry point for all operator communication:

```ts
const operator = useOperator()

// Connection
operator.connect()              // Trigger operator startup + ping
operator.connected              // Ref<boolean>
operator.version                // Ref<string>

// Discovery
operator.listProviders()        // Available AI providers and models
operator.listAgents()           // Available agents (general, brainstorm, architect, etc.)
operator.listTools()            // Available tools for the current agent

// One-shot execution
operator.dispatch(agentId, task, model?)
// Returns: DispatchResult { sessionID, agentID, content, turns, usage, stopReason }

// Streaming execution
operator.dispatchStream(agentId, task, onChunk, onDone, onError, model?)
// Calls onChunk(event) for each stream event, onDone(result) when complete

// Chat (message-based, simpler than dispatch)
operator.chat(agentId, messages)
operator.chatStream(agentId, messages, onChunk, onDone, onError)

// Context setting
operator.setProject(projectPath)     // Tell operator which project is active
operator.setMode('code' | 'ui')      // Set operator response mode
operator.setComponent(component)     // Set selected component context

// Generic RPC
operator.send<T>(type, payload)
// e.g., 'auth.set_api_base', 'agents.list', 'skills.load'
```

## Streaming Protocol

Streaming uses a listener + request ID matching pattern:

1. Frontend generates a unique request ID: `stream-${Date.now()}-${counter}`
2. Registers a Tauri event listener for `operator-stream-chunk`
3. Sends the dispatch request via Tauri IPC with the request ID
4. Each incoming chunk event carries the request ID
5. Frontend matches chunks to the correct stream handler
6. Auto-reconnection on transient errors

This enables multiple concurrent streams (e.g., two spaces both running agents) without interference.

## Stream Events

**File**: `operator/streamEvents.ts`

| Event Type | Data | Description |
|-----------|------|-------------|
| `text` | `{ content }` | Text content delta (appended to current block) |
| `tool.call` | `{ tool, title, input, call_id }` | Tool execution started |
| `tool.result` | `{ call_id, content, is_error }` | Tool execution completed |
| `status` | `{ message }` | Status update (thinking, processing...) |
| `turn.start` | `{ turn_number }` | New agent turn beginning |
| `turn.end` | `{ turn_number }` | Turn completed |
| `done` | `{ content }` | Stream finished — final content (may be JSON envelope) |

## Response Types

**File**: `operator/types.ts`

```ts
interface DispatchResult {
  sessionID: string
  agentID: string
  content: string           // Final text content
  turns: Turn[]             // All turns in this dispatch
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string        // 'end_turn', 'max_tokens', 'tool_use', etc.
}

interface Turn {
  request: Request
  response: Response
  toolCalls: ToolExecution[]
}

interface ToolExecution {
  tool: string              // Tool name (e.g., 'bash', 'read', 'write')
  input: Record<string, any>
  result: string
  isError: boolean
}
```

Other key types: `ProviderModel`, `AIProvider`, `OperatorAgent`, `Tool`, `ToolCall`, `ToolResult`, `StreamEvent`, `ProjectContext`.

## Stream Status Tracking

**File**: `operator/useStreamStatus.ts`

Consumes `StreamEvent` chunks and provides human-readable status:

```ts
const status = useStreamStatus()

// Feed events
status.handleChunk(event)

// Read state
status.state          // 'idle' | 'thinking' | 'tool_running' | 'tool_done' | 'complete' | 'error'
status.message        // Human-readable message
status.toolHistory    // Array of { tool, input, result, state }
```

Filters out filler messages ("Thinking...", tool status titles). Used by both AssistantPanel and AgentView for status display.

## Auth Sync

When the auth store changes (login/logout), the token is automatically synced to the Go operator via Tauri IPC:

```
Auth store change → syncTokenToContextService() → Tauri invoke → Operator updates internal auth
```

This ensures the operator can make authenticated API calls on behalf of the user.

## Bridge Listener

**File**: `lib/bridgeListener.ts`

Handles requests FROM the operator (reverse direction). Started during app boot via `startBridgeListener()`.

```
Go Operator → Tauri bridge:request event → bridgeListener → handler → bridge_respond → Operator
```

| Method | Description |
|--------|-------------|
| `space.snapshot` | Get automation provider's current state |
| `space.list_actions` | List available automation actions |
| `space.run_action` | Execute a space automation action |
| `space.context_request` | Request arbitrary data from a space |

This enables the operator to query frontend state ("what project is open?") and trigger actions ("run deploy") without direct access to the frontend.

## Convenience Composables

```ts
// Derived from useOperator
const { mode } = useContextMode()       // Reactive code/ui mode
const { component } = useComponentContext() // Reactive selected component
```
