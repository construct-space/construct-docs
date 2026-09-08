# Runner Loop

The runner is the core execution engine of the operator. It orchestrates the agent loop: build prompt → call LLM → execute tools → repeat until done.

## Overview

**File**: `internal/runner/runner.go`

The runner implements a turn-based loop. Each turn consists of sending a prompt to the LLM, receiving a response, and (if the response includes tool calls) executing those tools and feeding results back for the next turn.

```
┌─────────────────────────────────────────┐
│            Runner Loop                   │
│                                          │
│  1. Resolve provider + model             │
│  2. Build system prompt                  │
│  3. Send to LLM                          │
│         ↓                                │
│  4. Receive response                     │
│         ↓                                │
│  5. Stop reason = end_turn? → Done       │
│     Stop reason = tool_use?  ↓           │
│  6. Execute tool calls                   │
│  7. Append results to messages           │
│  8. Turn < max_turns? → Go to step 3    │
│     Turn >= max_turns? → Done            │
└─────────────────────────────────────────┘
```

## Runner Struct

```go
type Runner struct {
    providers  *provider.Registry
    tools      *tool.Registry
    agents     *agent.Registry
    hooks      *hook.Manager
    skills     *skill.Manager
    state      *state.Store
    mcp        *mcp.Client
    context    *context.Manager
}
```

The runner receives all dependencies at construction time. No global state.

## Execution Flow

### 1. Resolve Provider

The runner picks a provider based on the agent's model preference:

```go
func (r *Runner) resolveProvider(agentCfg *agent.Config) (provider.Provider, string) {
    // 1. If agent specifies a model, find a provider that supports it
    // 2. Otherwise, use the default provider from settings
    // 3. Fall back to first available provider
}
```

### 2. Build System Prompt

The system prompt is assembled from multiple sources:

```go
func (r *Runner) buildSystemPrompt(agentCfg *agent.Config, ctx *context.Context) string {
    parts := []string{agentCfg.SystemPrompt}

    // Add project context
    if ctx.ProjectPath != "" {
        parts = append(parts, fmt.Sprintf("Project: %s", ctx.ProjectPath))
    }

    // Add matched skills
    for _, skill := range r.skills.Match(task, agentCfg.ID) {
        parts = append(parts, skill.Expand(ctx.Variables()))
    }

    // Add mode context
    if ctx.Mode == "code" {
        parts = append(parts, "Respond with code-focused output.")
    }

    return strings.Join(parts, "\n\n")
}
```

### 3. LLM Call

The runner sends the assembled messages to the provider. For streaming dispatches, chunks are forwarded to the frontend via the transport layer:

```go
// Non-streaming
response, err := provider.Complete(request)

// Streaming
stream, err := provider.Stream(request)
for chunk := range stream.Chunks() {
    onChunk(chunk)  // Forward to frontend
}
```

### 4. Tool Execution

When the LLM returns `stop_reason: "tool_use"`, the runner executes each tool call:

```go
for _, call := range response.ToolCalls {
    // Run pre-hooks
    if blocked := r.hooks.RunPre(call.Tool, call.Input); blocked {
        results = append(results, blockedResult(call))
        continue
    }

    // Execute tool
    result, err := r.tools.Execute(call.Tool, call.Input, execCtx)

    // Run post-hooks
    r.hooks.RunPost(call.Tool, call.Input, result)

    // Collect result
    results = append(results, toolResult(call.ID, result, err))
}
```

Tool results are appended to the message history for the next LLM turn.

### 5. Turn Counting and Limits

Each LLM call increments the turn counter. The loop terminates when:

- **`end_turn`** — the LLM decides it's done (normal completion)
- **`max_tokens`** — response hit the token limit
- **`max_turns`** — reached the agent's turn limit (safety stop)

## Stuck Loop Detection

The runner detects when an agent is stuck in a repetitive loop:

```go
func (r *Runner) isStuck(turns []agent.Turn) bool {
    if len(turns) < 3 {
        return false
    }
    // Check if last 3 turns have identical tool calls
    // If so, inject a nudge message to break the loop
}
```

When detected, the runner injects a system message telling the agent to try a different approach.

## Streaming Protocol

During a streaming dispatch, the runner emits events through a callback:

| Event | When | Data |
|-------|------|------|
| `turn.start` | Beginning of each turn | `{ turn_number }` |
| `text` | Text content from LLM | `{ content }` |
| `tool.call` | Tool execution begins | `{ tool, title, input, call_id }` |
| `tool.result` | Tool execution completes | `{ call_id, content, is_error }` |
| `status` | Status updates | `{ message }` |
| `turn.end` | End of each turn | `{ turn_number }` |
| `done` | Loop finished | `{ content }` |

The frontend's `useAgentSession` composable consumes these events to build the block-based UI.

## Dispatch vs Chat

The runner supports two calling patterns:

**Dispatch** — task-oriented. Takes a single task string, runs the full agent loop, returns the final result:

```go
result, err := runner.Dispatch(agentID, task, opts)
// result.Content, result.Turns, result.Usage
```

**Chat** — message-oriented. Takes a message array (conversation history), runs one turn, returns the response:

```go
result, err := runner.Chat(agentID, messages, opts)
```

Both support streaming variants (`DispatchStream`, `ChatStream`).

## Execution Context

Tools receive an execution context that provides access to project state:

```go
type ExecContext struct {
    ProjectPath   string
    WorkDir       string
    Mode          string     // "code" or "ui"
    Component     string     // Selected component name
    SessionID     string
    AgentID       string
}
```

This allows tools like `bash` to run commands in the correct directory and `read`/`write` to resolve relative paths.
