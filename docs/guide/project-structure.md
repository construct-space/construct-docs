# Project Structure

The Construct codebase is organized into three primary directories, each representing a distinct component with clear responsibilities. This guide explains the structure and how the pieces fit together.

## Overview

```
construct-app/
├── operator/         # Go — AI engine (agents, tools, providers, sessions)
├── frontend/         # Vue 3 — UI and interaction layer
├── desktop/          # Rust/Tauri 2 — native shell and container
├── scripts/          # Build, release, and utility scripts
├── docs/             # Architecture and onboarding documentation
└── README.md         # Top-level project documentation
```

## Operator (Go)

The operator is the intelligence and execution layer. It orchestrates AI agents, manages tools, communicates with LLM providers, and maintains session state.

**Location:** `construct-app/operator/`

**Key Entry Point:**
- `main.go` — TCP server startup, operator initialization

**Core Architecture (29 packages in `internal/`):**

```
operator/
├── main.go                      # Entry point, TCP listener setup
├── go.mod                       # Go module definition
├── go.sum                       # Go dependency checksums
│
└── internal/
    ├── agent/                   # Agent orchestration and execution
    │   ├── executor.go
    │   ├── iterator.go
    │   └── ...
    │
    ├── ai/                      # LLM provider abstraction
    │   ├── provider.go
    │   ├── message.go
    │   ├── streaming.go
    │   └── ...
    │
    ├── tool/                    # Tool registry and execution
    │   ├── registry.go
    │   ├── executor.go
    │   ├── builtin.go
    │   └── ...
    │
    ├── provider/                # Concrete provider implementations
    │   ├── anthropic/
    │   ├── openai/
    │   ├── deepseek/
    │   ├── ollama/
    │   └── ...
    │
    ├── session/                 # Session state and persistence
    │   ├── manager.go
    │   ├── store.go
    │   └── ...
    │
    ├── skill/                   # Skill definitions and execution
    │   ├── skill.go
    │   ├── registry.go
    │   └── ...
    │
    ├── space/                   # Space configuration and metadata
    │   ├── space.go
    │   ├── loader.go
    │   └── ...
    │
    ├── state/                   # Persistent application state
    │   ├── state.go
    │   ├── store.go
    │   └── ...
    │
    ├── hook/                    # Pre/post execution safety hooks
    │   ├── hook.go
    │   ├── safety.go
    │   └── ...
    │
    ├── auth/                    # Authentication and authorization
    │   ├── auth.go
    │   ├── oauth.go
    │   └── ...
    │
    ├── project/                 # Project context and metadata
    │   ├── project.go
    │   ├── loader.go
    │   └── ...
    │
    ├── message/                 # Protocol message types
    │   ├── message.go
    │   ├── request.go
    │   ├── response.go
    │   └── ...
    │
    ├── handler/                 # Request routing and handling
    │   ├── handler.go
    │   ├── route.go
    │   └── ...
    │
    ├── logger/                  # Structured logging
    │   ├── logger.go
    │   └── ...
    │
    └── ... (18+ additional packages)
```

**Key Responsibilities:**

- **Agent Execution:** Orchestrate agent reasoning loops (max 25 iterations by default)
- **Tool Management:** Register, validate, and execute tools (bash, read, write, edit, glob, grep, listdir, etc.)
- **Provider Communication:** Interface with LLM backends (Anthropic, OpenAI, DeepSeek, Ollama)
- **Session Management:** Track conversation state and history
- **Skill Execution:** Load and trigger reusable prompt templates
- **Safety Hooks:** Run pre/post tool execution validation (see `agent/hooks/safety.json`)
- **Space Configuration:** Load space metadata and agent configs from `agent/config.md`
- **State Persistence:** Store settings, auth, and application state

**Dependencies:** Standard Go libraries, gRPC, JSON marshaling.

**Runs as:** TCP sidecar listening on `:60100` (configurable).

## Frontend (Vue 3)

The frontend is the user interface and interaction layer. It displays spaces, manages chat, renders components, and communicates with the operator.

**Location:** `construct-app/frontend/`

**Key Entry Point:**
- `main.ts` — Vue app initialization, auth setup, space host bootstrap

**Directory Structure:**

