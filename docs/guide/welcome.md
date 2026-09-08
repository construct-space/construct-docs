# Welcome to Construct

Welcome to the Construct developer community! This documentation will guide you through understanding, building, and extending the Construct AI-powered development environment.

## What is Construct?

Construct is a desktop development environment that blends AI capabilities with traditional development tools. Unlike browser-based IDEs, Construct is a native application built with modern web technologies and a powerful AI operator backend. It brings AI agents, tools, and reasoning directly into your daily development workflow.

**Key characteristics:**
- AI-native from the ground up with 10+ pre-configured agents
- Modular "Spaces" architecture for extensibility
- Local-first design with privacy in mind
- Cross-platform support (macOS primary, Windows/Linux supported)
- Runs entirely on your machine (operator sidecar at port 60100)

## The Three Codebases

Construct is built from three independently meaningful codebases that work together:

### 1. Operator (Go)
The AI engine and intelligence layer. The operator handles:
- Agent orchestration and reasoning
- Tool execution and management
- Provider communication (Anthropic, OpenAI, DeepSeek, Ollama)
- Session and state management
- Skill definition and execution

**Location:** `construct-app/operator/`
**Technology:** Go 1.23+
**Runs as:** TCP sidecar listening on `:60100`

### 2. Frontend (Vue 3)
The user interface and interaction layer. The frontend handles:
- Space rendering and management
- Chat and conversation UI
- Project browsing and navigation
- Settings and preferences
- Real-time agent feedback

**Location:** `construct-app/frontend/`
**Technology:** Vue 3, Pinia, Vite, TypeScript
**Runs as:** Vite dev server on `:60200` (dev), bundled in desktop app (production)

### 3. Desktop (Rust/Tauri 2)
The native container and system integration layer. The desktop shell handles:
- Window management and rendering
- Operator sidecar lifecycle
- OAuth integration
- PTY terminal support
- Cross-platform binary distribution

**Location:** `construct-app/desktop/`
**Technology:** Rust, Tauri 2, WebView2/WebKit
**Runs as:** Native executable on macOS, Windows, Linux

## How They Communicate

These three codebases communicate via **newline-delimited JSON over TCP**:

```
┌─────────────┐                ┌──────────────┐
│   Frontend  │─ TCP :60100 ──→│   Operator   │
│  (Vue 3)    │←──────────────│  (Go Agent)  │
└─────────────┘                └──────────────┘
       ↑
       │ Window/Lifecycle Mgmt
       │
    ┌──┴─────┐
    │ Desktop │
    │ (Tauri) │
    └─────────┘
```

**Protocol:**
- **Newline-delimited JSON:** Each message is a complete JSON object followed by `\n`
- **Bidirectional:** Frontend sends requests, operator sends responses and events
- **Port 60100:** Default operator TCP port (configurable via environment)
- **Port 60200:** Vite dev server (frontend development only)

## What This Documentation Covers

This documentation is organized into sections to help you navigate by role and task:

| Section | Purpose |
|---------|---------|
| **Guide** | Getting started, project structure, common development workflows |
| **Architecture** | System design, communication protocols, data flow, design patterns |
| **Operator** | Go backend, agents, tools, providers, skills, hooks |
| **Frontend** | Vue 3, Spaces, components, stores, composables |
| **Desktop** | Tauri, window management, native integration, distribution |
| **Spaces** | Space architecture, building custom spaces, distribution |
| **API Reference** | SDK documentation, TypeScript types, Go packages |

## Recommended Reading Order

**For new developers joining the team:**

1. **Start here:** [Welcome](/guide/welcome) (you are here)
2. **Setup:** [Prerequisites](/guide/prerequisites) → [Getting Started](/guide/getting-started)
3. **Orientation:** [Project Structure](/guide/project-structure)
4. **Learn the basics:**
   - [Spaces Concept](/guide/spaces)
   - [Agents and Tools](/guide/agents-and-tools)
5. **Dive deeper:**
   - [Dev Commands Reference](/guide/dev-commands)
   - [Data Directory](/guide/data-directory)
6. **When building:** [Building a Space](/guide/building-a-space)
7. **For architecture deep-dives:** See Architecture section

**For specific workflows:**

- **I want to fix a bug in the frontend:** See [Project Structure](/guide/project-structure) → Frontend, then [Dev Commands](/guide/dev-commands)
- **I want to understand how agents work:** [Agents and Tools](/guide/agents-and-tools) → [Operator Architecture](/architecture/operator)
- **I want to build a custom Space:** [Building a Space](/guide/building-a-space)
- **I want to add a new tool to an agent:** [Agents and Tools](/guide/agents-and-tools) → Operator docs
- **I want to understand the overall architecture:** [Architecture Overview](/architecture/overview)

## Key Concepts at a Glance

**Space:** A self-contained module with pages, components, AI agent, tools, and theme. The frontend is composed of built-in spaces and community spaces.

**Agent:** An AI reasoner configured with model, temperature, max iterations, tools, and safety hooks. One per space.

**Tool:** A function the agent can call. Built-in tools include bash, read, write, edit, glob, grep, listdir. Spaces define custom tools.

**Provider:** LLM backend (Anthropic, OpenAI, DeepSeek, Ollama).

**Session:** A persistent conversation state between frontend and operator, tied to a space and project context.

**Hook:** Safety check that runs before/after tool execution (pre-tool, post-tool validation).

**Skill:** Reusable prompt template triggered by keywords, executed by an agent.

## Getting Help

- **Documentation:** Start with the guide section, dive into architecture as needed
- **Code:** Comments in the codebase, especially in `operator/` and `frontend/src/`
- **Examples:** Look at built-in spaces (Code, Chat, Git, Terminal, etc.) for patterns
- **Issues:** GitHub issues track bugs and features
- **Community:** Construct community spaces and discussions

Next step: Check that you have the [Prerequisites](/guide/prerequisites) installed, then follow the [Getting Started](/guide/getting-started) guide to launch your first dev environment.
