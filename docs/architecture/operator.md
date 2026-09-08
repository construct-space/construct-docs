# Operator Architecture

The Construct Operator is a Go-based sidecar process that orchestrates AI agents, manages tool execution, handles state persistence, and coordinates with external LLM providers. It runs as a separate process communicating with the frontend via TCP.

## Technology Stack

- **Language**: Go 1.23
- **Dependencies**: Minimal (google/uuid, yaml.v3, and standard library)
- **Architecture**: Modular 29-package system
- **Protocol**: Newline-delimited JSON over TCP on port 60100
- **Concurrency**: Goroutines and channels for async operations
- **Storage**: File-backed JSON with RWMutex synchronization

## Project Structure

```
operator/
├── main.go                 # Entry point and TCP server
├── agent/                  # Agent execution logic
├── runner/                 # Agent runner implementation
├── tools/                  # Built-in tool definitions
├── mcp/                    # MCP client integration
├── providers/              # LLM provider abstractions
├── hooks/                  # Hook execution system
├── skills/                 # Skill management
├── sessions/               # Session persistence
├── store/                  # State store management
├── config/                 # Configuration handling
├── utils/                  # Utility functions
└── server/                 # TCP server and protocol
```

## Core Concepts

### Agent System

An agent is a configurable AI execution context:

```go
type Agent struct {
  ID          string                     // Unique identifier
  Model       string                     // Model name (claude-3-opus, etc.)
  Provider    string                     // Provider type
  SystemPrompt string                    // System message
  Tools       []ToolReference            // Available tools
  Config      AgentConfig                // Execution parameters
  Hooks       []HookDefinition           // Lifecycle hooks
}

type AgentConfig struct {
  Temperature    float32
  MaxTokens      int
  TopP           float32
  TopK           int
  StopSequences  []string
}
```

**Execution Flow**:
1. Receive request with agent ID and content
2. Load agent configuration
3. Initialize session with history
4. Build messages with system prompt and context
5. Call LLM provider API
6. Process streaming response
7. Handle tool calls via tool runner
8. Emit events back to frontend

### Agent Runner

The runner implements the core execution loop:

```go
type Runner struct {
  agent        *Agent
  provider     Provider
  toolRegistry ToolRegistry
  hooks        HookExecutor
  state        StateStore
}

func (r *Runner) Run(ctx context.Context, req *Request) error {
  // Pre-agent hooks
  r.hooks.ExecutePre("agent", req)

  // Build message context
  messages := r.buildMessages(req)

  // Stream LLM response
  for event := range r.provider.StreamCompletion(messages) {
    r.processEvent(event)
  }

  // Handle tool calls if present
  for _, toolCall := range response.ToolCalls {
    r.executeTool(toolCall)
  }

  // Post-agent hooks
  r.hooks.ExecutePost("agent", response)

  return nil
}
```

### Turn Model

A turn represents a single interaction:

```go
type Turn struct {
  ID         string         // Unique turn ID
  Request    *RequestBlock  // User request
  Response   *ResponseBlock // Agent response
  ToolCalls  []ToolCall     // Tool executions
  Usage      TokenUsage     // Token counts
  Timestamp  int64          // Creation time
}

type RequestBlock struct {
  Content  string            // User message
  Files    []string          // File references
  Metadata map[string]any    // Custom metadata
}

type ResponseBlock struct {
  Content       string      // AI response text
  ToolCards     []ToolCard  // Tool execution details
  FinalResponse string      // Processed response
}
```

## Provider Abstraction

Providers handle communication with different LLM backends:

```go
type Provider interface {
  // Configuration validation
  Validate() error

  // Complete sends a request and returns streaming response
  Complete(ctx context.Context, req *CompletionRequest) (<-chan CompletionEvent, error)

  // Count tokens in message
  CountTokens(messages []Message) (int, error)

  // Get model info
  GetModelInfo(modelID string) (*ModelInfo, error)
}
```

### Supported Providers