```
frontend/
├── main.ts                      # Vue app entry, auth, space host init
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript config
├── tailwind.config.js           # Tailwind CSS config
├── vite.config.ts               # Vite build config
│
├── router/
│   ├── index.ts                 # Vue Router setup with auth guards
│   ├── guards.ts                # Route protection middleware
│   └── routes.ts                # Route definitions
│
├── operator/
│   ├── client.ts                # TCP client (connects to operator)
│   ├── useAgentSession.ts        # Composable for agent interaction
│   ├── types.ts                 # Message protocol types
│   └── ...
│
├── components/
│   ├── agent/                   # Agent-related components
│   │   ├── AgentChat.vue
│   │   ├── MessageBubble.vue
│   │   ├── ToolCall.vue
│   │   └── ...
│   │
│   ├── ai/                      # AI feature components
│   │   ├── AIPanel.vue
│   │   ├── ModelSelector.vue
│   │   └── ...
│   │
│   ├── common/                  # Shared UI components
│   │   ├── Button.vue
│   │   ├── Input.vue
│   │   ├── Modal.vue
│   │   ├── Sidebar.vue
│   │   ├── Breadcrumbs.vue
│   │   └── ...
│   │
│   ├── ui/                      # @construct-space/ui components
│   │   ├── Card.vue
│   │   ├── Container.vue
│   │   ├── Menu.vue
│   │   └── ...
│   │
├── composables/ (50+)           # Reusable component logic
│   ├── useAuth.ts               # Authentication state
│   ├── useOperator.ts           # Operator connection
│   ├── useProject.ts            # Project context
│   ├── useChat.ts               # Chat management
│   ├── useConversation.ts       # Conversation state
│   ├── useSettings.ts           # User settings
│   ├── useSpace.ts              # Space context
│   ├── useTheme.ts              # Theme management
│   ├── useTerminal.ts           # Terminal emulator
│   ├── useSidebar.ts            # Sidebar state
│   ├── useFileSystem.ts         # File browser
│   ├── useHotkeys.ts            # Keyboard shortcuts
│   ├── useNotifications.ts      # Toast notifications
│   └── ... (40+ more)
│
├── stores/                      # Pinia state management
│   ├── auth.ts                  # Auth state (token, user, session)
│   ├── project.ts               # Current project context
│   ├── settings.ts              # User preferences
│   ├── conversations.ts         # Chat history
│   ├── spaces.ts                # Loaded spaces
│   ├── ui.ts                    # UI state (sidebar, theme, modal)
│   ├── ai.ts                    # AI model and provider config
│   ├── terminal.ts              # Terminal state
│   └── ...
│
├── spaces/                      # Built-in spaces (bundled)
│   ├── code/                    # Code space
│   │   ├── index.vue            # Main page
│   │   ├── pages/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── stores/
│   │   ├── agent/
│   │   │   ├── config.md        # Agent config (YAML + templates)
│   │   │   ├── tools/           # Custom tools (markdown)
│   │   │   └── hooks/
│   │   └── space.json           # Space manifest
│   │
│   ├── design/                  # Design space
│   ├── ai/                      # AI assistant space
│   ├── chat/                    # Chat space
│   ├── git/                     # Git integration space
│   ├── terminal/                # Terminal emulator space
│   ├── tasks/                   # Task management space
│   ├── docs/                    # Documentation space
│   ├── notes/                   # Notes space
│   ├── calendar/                # Calendar space
│   └── ...
│
├── lib/
│   ├── appPaths.ts              # Platform-specific app paths
│   ├── spaceHost.ts             # Space lifecycle and messaging
│   ├── constants.ts             # Global constants
│   ├── types.ts                 # Global TypeScript types
│   └── ...
│
├── layouts/
│   ├── DefaultLayout.vue        # Default two-pane layout
│   ├── ProjectLayout.vue        # Project workspace layout
│   └── ...
│
└── assets/                      # Images, fonts, static files
```

**Key Responsibilities:**

- **UI Rendering:** Display spaces, agents, chat interface
- **Operator Connection:** Maintain TCP connection to operator on :60100
- **Space Management:** Load, initialize, and render spaces
- **Chat Interface:** Display agent messages, tool calls, reasoning
- **Project Context:** Track active project and scope
- **Authentication:** Manage OAuth and session tokens
- **State Management (Pinia):** Centralized store for auth, project, settings, conversations
- **Routing:** Hash-based routing with auth guards
- **Component Library:** Reusable UI components and composables

**Build Tool:** Vite with TypeScript, hot module replacement in dev mode.

**Styling:** Tailwind CSS with component-scoped styles where needed.

**Dependencies:** Vue 3, Pinia, Vue Router, Axios, Tailwind CSS, and more (see `package.json`).

**Runs as:** Vite dev server on `:60200` (dev), bundled into Tauri app (production).

## Desktop (Rust/Tauri 2)

