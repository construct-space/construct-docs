# Data Flow

Interactive animated visualization showing how data flows through Construct's architecture across five key scenarios. This page helps understand the complete request lifecycle from initial user action through final rendered result.

<div style="width:100%;height:80vh;border:1px solid var(--vp-c-divider);border-radius:8px;overflow:hidden;margin-top:16px;">
  <iframe src="/flow.html" style="width:100%;height:100%;border:none;" loading="lazy"></iframe>
</div>

## Scenarios

The data flow visualization covers five critical paths through the system:

### 1. Architect Dispatch Stream

The primary and most complex flow for AI-assisted development:

**18 Steps** from user prompt to rendered response with tool execution:

1. **User Input** — Text entered in AgentInput component
2. **Session Creation** — useAgentSession initializes new turn
3. **Dispatch Call** — useOperator.dispatchStream() invoked
4. **TCP Request** — RequestMessage sent to :60100
5. **Operator Receive** — Server accepts connection
6. **Agent Load** — Operator loads configured agent
7. **Session Lookup** — Retrieves conversation history
8. **Message Build** — Constructs LLM API request with context
9. **Provider Call** — Anthropic/OpenAI API invoked with streaming
10. **Stream Process** — Operator parses streaming response chunks
11. **Tool Detection** — Agent identifies tool use in response
12. **Tool Execute** — Operator invokes bash/read/grep/etc.
13. **Tool Result** — Output captured and formatted
14. **Event Emit** — ToolResultEvent sent via TCP to frontend
15. **Frontend Receive** — Event processed by useAgentSession
16. **ToolCard Create** — ResponseBlock renders tool execution
17. **Final Response** — AI completes response after tools
18. **Turn Complete** — TurnCompletedEvent sent, session saved

**Key Files**:
- Frontend: `components/agent/AgentView.vue`, `composables/useAgentSession.ts`
- Desktop: `src/bridge.rs`
- Operator: `runner/runner.go`, `providers/anthropic.go`, `tools/bash.go`

**Data Structures**:
```
RequestMessage
  ↓
Turn { Request, Response[], ToolCall[] }
  ↓
ResponseEvent[] (streaming)
  ↓
DispatchResult { content, turns[], usage }
```

### 2. General Chat

A simpler 12-step flow for non-specialized conversations:

1. **User Message** — Text in chat input
2. **Session Dispatch** — Send to default agent
3. **Operator Accept** — Receive request
4. **Agent Execute** — No tools required
5. **LLM Call** — API request with chat history
6. **Stream Response** — Streaming tokens
7. **Response Chunks** — Emit ResponseChunkEvent per 50 tokens
8. **Frontend Accumulate** — Build response text
9. **Display Update** — Real-time text update in chat
10. **Completion** — LLM returns end_turn
11. **Save Session** — Persist turn to storage.json
12. **Render Complete** — Final response visible

**Key Files**:
- Frontend: `components/ai/AssistantPanel.vue`, `stores/conversations.ts`
- Operator: `runner/chat_mode.go`

**Simpler Flow**:
```
UserMessage
  ↓
AgentExecute (no tools)
  ↓
ResponseChunkEvent[] (streaming)
  ↓
ChatHistory persisted
```

### 3. MCP Tool Call

8-step flow showing external tool integration:

1. **Tool Request** — Agent decides to use MCP tool
2. **Tool Lookup** — Operator finds tool in MCP registry
3. **MCP Connect** — Opens connection to MCP server
4. **Tool Args** — Marshals arguments to MCP format
5. **Remote Execute** — MCP server processes tool
6. **Result Stream** — Server returns result stream
7. **Frontend Receive** — ToolResultEvent with output
8. **Response Continue** — Agent continues after tool

**Key Files**:
- Operator: `mcp/client.go`, `tools/mcp_runner.go`
- Frontend: `components/ui/ToolCard.vue`

**Example MCP Tools**:
- Filesystem tools
- Database queries
- External APIs
- Custom integrations

```
AgentToolUse
  ↓
MCPServerConnection
  ↓
RemoteToolExecution
  ↓
StreamedResult
```

### 4. Space Loading

9-step flow for dynamic space discovery and registration:

1. **App Init** — Frontend initializes with main.ts
2. **Router Ready** — Vue Router initialized
3. **Space Discovery** — spaceHost scans available spaces
4. **Built-in Spaces** — Load from frontend/spaces/
5. **Space Register** — Each space added to registry
6. **Sidebar Render** — Sidebar shows space list
7. **User Click** — Click space in sidebar
8. **Route Change** — Router navigates to space/:id
9. **Space Mount** — Component loaded and rendered

**Key Files**:
- Frontend: `main.ts`, `spaceHost.ts`, `components/common/Sidebar3D.vue`
- Space Example: `spaces/architect/ArchitectSpace.vue`

**Space Lifecycle**:
```
SpaceDefinition
  ↓
spaceHost.register()
  ↓
SidebarItem rendered
  ↓
User clicks
  ↓
Router navigates
  ↓
Component mounted
```

### 5. OAuth Login

11-step flow for desktop-native authentication:

1. **Login Button** — User clicks "Sign In"
2. **OAuth Handler** — desktop/src/oauth.rs invoked
3. **Auth URL Build** — Construct provider URL
4. **Browser Launch** — system.open() opens browser
5. **User Authorize** — User grants permission in browser
6. **Device Poll** — Tauri polls provider for token
7. **Token Received** — Provider returns OAuth token
8. **Keychain Store** — Token stored in system keychain
9. **Frontend Notify** — OAuth event emitted to frontend
10. **Store Update** — auth store updated with user info
11. **Route Redirect** — Redirect to main app

**Key Files**:
- Desktop: `src/oauth.rs`, `commands/auth.rs`
- Frontend: `stores/auth.ts`, `router/auth-guard.ts`
- Operator: Validates token on each request

**Security Flow**:
```
UserAction
  ↓
OAuthProvider
  ↓
SystemKeychain (secure storage)
  ↓
Frontend AuthStore
  ↓
Authenticated Session
```

## How to Use

The data flow visualization is fully interactive:

### Animation Controls

- **Play** button starts step-by-step animation
- **Speed slider** adjusts animation pace (0.5x to 3x)
- **Step count** shows progress through scenario
- **Pause** at any step for detailed inspection

### Information Display

Each step shows:

- **Step number** in sequence
- **Component/module name** involved
- **File path** where logic lives
- **Data being passed** through system
- **Previous/next steps** for context

### Color Coding

- **Green** — Frontend (Vue 3, composables)
- **Purple** — Desktop (Tauri, Rust)
- **Orange** — Operator (Go, AI engine)
- **Pink** — External (LLM APIs, databases, MCP servers)

### Navigation

- **Dropdown menu** to select scenario
- **Previous/Next buttons** to step through
- **Click scenario title** to zoom to that flow section
- **Timeline slider** to jump to any step

## Key Insights

### Real-time Streaming

Steps 2-7 of Architect Dispatch show how streaming provides responsive UI:

- LLM sends tokens as they're generated
- Frontend renders immediately (not waiting for completion)
- User sees response being "typed" in real-time
- Enables cancellation mid-stream

### Tool Integration

Step 11-14 shows the tool execution model:

- Agent decides when to use tools (no pre-defined sequence)
- Tools execute in series or parallel
- Results feed back into agent reasoning
- Agent may use multiple tools before final response

### Separation of Concerns

The flows clearly show architecture boundaries:

- **Frontend**: Only rendering and user interaction
- **Desktop**: Only native integration and process management
- **Operator**: Only AI logic, tool execution, and state
- **Data flows**: Always through clear, typed channels

### Error Recovery

Each flow includes error handling paths:

- Network failures trigger retries
- Invalid requests get error responses
- Tool failures logged but conversation continues
- OAuth can be restarted if expired

### State Persistence

Flows show where state is saved:

- **Operator storage.json**: Session history after each turn
- **Frontend Dexie**: Conversation cache for offline access
- **System Keychain**: OAuth tokens (most secure)
- **project-settings.json**: Project-specific configuration

## Common Patterns

### Request-Response Lifecycle

All flows follow a similar pattern:

1. **Initiation** — User action or system event
2. **Routing** — Message sent to appropriate handler
3. **Processing** — Main logic executes (may have substeps)
4. **Response** — Result generated and sent back
5. **Rendering** — Frontend displays result
6. **Persistence** — State saved for continuity

### Event Streaming

Architect and Chat flows show streaming benefits:

- **Multiple events** for single request
- **Events in sequence** for correct ordering
- **Real-time updates** without blocking
- **Cancellation** possible at any point

### Provider Abstraction

The Architect flow's step 9 shows how provider abstraction works:

- Operator abstracts LLM choice
- Same flow works for Anthropic, OpenAI, DeepSeek, etc.
- Switching providers requires no UI changes
- New providers add via simple interface

## Debugging with Data Flows

Use these flows when debugging issues:

**"Tool output not showing"** → Check steps 12-14 (Tool Execution)
- Verify tool is registered in operator
- Check tool handler returns proper format
- Ensure ToolResultEvent is emitted

**"Response won't stream"** → Check steps 9-10 (LLM Streaming)
- Verify provider supports streaming
- Check network connection to :60100
- See browser console for TCP errors

**"Space won't load"** → Check steps 2-6 (Space Loading)
- Verify space component is exported
- Check spaceHost registration
- See router logs for navigation errors

**"OAuth fails"** → Check steps 3-7 (OAuth Login)
- Verify OAuth credentials configured
- Check keychain/credential manager access
- Monitor browser for provider auth response

## Performance Optimization Points

The flows highlight optimization opportunities:

### Caching

- **Space definitions** cached after first load
- **Session history** cached in Dexie
- **OAuth tokens** cached in keychain

### Lazy Loading

- **Spaces** loaded on-demand (step 8)
- **Tool definitions** loaded when agent initializes
- **Provider configs** loaded at startup

### Parallelization

- **Multiple tools** executed in parallel (step 13)
- **Response chunks** processed concurrently
- **Session saves** non-blocking (background task)

## Extension Points

Each flow shows where the architecture can be extended:

- **New Provider** → Add to step 9 (Architect flow)
- **New Tool** → Register in step 12 (Tool Execution)
- **New Space** → Add to step 3 (Space Loading)
- **New Hook** → Insert anywhere via hook system
