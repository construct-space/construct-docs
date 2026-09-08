# IPC Protocol

The Construct IPC (Inter-Process Communication) protocol defines how the frontend and operator sidecar communicate via TCP. It uses a newline-delimited JSON format for efficient streaming and real-time event delivery.

## Connection

### TCP Socket

**Address**: `localhost:60100`

**Protocol**: TCP with newline-delimited JSON

**Lifecycle**:
1. Client connects to TCP socket
2. Client sends requests as JSON lines
3. Server responds with streaming events
4. Connection persists for multiple request/response cycles
5. Either side can close with normal TCP shutdown

## Message Format

### General Structure

All messages are JSON objects terminated with a newline (`\n`):

```
{JSON object}\n
```

**Example**:
```json
{"id":"req-1","type":"dispatch","agentID":"architect","sessionID":"sess-1","content":"Hello"}
```

### Request Message

Sent by frontend to operator:

```typescript
interface RequestMessage {
  id: string              // Unique request ID (UUID)
  type: "dispatch"        // Message type
  agentID: string         // Target agent ID
  sessionID: string       // Target session ID
  content: string         // Request content/prompt
  files?: string[]        // Optional file references
  metadata?: Record<string, any>  // Optional metadata
}
```

**Example**:
```json
{
  "id": "req-abc-123",
  "type": "dispatch",
  "agentID": "architect",
  "sessionID": "sess-abc-123",
  "content": "Review the authentication module for security issues",
  "files": ["src/auth.ts", "src/oauth.ts"],
  "metadata": {
    "priority": "high",
    "context": "security-review"
  }
}
```

### Response Events

Sent by operator to frontend, one per line:

```typescript
type ResponseEvent =
  | TurnStartedEvent
  | ResponseBlockEvent
  | ToolCallEvent
  | ToolResultEvent
  | ResponseChunkEvent
  | TurnCompletedEvent
  | ErrorEvent
```

#### TurnStartedEvent

Signals the beginning of a new turn:

```typescript
interface TurnStartedEvent {
  type: "turn-started"
  turnID: string          // Unique turn ID
  agentID: string         // Executing agent
  sessionID: string       // Session ID
  timestamp: number       // Unix timestamp (ms)
}
```

**Example**:
```json
{"type":"turn-started","turnID":"turn-123","agentID":"architect","sessionID":"sess-123","timestamp":1234567890}
```

#### ResponseBlockEvent

Contains the initial AI response:

```typescript
interface ResponseBlockEvent {
  type: "response-block"
  content: string         // Response text
  timestamp: number       // Event timestamp
}
```

**Example**:
```json
{"type":"response-block","content":"I'll review the authentication module...","timestamp":1234567890}
```

#### ResponseChunkEvent

Streaming chunks of response text:

```typescript
interface ResponseChunkEvent {
  type: "response-chunk"
  delta: string           // Incremental text
  timestamp: number       // Event timestamp
}
```

**Example**:
```json
{"type":"response-chunk","delta":" The OAuth flow looks","timestamp":1234567890}
```

#### ToolCallEvent

Signals a tool invocation by the agent:

```typescript
interface ToolCallEvent {
  type: "tool-call"
  toolID: string          // Tool identifier
  name: string            // Tool name
  input: Record<string, any>  // Tool parameters
  timestamp: number       // Event timestamp
}
```

**Example**:
```json
{"type":"tool-call","toolID":"tool-bash-1","name":"bash","input":{"command":"ls -la src/","cwd":"/project"},"timestamp":1234567890}
```

#### ToolResultEvent

Tool execution result:

```typescript
interface ToolResultEvent {
  type: "tool-result"
  toolID: string          // Corresponding tool ID
  output: string | Record<string, any>  // Tool output
  error?: string          // Error if tool failed
  duration: number        // Execution time (ms)
  timestamp: number       // Event timestamp
}
```

**Example**:
```json
{"type":"tool-result","toolID":"tool-bash-1","output":"total 48\ndrwxr-xr-x  5 user  staff  160 Mar 29 10:00 .","duration":125,"timestamp":1234567890}
```

#### TurnCompletedEvent

Marks the end of a turn with final metadata:

```typescript
interface TurnCompletedEvent {
  type: "turn-completed"
  turnID: string          // Corresponding turn ID
  content: string         // Final response content
  toolCalls: ToolCall[]   // All tool executions
  usage: TokenUsage       // Token usage stats
  stopReason: StopReason  // Why the turn ended
  timestamp: number       // Event timestamp
}

interface TokenUsage {
  inputTokens: number     // Tokens in prompt
  outputTokens: number    // Tokens in response
  totalTokens: number     // Sum
}

type StopReason = "end_turn" | "max_tokens" | "tool_use" | "error"
```