- **Anthropic**: Claude models with full streaming support
- **OpenAI**: GPT-4 and GPT-3.5 with streaming
- **DeepSeek**: DeepSeek-V3 and other models
- **Ollama**: Local model support
- **OpenRouter**: Multi-model routing via OpenRouter API

**Provider Configuration**:
```go
type ProviderConfig struct {
  Type       string            // "anthropic", "openai", "ollama", etc.
  APIKey     string            // Provider API key
  BaseURL    string            // Custom endpoint (optional)
  Model      string            // Model identifier
  MaxTokens  int               // Token limit
  Parameters map[string]any    // Provider-specific params
}
```

## Tool System

### Tool Registry

22+ built-in tools for common development tasks:

**File Operations**:
- `read`: Read file contents
- `write`: Write or create files
- `edit`: Edit file content with precision
- `delete`: Remove files
- `listdir`: List directory contents

**Search and Navigation**:
- `glob`: Find files matching patterns
- `grep`: Search file contents
- `find`: Find files by criteria

**Code Execution**:
- `bash`: Execute shell commands
- `node`: Run JavaScript
- `python`: Run Python scripts

**Project Management**:
- `git`: Version control operations
- `npm`: Package management

**System**:
- `getenv`: Get environment variables
- `setenv`: Set environment variables
- `pwd`: Get current working directory

**Tool Definition**:
```go
type Tool struct {
  ID          string             // Unique identifier
  Name        string             // Display name
  Description string             // Purpose and behavior
  InputSchema JSONSchema         // Parameter specification
  OutputSchema JSONSchema        // Result format
  Handler     ToolHandler        // Execution function
  Enabled     bool               // Available flag
  Hooks       []HookDefinition   // Tool lifecycle hooks
}

type ToolHandler func(ctx context.Context, input map[string]any) (map[string]any, error)
```

### Tool Execution

Tools execute within the agent runner:

```go
func (r *Runner) executeTool(toolCall ToolCall) error {
  // Pre-tool hooks
  r.hooks.ExecutePre("tool", toolCall)

  // Get tool from registry
  tool := r.toolRegistry.Get(toolCall.Name)
  if tool == nil {
    return fmt.Errorf("tool not found: %s", toolCall.Name)
  }

  // Execute tool
  result, err := tool.Handler(ctx, toolCall.Input)

  // Post-tool hooks
  r.hooks.ExecutePost("tool", ToolResult{
    Name:   toolCall.Name,
    Result: result,
    Error:  err,
  })

  return err
}
```

## MCP Integration

The operator supports external tools via MCP (Model Context Protocol):

```go
type MCPClient struct {
  serverURL string
  client    *mcp.Client
  tools     []mcp.Tool
}

func (m *MCPClient) GetTools(ctx context.Context) ([]mcp.Tool, error) {
  // Connect to MCP server
  // Retrieve available tools
  // Parse tool definitions
  return m.tools, nil
}

func (m *MCPClient) CallTool(ctx context.Context, name string, args map[string]any) (string, error) {
  // Format request for MCP server
  // Execute tool remotely
  // Return result
}
```

**MCP Features**:
- Tool discovery and registration
- Remote tool execution
- Resource access (files, data)
- Protocol compliance

## Session Management

Sessions persist agent interactions:

```go
type Session struct {
  ID        string      // Unique session identifier
  AgentID   string      // Associated agent
  CreatedAt int64       // Creation timestamp
  UpdatedAt int64       // Last update
  Turns     []Turn      // Conversation history
  Metadata  map[string]any
}
```

**Persistence**:
- Sessions stored as JSON files
- One file per session in `data/sessions/`
- Automatic save after each turn
- Compression for large histories

**Session Store**:
```go
type SessionStore interface {
  Get(sessionID string) (*Session, error)
  Save(session *Session) error
  List(agentID string) ([]*Session, error)
  Delete(sessionID string) error
}
```

## State Store

File-backed JSON storage with RWMutex synchronization:

