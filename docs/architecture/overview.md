# Architecture Overview

Construct is an AI-powered desktop development environment built on Tauri 2, Vue 3, and a Go-based operator sidecar. This document provides a comprehensive overview of the system architecture and how its components interact.

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Construct Desktop App (Tauri 2 + Vue 3)                │
│                                                         │
│  ┌──────┐  ┌──────────────────────────────────────────┐ │
│  │  3D  │  │  Shell                                   │ │
│  │ Side │  │  ┌────────────────────────────────────┐  │ │
│  │ bar  │  │  │  Toolbar3D (breadcrumb + actions)  │  │ │
│  │      │  │  ├────────────────────────────────────┤  │ │
│  │      │  │  │  Space Content (active space page) │  │ │
│  └──────┘  └──────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ AssistantPanel   │  │  Stores (Pinia)              │  │
│  │ (AgentView)      │  │  auth, project, settings     │  │
│  └─────────────────┘  └──────────────────────────────┘  │
└───────────────┬─────────────────────────────────────────┘
                │ TCP :60100 (newline-delimited JSON)
┌───────────────▼─────────────────────────────────────────┐
│  Construct Operator (Go sidecar)                        │
│  Agents │ Tools │ Skills │ Providers │ Sessions │ Hooks │
│  MCP Protocol │ State Store (file-backed JSON)          │
└─────────────────────────────────────────────────────────┘
```

## Three-Layer Architecture

Construct's architecture consists of three primary layers, each responsible for distinct concerns:

### Layer 1: Frontend (Vue 3 + TypeScript)

The user-facing layer that handles all UI rendering, user interactions, and local state management.

- **Framework**: Vue 3 with TypeScript 5.9, Vite 8, Tailwind CSS 4.2
- **Shell Components**: 3D-transformed sidebar and toolbar using CSS transforms
- **Agent View**: Block-based interface showing turns (Request + Response pairs)
- **Spaces**: Pluggable UI pages for specialized workflows (built-in spaces, custom space support)
- **State Management**: Pinia stores for auth, project, settings, conversations, preferences, panels, and pinned items
- **Storage**: Dexie (IndexedDB) for conversations and local data, idb-keyval for key-value storage
- **Operator Client**: TCP-based client for communicating with the operator sidecar

### Layer 2: Desktop (Tauri 2 + Rust)

The native desktop integration layer providing system-level capabilities and IPC bridging.

- **Framework**: Tauri 2 with Rust
- **Runtime Orchestration**: Spawns and manages the Go operator sidecar
- **Bridge**: Facilitates IPC communication between frontend and operator on port 60101
- **Native Features**: OAuth flows, PTY/shell emulation, LSP integration, clipboard access
- **Plugins**: 13+ Tauri plugins for file system, shell, process, dialog, menu, keychain, and more
- **Window Management**: Multi-window support with persistent window state

### Layer 3: Operator (Go Sidecar)

The AI and tool orchestration engine running as a separate process.

- **Language**: Go 1.23 with minimal dependencies
- **Agent System**: Composable agent configuration, execution loop, tool integration
- **Providers**: Abstractions for Anthropic, OpenAI, DeepSeek, Ollama, OpenRouter
- **Tools**: 22+ built-in tools (bash, file operations, glob, grep, etc.) plus MCP integration
- **State Management**: File-backed JSON storage with RWMutex synchronization
- **Sessions**: Persistent session tracking and history
- **Hooks**: Pre/post-execution hooks for tool and agent lifecycle events
- **Skills**: Markdown-based prompt templates with YAML frontmatter

## Communication Patterns

### Frontend ↔ Operator (TCP Port 60100)

The primary communication channel between frontend and operator uses TCP on port 60100 with a newline-delimited JSON protocol:

```
User Input (Vue component)
    ↓
useAgentSession Composable
    ↓
useOperator Client (TCP connection)
    ↓
Operator receives RequestMessage
    ↓
Agent executes with LLM API
    ↓
Stream events sent back via TCP (newline-delimited JSON)
    ↓
