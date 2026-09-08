# Architecture Map

Interactive visualization of Construct's module structure, dependencies, and connections across the three main layers: Frontend, Desktop, and Operator.

<div style="width:100%;height:80vh;border:1px solid var(--vp-c-divider);border-radius:8px;overflow:hidden;margin-top:16px;">
  <iframe src="/map.html" style="width:100%;height:100%;border:none;" loading="lazy"></iframe>
</div>

## How to Use

The architecture map is an interactive visualization showing all major modules and their relationships:

- **Scroll** to zoom in and out of the architecture
- **Drag** to pan around and explore different areas
- **Click** on any module node to see:
  - Its source files
  - Public exports and APIs
  - Imports and dependencies
  - Connections to other modules
- **Color coding**:
  - **Blue**: Frontend Vue 3 modules
  - **Pink**: Desktop/Tauri Rust modules
  - **Green**: Operator Go packages
  - **Gray**: External dependencies

## Map Structure

The architecture map visualizes three interconnected layers:

### Frontend (Blue Nodes)

The user-facing Vue 3 application:

- **components/** — Vue component hierarchy
  - agent/ — Agent interaction components
  - ai/ — AI/assistant interface components
  - common/ — Shared layout components
  - ui/ — Reusable UI component library
  - spaces/ — Space-specific components

- **composables/** — Reusable Vue 3 composition functions
  - useOperator — TCP client for operator communication
  - useAgentSession — Turn-based session management
  - useAuth — Authentication and session handling
  - useAIModel — Model selection and provider management
  - And 45+ more composition utilities

- **stores/** — Pinia state management
  - auth — User authentication state
  - project — Active project state
  - settings — User configuration
  - conversations — Chat history
  - preferences, panels, pinned — UI state management

- **spaces/** — Built-in space definitions
  - Each space is a pluggable UI page
  - Loaded dynamically via spaceHost
  - Provides specialized workflows

- **utils/** — Utility functions and helpers
- **types/** — TypeScript type definitions

### Desktop (Pink Nodes)

The Tauri 2 native integration layer:

- **src/lib.rs** — Runtime orchestrator
  - Tauri setup and initialization
  - Plugin registration
  - Command handlers

- **operator.rs** — Go sidecar management
  - Spawns and monitors operator process
  - Process lifecycle management
  - Port allocation

- **bridge.rs** — IPC communication bridge
  - TCP socket handling
  - Request/response protocol
  - Event streaming

- **oauth.rs** — Authentication flow
  - Browser-based authorization
  - Device code polling
  - Keychain integration

- **shell.rs** — Terminal integration
  - PTY allocation
  - Shell execution
  - I/O handling

- **lsp.rs** — Language server support
  - LSP client implementation
  - Multiple language servers
  - Code completion and diagnostics

- **menu.rs** — Application menu system
  - macOS menu integration
  - Window menu
  - Custom shortcuts

- **commands/** — Tauri command handlers
  - File operations
  - Process management
  - Settings management

### Operator (Green Nodes)

The Go sidecar AI orchestration engine:

- **agent/** — Agent execution system
  - Agent configuration
  - Execution loop
  - Tool integration

- **runner/** — Agent runner implementation
  - Request processing
  - LLM API calls
  - Event streaming

- **providers/** — LLM provider abstractions
  - Anthropic API
  - OpenAI API
  - DeepSeek API
  - Ollama
  - OpenRouter

- **tools/** — Built-in tool definitions
  - File operations (read, write, edit, glob, grep)
  - Bash execution
  - Directory listing
  - Version control

- **mcp/** — MCP (Model Context Protocol) client
  - External tool integration
  - Tool discovery
  - Remote execution

- **hooks/** — Hook system
  - Pre/post-tool execution hooks
  - Pre/post-agent hooks
  - Custom logic injection

- **skills/** — Skill management
  - Markdown-based templates
  - YAML frontmatter parsing
  - Prompt composition

- **sessions/** — Session persistence
  - Session storage
  - History management
  - State tracking

- **store/** — State store management
  - File-backed JSON storage
  - Configuration persistence
  - RWMutex synchronization

- **server/** — TCP server
  - Connection handling
  - Message routing
  - Event streaming

## Key Connections

The map shows important architectural connections:

### Frontend ↔ Operator (Primary)

- **TCP on :60100** — Newline-delimited JSON protocol
- **useOperator composable** — Client for streaming requests
- **RequestMessage ↔ ResponseEvent** — Message exchange
- **AgentView components** — Render operator responses

### Desktop ↔ Operator (Bridge)

- **operator.rs** — Spawns Go sidecar
- **bridge.rs** — Forwards IPC messages
- **Event emission** — Desktop to frontend events
- **Shutdown coordination** — Lifecycle management

### Frontend ↔ Desktop (Tauri IPC)

- **Tauri commands** — File operations, process management
- **Event listeners** — Real-time updates from desktop
- **Window management** — Native window operations
- **Menu events** — User menu interactions

## Dependency Patterns

The map reveals several key dependency patterns:

### Layered Dependencies

```
Frontend → Desktop (Tauri) → Operator (Go)
   ↓
[User Interface]
   ↓
[Native Integration]
   ↓
[AI & Tool Orchestration]
```

### Composable Abstractions

- Frontend composables aggregate lower-level utilities
- Operator providers abstract LLM APIs
- Tools wrap system commands

### Plugin Architecture

- Spaces are pluggable UI extensions
- Tools can be extended via MCP
- Providers support multiple LLM backends

## Performance Hot Paths

The most frequently used connections (shown with thicker lines if visualization supports):

1. **User Input → AgentView** — High frequency, real-time
2. **useAgentSession → Operator** — Streaming with many events
3. **Tool Execution → Response Rendering** — Event-driven

## Extensibility Points

The map highlights where the architecture is designed for extension:

### Adding a New Provider

1. Implement `Provider` interface in operator/providers/
2. Register in operator config
3. Available immediately in frontend model selector

### Adding a Custom Tool

1. Implement `Tool` interface in operator/tools/
2. Register with tool registry
3. Agents can select and use tool

### Adding a New Space

1. Create Vue component in frontend/spaces/
2. Register via spaceHost
3. Available in sidebar for navigation

### Custom Hooks

1. Define hook in operator/hooks/
2. Configure in settings
3. Executes at lifecycle points