**Example**:
```json
{
  "type": "turn-completed",
  "turnID": "turn-123",
  "content": "The OAuth implementation is secure...",
  "toolCalls": [
    {
      "name": "bash",
      "input": {"command": "ls -la src/"},
      "output": "..."
    }
  ],
  "usage": {
    "inputTokens": 500,
    "outputTokens": 800,
    "totalTokens": 1300
  },
  "stopReason": "end_turn",
  "timestamp": 1234567890
}
```

#### ErrorEvent

Indicates an error during processing:

```typescript
interface ErrorEvent {
  type: "error"
  code: string            // Error code
  message: string         // Error message
  details?: Record<string, any>  // Additional details
  recoverable: boolean    // Can session continue?
  timestamp: number       // Event timestamp
}
```

**Error Codes**:
- `INVALID_REQUEST`: Malformed request
- `AGENT_NOT_FOUND`: Agent doesn't exist
- `SESSION_NOT_FOUND`: Session doesn't exist
- `TOOL_ERROR`: Tool execution failed
- `PROVIDER_ERROR`: LLM API error
- `TOKEN_LIMIT`: Response exceeded token limit
- `RATE_LIMIT`: Provider rate limit exceeded
- `INTERNAL_ERROR`: Server-side error
- `TIMEOUT`: Request timed out

**Example**:
```json
{
  "type": "error",
  "code": "TOOL_ERROR",
  "message": "Tool 'bash' failed to execute",
  "details": {
    "tool": "bash",
    "error": "command not found: xyz"
  },
  "recoverable": true,
  "timestamp": 1234567890
}
```

## Request/Response Flow

### Synchronous Single Request

1. Frontend sends `RequestMessage`
2. Operator processes request
3. Operator streams response events
4. Operator sends `TurnCompletedEvent` (final event)
5. Frontend closes stream and processes results

```
Frontend                          Operator
   |                                |
   |------ RequestMessage --------->|
   |                                |-- Process request
   |<----- TurnStartedEvent --------|
   |<---- ResponseBlockEvent -------|
   |<---- ResponseChunkEvent -------|
   |<---- ToolCallEvent ------------|
   |<---- ToolResultEvent ---------|
   |<---- TurnCompletedEvent -------|
   |                                |
```

### Persistent Connection with Multiple Requests

1. Frontend connects once (persistent)
2. Sends multiple requests
3. Receives streaming responses for each
4. Connection stays open for future requests

```
Frontend                          Operator
   |                                |
   |------- TCP Connect ---------->|
   |<------ TCP Ack --------------|
   |                                |
   |--- RequestMessage (req-1) --->|
   |<----- Response Events --------|
   |<--- TurnCompletedEvent ------|
   |                                |
   |--- RequestMessage (req-2) --->|
   |<----- Response Events --------|
   |<--- TurnCompletedEvent ------|
   |                                |
   |------- TCP Close ------------>|
   |                                |
```

## Data Structures

### DispatchResult

Final result returned by dispatchStream():

```typescript
interface DispatchResult {
  sessionID: string               // Session identifier
  agentID: string                 // Agent used
  content: string                 // Final response
  turns: Turn[]                   // All turns in session
  usage: TokenUsage               // Total usage
  stopReason: StopReason          // Why it ended
}

interface Turn {
  id: string
  request: {
    content: string
    files?: string[]
    metadata?: Record<string, any>
  }
  response: {
    content: string
  }
  toolCalls: ToolCall[]
  usage: TokenUsage
  timestamp: number
}

interface ToolCall {
  name: string                    // Tool name
  id?: string                     // Tool call ID
  input: Record<string, any>      // Input parameters
  output?: string | Record<string, any>  // Result (if available)
  error?: string                  // Error message (if failed)
}
```

## useOperator Composable

The frontend composable managing the IPC client:

```typescript
interface Operator {
  // Connection lifecycle
  connect(addr: string): Promise<void>
  disconnect(): Promise<void>
  isConnected: Ref<boolean>

  // Request/response
  send(msg: RequestMessage): Promise<ResponseEvent>

  // Streaming dispatch
  dispatch(req: DispatchRequest): Promise<DispatchResult>
  dispatchStream(req: DispatchRequest): Promise<AsyncIterable<ResponseEvent>>

  // Session management
  getSession(sessionID: string): Promise<Session>
  listSessions(agentID: string): Promise<Session[]>
  deleteSession(sessionID: string): Promise<void>
}

interface DispatchRequest {
  agentID: string
  sessionID?: string                    // Create new if not provided
  content: string
  files?: string[]
  metadata?: Record<string, any>
}
```

### Example: Streaming Dispatch