```go
type StateStore struct {
  dataDir string
  mu      sync.RWMutex
  data    map[string]any
}

func (s *StateStore) Get(key string) (any, error) {
  s.mu.RLock()
  defer s.mu.RUnlock()
  return s.data[key], nil
}

func (s *StateStore) Set(key string, value any) error {
  s.mu.Lock()
  defer s.mu.Unlock()
  s.data[key] = value
  return s.saveToFile(key)
}
```

### State Files

**storage.json**: General application state
```json
{
  "workspaces": [...],
  "recentProjects": [...],
  "agents": [...],
  "version": "1.0"
}
```

**settings.json**: User configuration
```json
{
  "theme": "dark",
  "language": "en",
  "autoSave": true,
  "defaultModel": "claude-3-opus",
  "providers": {...}
}
```

**pinned.json**: Pinned items (tools, skills, spaces)
```json
{
  "tools": ["bash", "read", "write"],
  "skills": ["code-review", "documentation"],
  "spaces": ["architect", "chat"]
}
```

**designs.json**: Design and template definitions
```json
{
  "templates": [...],
  "designs": [...],
  "customComponents": [...]
}
```

**project-settings.json**: Per-project configuration
```json
{
  "projectName": "construct",
  "root": "/path/to/project",
  "settings": {...}
}
```

**skill-states.json**: Skill metadata and state
```json
{
  "skills": {
    "code-review": {
      "enabled": true,
      "version": "1.0",
      "lastUsed": 1234567890
    }
  }
}
```

**hook-states.json**: Hook configuration and state
```json
{
  "hooks": {
    "pre-tool": [...],
    "post-tool": [...],
    "pre-agent": [...],
    "post-agent": [...]
  }
}
```

**mcp-states.json**: MCP server state and configuration
```json
{
  "servers": {
    "server-name": {
      "url": "...",
      "enabled": true,
      "tools": [...]
    }
  }
}
```

## Hook System

Hooks allow injection of custom logic at lifecycle points:

```go
type Hook struct {
  ID        string           // Unique identifier
  Name      string           // Display name
  Type      HookType         // "pre-tool", "post-tool", etc.
  Target    string           // Target tool/agent (or "*" for all)
  Handler   HookHandler      // Execution function
  Enabled   bool             // Active flag
  Config    map[string]any   // Custom configuration
}

type HookHandler func(ctx context.Context, data map[string]any) error
```

### Hook Types

- **pre-tool**: Before tool execution (validation, logging, modification)
- **post-tool**: After tool execution (result processing, cleanup)
- **pre-agent**: Before agent turn starts
- **post-agent**: After agent turn completes

**Hook Executor**:
```go
type HookExecutor struct {
  hooks map[string][]Hook
}

func (he *HookExecutor) ExecutePre(hookType string, data map[string]any) error {
  for _, hook := range he.hooks[hookType] {
    if !hook.Enabled {
      continue
    }
    if err := hook.Handler(context.Background(), data); err != nil {
      return err
    }
  }
  return nil
}
```

## Skill System

Skills are reusable prompt templates:

```go
type Skill struct {
  ID          string            // Unique identifier
  Name        string            // Display name
  Description string            // Purpose
  Metadata    SkillMetadata     // YAML frontmatter
  Prompt      string            // Markdown content
  Variables   []SkillVariable   // Template variables
  Enabled     bool              // Available flag
}

type SkillMetadata struct {
  Name        string
  Description string
  Model       string
  Temperature float32
  Tools       []string
  Tags        []string
}
```

**Skill Files**:

Stored as markdown with YAML frontmatter:

```yaml
---
name: CodeReview
description: Review code for quality issues
model: claude-3-opus
temperature: 0.7
tools:
  - read
  - grep
tags:
  - code
  - review
---

# Code Review Skill

You are an expert code reviewer...

## Input

The user will provide code to review.

## Review Focus

- Code quality
- Performance
- Security
- Maintainability
```

