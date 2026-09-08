# Built-in Spaces

The frontend ships with four built-in spaces in `frontend/spaces/`. Each demonstrates the full space pattern: manifest, pages, agent config, assistant config, composables, and widgets.

## Space Summary

| Space | ID | Purpose | Scope | Agent | Max Iterations |
|-------|----|---------|-------|-------|----------------|
| Chat | `brainstorm` | Explore ideas, general conversation | app | brainstorm | 25 |
| Architect | `architect` | Project planning via interview flow | project | architect | 15 |
| Coder | `coder` | Autonomous code implementation | project | coder | 50 |
| Project | `project` | Project management & organization | project | project | 25 |

## Chat (Brainstorm)

**Location**: `spaces/brainstorm/`

The default conversation space. Always available (scope: app). Provides general-purpose AI chat with session management.

**Agent behavior**: Natural conversation → explores ideas → can write design docs to project directory. Has skills for brainstorming and writing plans. Can invoke the `space` sub-agent.

**Assistant config**: `renderMode: 'blocks'`, `sessionScope: 'assistant'` (sessions tied to this assistant type, not per-project).

**Widgets**: Quick Chat (2x1 and 4x2 sizes) for dashboard.

## Architect

**Location**: `spaces/architect/`

Interview-driven project planning. Asks questions one at a time (never batches), then generates technical specifications.

**Agent behavior**:
- Asks 4-8 questions to understand the project
- Never assumes project type
- Outputs plan summary
- Delegates to `docs` agent for document generation
- Delegates to `project` agent for scaffolding
- Special mode for Construct Space planning (fixed stack: Vue 3 + Tailwind + SDK)

**Assistant config**: `renderMode: 'blocks'`, `sessionScope: 'project'`, has custom normalizer for structured question/answer blocks.

**Widgets**: Quick Architect (1x1 and 4x1 sizes).

## Coder

**Location**: `spaces/coder/`

Autonomous coding agent with the highest iteration limit (50). Not a planner — it executes.

**Agent behavior**:
- Reads `docs/` first to understand the plan
- Sets goal file → executes → checks off criteria (only after real code exists)
- Never suggests options or asks what to do next
- Builds COMPLETE code (not stubs)
- Infers setup from docs (reads tech stack → initializes)
- Verifies before marking done (reads files back)
- Runs dev server to verify

**Page**: Split-pane interface with unified message+tool stream (left) and goal progress tracker + file tree (right). Reads pending goals from `docs/goals/`.

**Skills**:
- `construct-spaces.md` — Full space development guide
- `frontend.md` — Frontend design & implementation patterns

**Composables**: `useCoder()`, `useProcessManager()`, `useProjectRunner()`, `useStaticHtmlServer()`, `useAnsiStrip()`

## Project

**Location**: `spaces/project/`

Project management and organization. Widget-rich for dashboard display.

**Agent behavior**: Context-aware — calls `get_project_context` first, explores with `list_dir`, reads files before modifying. Can invoke architect, coder, and docs agents.

**Tools**: `detect-framework.md` (detects Next, Nuxt, Vite, Angular, Svelte, Rust, Go, Flutter), plus list-projects, project-stats, search-code.

**Widgets**: Recent Projects, Pinned Projects, Deploy Status, Quick Open, Project Stats (5 widgets with multiple size variants).

**Composables**: `useProjectSummary()`, `useAutomationProvider()`

## Space File Structure Pattern

Every space follows this convention:
```
space-{id}/
├── manifest.json           # Core registration (id, name, icon, pages, widgets, scope)
├── pages/                  # Vue route components
├── agent/                  # AI agent configuration
│   ├── config.md          # YAML frontmatter + Handlebars system prompt
│   ├── tools/*.md         # Custom tools (YAML + shell command template)
│   ├── skills/*.md        # Reusable prompt templates
│   └── hooks/safety.json  # Pre/post tool safety hooks
├── assistant/             # How agent output renders
│   ├── config.ts          # AssistantTypeConfig
│   └── index.ts           # Exports
├── components/            # Space-specific UI
├── composables/           # Shared logic
├── widgets/               # Dashboard widgets (multiple sizes)
└── utils/                 # Helpers
```

## How Spaces Register

1. **Manifest parsed** at runtime (not build time)
2. **Theme registered** via `registerSpaceTheme()` in config
3. **Routes generated** dynamically (no hardcoded space routes)
4. **Assistant type registered** from `assistant/config.ts`
5. **Navigation injected** into sidebar if manifest has `navigation` field
6. **Widgets registered** from manifest `widgets` array