```typescript
const operator = useOperator()
await operator.connect('localhost:60100')

const stream = await operator.dispatchStream({
  agentID: 'architect',
  content: 'Review src/main.ts',
  files: ['src/main.ts'],
})

for await (const event of stream) {
  switch (event.type) {
    case 'turn-started':
      console.log('Turn started:', event.turnID)
      break
    case 'response-chunk':
      console.log('Response:', event.delta)
      break
    case 'tool-call':
      console.log('Tool:', event.name, 'with input:', event.input)
      break
    case 'tool-result':
      console.log('Result:', event.output)
      break
    case 'turn-completed':
      console.log('Complete! Used', event.usage.totalTokens, 'tokens')
      break
  }
}
```

### Example: Single Dispatch

```typescript
const result = await operator.dispatch({
  agentID: 'architect',
  content: 'Deploy the application',
})

console.log(result.content)        // Final response
console.log(result.usage)          // Token usage
console.log(result.turns)          // Full history
```

## Stream Event Handling

### Frontend Processing

The `useAgentSession` composable handles incoming events:

```typescript
const session = useAgentSession(agentID)

// Listen to stream
for await (const event of stream) {
  switch (event.type) {
    case 'turn-started':
      session.startTurn(event.turnID)
      break

    case 'response-block':
      session.setResponseContent(event.content)
      break

    case 'response-chunk':
      session.appendResponseChunk(event.delta)
      break

    case 'tool-call':
      session.addToolCard(event)
      break

    case 'tool-result':
      session.updateToolResult(event.toolID, event.output)
      break

    case 'turn-completed':
      session.completeTurn(event)
      break

    case 'error':
      session.setError(event)
      break
  }
}
```

### Component Rendering

Components react to session state changes:

```vue
<template>
  <AgentView v-if="!isLoading">
    <Turn v-for="turn in turns" :key="turn.id" :turn="turn" />
    <ResponseBlocks v-if="currentTurn">
      <ResponseBlock :content="currentTurn.response.content" />
      <ToolCard
        v-for="tool in currentTurn.toolCalls"
        :key="tool.id"
        :tool="tool"
      />
    </ResponseBlocks>
  </AgentView>
  <LoadingIndicator v-else />
</template>

<script setup>
const session = useAgentSession(props.agentID)
const turns = computed(() => session.turns)
const currentTurn = computed(() => session.currentTurn)
const isLoading = computed(() => session.isLoading)
</script>
```

## Error Handling

### Network Errors

Connection failures are retried automatically:

```typescript
async function connectWithRetry(addr: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operator.connect(addr)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
    }
  }
}
```

### Stream Errors

Errors in processing are caught and displayed:

```typescript
const session = useAgentSession(agentID)

try {
  for await (const event of stream) {
    // Process event
  }
} catch (error) {
  session.setError({
    code: 'STREAM_ERROR',
    message: error.message,
    recoverable: true,
  })
}
```

### Provider Errors

LLM API errors are wrapped and returned:

```typescript
if (event.type === 'error' && event.code === 'PROVIDER_ERROR') {
  // Handle LLM error
  console.log('Provider error:', event.message)
  // May retry depending on error type
}
```

## Flow Control

### Backpressure Handling

Frontend can pause/resume stream:

```typescript
const stream = await operator.dispatchStream(request)
let paused = false

for await (const event of stream) {
  if (paused) {
    await waitForResume()
  }
  processEvent(event)
}
```

### Timeout Management

Requests have configurable timeouts:

```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 30000)

try {
  const result = await operator.dispatch(request, {
    signal: controller.signal,
  })
} finally {
  clearTimeout(timeout)
}
```

## Protocol Evolution

### Versioning

Add version to request for backward compatibility:

```json
{
  "version": "1.0",
  "id": "req-123",
  "type": "dispatch",
  ...
}
```

### Extended Events

New event types are additive and backward-compatible:

```json
{
  "type": "custom-event",
  "customField": "value",
  "timestamp": 1234567890
}
```

Frontend ignores unknown event types or processes them gracefully.

## Performance Optimization

### Streaming Benefits

Streaming provides:
- **Real-time Updates**: Events flow immediately
- **Progressive Rendering**: Render response as it arrives
- **Cancel Support**: Can stop stream mid-response
- **Memory Efficiency**: Don't buffer entire response

### Batching

Tool results can be batched:

```json
{"type":"tool-results-batch","results":[{"toolID":"1","output":"..."},{"toolID":"2","output":"..."}]}
```

### Compression

Large responses can use compression:

```json
{
  "type": "response-chunk",
  "deltaEncoded": true,
  "delta": "base64-encoded-gzip",
  "timestamp": 1234567890
}
```

## Security

### Input Validation

- All requests validated against schema
- File paths sanitized (no `../` traversal)
- Commands escaped properly
- Size limits enforced

### Output Sanitization

- Dynamic content sanitized with DOMPurify
- Tool output wrapped in safe containers
- XSS prevention in rendering

### Authentication

- OAuth tokens in all requests
- Token refresh automatic
- Session validation on each request