**Skill Execution**:

1. Load skill template
2. Substitute variables
3. Create agent with skill tools
4. Execute with skill prompt
5. Return results

## TCP Server

The operator runs a TCP server on port 60100:

```go
func (s *Server) Serve(addr string) error {
  listener, err := net.Listen("tcp", addr)
  if err != nil {
    return err
  }
  defer listener.Close()

  for {
    conn, err := listener.Accept()
    if err != nil {
      continue
    }

    go s.handleConnection(conn)
  }
}

func (s *Server) handleConnection(conn net.Conn) {
  defer conn.Close()

  scanner := bufio.NewScanner(conn)
  for scanner.Scan() {
    var req RequestMessage
    if err := json.Unmarshal(scanner.Bytes(), &req); err != nil {
      // Send error response
      continue
    }

    // Process request
    s.processRequest(conn, &req)
  }
}
```

### Protocol

**Request Format** (JSON, newline-terminated):

```json
{
  "id": "request-uuid",
  "type": "dispatch",
  "agentID": "architect",
  "sessionID": "session-uuid",
  "content": "Deploy the application",
  "files": ["src/main.ts"],
  "metadata": {}
}
```

**Response Format** (Streaming, newline-delimited JSON):

```json
{"type": "turn-started", "turnID": "turn-uuid"}
{"type": "response-block", "content": "I'll help..."}
{"type": "tool-call", "name": "bash", "input": {...}}
{"type": "tool-result", "output": "..."}
{"type": "response-chunk", "content": "more text"}
{"type": "turn-completed", "usage": {"input": 100, "output": 200}}
```

## Concurrency Model

Uses goroutines and channels for async operations:

- **Connection Handling**: One goroutine per client connection
- **Request Processing**: Goroutine pool for parallel execution
- **Tool Execution**: Spawned goroutines for long-running tools
- **Event Streaming**: Channel-based event propagation
- **Shutdown**: Context cancellation for graceful shutdown

## Error Handling

Structured error propagation:

```go
type ErrorResponse struct {
  Code    string `json:"code"`
  Message string `json:"message"`
  Details map[string]any `json:"details,omitempty"`
  Stack   string `json:"stack,omitempty"` // Dev mode only
}
```

**Error Codes**:
- `INVALID_REQUEST`: Malformed request
- `AGENT_NOT_FOUND`: Agent doesn't exist
- `TOOL_ERROR`: Tool execution failed
- `PROVIDER_ERROR`: LLM API error
- `SESSION_ERROR`: Session operation failed
- `INTERNAL_ERROR`: Unexpected server error

## Configuration

Configuration from environment and files:

```go
type Config struct {
  DataDir       string // Operator data directory
  OperatorPort  int    // TCP server port (60100)
  LogLevel      string // debug, info, warn, error
  Providers     map[string]ProviderConfig
  DefaultModel  string
  Concurrency   int
}
```

**Loading**:
1. Environment variables (CONSTRUCT_*)
2. config.yaml in data directory
3. Defaults built-in

## Database and Persistence

**Flat File Storage**:
- Uses JSON files in `data/` directory
- RWMutex for concurrent access
- Automatic backups before write
- Hot reload for config changes

**Data Directory Structure**:
```
data/
├── sessions/          # Session JSON files
│   ├── session-uuid-1.json
│   └── session-uuid-2.json
├── storage.json       # General state
├── settings.json      # User settings
├── pinned.json        # Pinned items
├── designs.json       # Design definitions
├── project-settings.json
├── skill-states.json
├── hook-states.json
└── mcp-states.json
```

## Startup Sequence

1. **Parse Config**: Load from environment/files
2. **Initialize Store**: Load all state files
3. **Register Tools**: Built-in and MCP tools
4. **Load Agents**: From configuration
5. **Initialize Providers**: Validate API keys
6. **Start TCP Server**: Listen on port 60100
7. **Wait for Connections**: Accept and handle requests