The desktop shell is the native container and system integration layer. It manages the application window, operator sidecar lifecycle, OAuth flow, PTY terminal, and platform-specific features.

**Location:** `construct-app/desktop/`

**Key Entry Point:**
- `src/lib.rs` — Tauri runtime setup and initialization

**Directory Structure:**

```
desktop/
├── src/
│   ├── lib.rs                   # Tauri runtime orchestrator
│   ├── operator.rs              # Operator lifecycle management
│   ├── auth.rs                  # OAuth flow integration
│   ├── terminal.rs              # PTY terminal support
│   ├── commands/                # Tauri command handlers
│   │   ├── mod.rs
│   │   ├── file.rs
│   │   ├── process.rs
│   │   └── ...
│   ├── ipc/                     # IPC protocol handlers
│   │   └── ...
│   └── utils/
│       ├── paths.rs             # Platform-specific app paths
│       └── ...
│
├── Cargo.toml                   # Rust dependencies
├── Cargo.lock                   # Dependency lock file
├── tauri.conf.json              # Tauri configuration
│
└── icons/                       # App icons (PNG, ICO, ICNS)
```

**Key Configuration (tauri.conf.json):**

- **Window Config:** Size, min/max bounds, frame options, icon
- **Plugins:** File system access, HTTP client, notification, dialog
- **Security:** IPC allowlist, API permissions, CSP headers
- **Updater:** Auto-update endpoints and behavior
- **Build:** Platform-specific settings for bundle, installer, DMG
- **Bundle:** App signing, entitlements, notarization settings

**Key Responsibilities:**

- **Window Management:** Create and manage application window
- **Operator Sidecar:** Start, monitor, and stop Go operator process
- **OAuth Integration:** Handle OAuth redirects and token exchange
- **PTY Terminal:** Provide terminal emulator via PTY backend
- **File System:** Safe file access through Tauri commands
- **Process Management:** Execute system processes securely
- **Auto-Updates:** Check for and install app updates
- **Native Dialogs:** File pickers, message boxes
- **Platform Integration:** Dock menu (macOS), system tray, notifications

**Dependencies:** Tauri 2, Tokio (async), various platform-specific crates.

**Output:** Native executable (.app for macOS, .exe/.msi for Windows, binary for Linux).

## Scripts Directory

Utility and build scripts.

**Location:** `construct-app/scripts/`

```
scripts/
├── build.sh                     # Build Tauri app for all platforms
├── build-operator.sh            # Compile Go operator
├── release.sh                   # Create versioned release with tags
├── update-versions.sh           # Update version in all files
├── clean.sh                     # Clean build artifacts
└── ...
```

**Key Scripts:**

- `build.sh` — Full build (operator + frontend + Tauri)
- `build-operator.sh` — Go operator compilation only
- `release.sh` — Version update and git tag creation
- `clean.sh` — Remove build caches and artifacts

## Docs Directory

Architecture, design, and onboarding documentation.

**Location:** `construct-app/docs/`

## Communication Flow

```
┌──────────────────┐
│   Desktop Shell  │
│  (Tauri/Rust)    │
└────────┬─────────┘
         │ Spawns & manages
         │
    ┌────▼─────────┐
    │   Operator   │
    │  (Go TCP)    │
    │  :60100      │
    └────┬─────────┘
         │ TCP socket
         │ (newline-delimited JSON)
         │
┌────────▼──────────┐
│  Frontend (Vue)   │
│  Vite :60200 (dev)│
│  Bundled (prod)   │
└───────────────────┘
```

**Protocol:**
1. Frontend sends request → Operator (JSON over TCP)
2. Operator processes request and sends response(s) → Frontend
3. Each message is a complete JSON object followed by newline (`\n`)
4. Bidirectional: frontend → operator (requests), operator → frontend (responses + events)

## Typical Development Workflow

When working on Construct, you'll typically:

1. **Make changes** in one of the three directories (operator, frontend, or desktop)
2. **Run dev build:** `bun run dev` (rebuilds affected parts)
3. **Test in running app:** Changes hot-reload (frontend) or require restart
4. **Check logs:** Terminal output shows operator logs, Tauri logs, Vite output
5. **Verify:** Use browser devtools (Cmd+I) or operator TCP tests

See [Dev Commands Reference](/guide/dev-commands) for all available commands.

## Next Steps

- Read [Spaces](/guide/spaces) to understand the modular frontend architecture
- Explore [Agents and Tools](/guide/agents-and-tools) for AI engine internals
- Check out specific subsystem docs (Operator, Frontend, Desktop) for deep dives