ResponseBlock components rendered
```

**Protocol**: Request/Response model with streaming events for real-time updates

### Desktop ↔ Operator (Tauri IPC Port 60101)

Internal bridge communication for process management and system integration.

## Key Concepts

### Spaces

Spaces are pluggable UI pages that can be loaded into the shell. They provide specialized workflows and interfaces for different use cases.

- **Built-in Spaces**: Located in `frontend/spaces/`
- **Registration**: Spaces are discovered and registered via `spaceHost.ts`
- **Lifecycle**: Loaded on demand, mounted into the Shell component

### Agents

Agents are configurable AI execution contexts that combine:

- **Configuration**: Model, temperature, system prompt, tools
- **Execution Loop**: Turn-based interaction with user and tools
- **Tools**: Dynamic tool registry for agent capabilities
- **Hooks**: Pre/post-execution lifecycle hooks

### Tools

Tools are executable functions that agents can call:

- **Built-in Tools**: bash, read, write, edit, glob, grep, listdir, etc.
- **MCP Tools**: External tools via MCP (Model Context Protocol)
- **Tool Registry**: Dynamically loaded and validated
- **Execution**: Synchronous or async with streaming support

### Agent View Block Model

The frontend renders agent interactions as blocks:

```
Turn
├── RequestBlock
│   └── User message/action
├── ResponseBlock
│   ├── AI response text
│   ├── ToolCard (per tool call)
│   │   ├── Tool name and input
│   │   ├── Execution status
│   │   └── Tool output
│   └── Final response
└── Usage (tokens, cost)
```

**Components**:
- `Turn`: Request + Response pair
- `RequestBlock`: User input representation
- `ResponseBlock`: AI output with nested tool executions
- `ToolCard`: Individual tool call visualization

### Hooks

Hooks allow custom logic injection at key lifecycle points:

- **Pre-Tool**: Execute before tool execution (validation, logging)
- **Post-Tool**: Execute after tool execution (result processing, cleanup)
- **Pre-Agent**: Execute before agent turn
- **Post-Agent**: Execute after agent turn

### Skills

Skills are reusable prompt templates stored as markdown with YAML frontmatter:

```yaml
---
name: CodeReview
description: Review code for quality
model: claude-opus
temperature: 0.7
---

# Code Review Skill

Review the provided code...
```

Skills can be:
- **Created**: User-defined in the frontend
- **Shared**: Published to skill libraries
- **Versioned**: Tracked with state and metadata
- **Executed**: Invoked through the agent system

### Providers

Provider abstractions allow switching between different LLM backends:

- **Anthropic**: Claude models with full feature support
- **OpenAI**: GPT models with streaming
- **DeepSeek**: DeepSeek models
- **Ollama**: Local model support
- **OpenRouter**: Multi-model routing

## 3D Shell

The Construct shell uses CSS 3D transforms for a modern, visually engaging interface:

- **Sidebar**: 3D-transformed left navigation panel
- **Toolbar**: Breadcrumb navigation and action buttons
- **Space Content**: Active page rendered with full width/height
- **Perspective**: CSS `perspective` and `transform: translateZ` for depth

## Data Flow

The primary data flow for an agent interaction:

1. **User Input**: Text entered in AgentInput component
2. **Session Dispatch**: `useAgentSession.dispatch()` called
3. **TCP Request**: `useOperator.dispatch()` sends JSON to operator on :60100
4. **Agent Execution**: Operator executes agent loop with LLM API
5. **Streaming Response**: Operator sends stream events (newline-delimited JSON)
6. **Frontend Processing**: useAgentSession receives and processes events
7. **Block Rendering**: ResponseBlock components render LLM output and tool calls
8. **Presentation**: AgentView displays complete turn with metadata

## Storage Architecture

### Frontend Storage

- **IndexedDB (Dexie)**: Conversations, sessions, workspace data
- **LocalStorage (idb-keyval)**: User preferences, UI state
- **Cookies**: Authentication tokens

### Operator Storage

- **File-backed JSON**: Located in operator data directory
- **storage.json**: General application state
- **settings.json**: User settings and configuration
- **pinned.json**: Pinned items (tools, skills, spaces)
- **designs.json**: Design/template definitions
- **project-settings.json**: Per-project configuration
- **skill-states.json**: Skill metadata and state
- **hook-states.json**: Hook configuration
- **mcp-states.json**: MCP server state

## Security Considerations

- **XSS Protection**: DOMPurify sanitizes all dynamic content
- **Keychain Integration**: OAuth tokens stored in system keychain
- **IPC Validation**: All IPC messages validated and typed
- **Token Management**: Automatic token refresh and rotation
- **Sandbox**: Tauri webview sandbox for frontend isolation

## Performance Optimization

- **Code Splitting**: Lazy-loaded routes and components via Vite
- **Stream Processing**: Real-time streaming for responsive LLM output
- **Fuzzy Search**: Fuse.js for fast search across large datasets
- **State Memoization**: Computed properties and memoization in composables
- **Virtual Scrolling**: For long lists of items

## Extensibility

Construct is designed for extensibility at multiple levels:

- **Spaces**: Custom UI pages with full Vue ecosystem access
- **Skills**: User-defined prompt templates
- **Tools**: MCP integration for external tool support
- **Providers**: Pluggable LLM backends
- **Hooks**: Custom lifecycle logic injection
- **Stores**: Additional Pinia stores for custom state

## Development Philosophy

- **Separation of Concerns**: Clear boundaries between frontend, desktop, and operator
- **Type Safety**: Full TypeScript coverage in frontend, Go in operator
- **Testability**: Composable architecture enables unit and integration testing
- **Minimal Dependencies**: Operator favors minimal deps; frontend uses proven packages
- **AI-First**: Keep AI logic in operator, UI logic in frontend
- **User Control**: Explicit actions, no surprise executions
