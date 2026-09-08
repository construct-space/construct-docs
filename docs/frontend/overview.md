# Frontend Overview

The frontend is a Vue 3 + TypeScript single-page application built with Vite 8 and Tailwind CSS 4.2. It runs inside a Tauri 2 desktop shell and communicates with the Go operator sidecar via Tauri IPC.

## Tech Stack

- **Vue 3.6** + **TypeScript 5.9** (strict mode) — Component framework and type safety
- **Vite 8.0** — Build tool and dev server (port :60200)
- **Tailwind CSS 4.2** — Utility-first styling with CSS variables
- **Pinia 3.0** — Centralized state management
- **Vue Router 4.6** — Client-side routing (hash-based)
- **Bun** — Fast package manager and runtime
- **@construct-space/ui** — 60+ reusable UI components
- **@construct-space/sdk** — Host APIs, runtime introspection, and space utilities
- **Tauri 2** — Desktop bridge (window management, IPC, file system access)

## How It All Fits Together (High-Level)

The frontend bootstrap and runtime follow a well-defined flow:

1. **Space Host Initialization** — `main.ts` calls `initSpaceHost()` first, which exposes shared libraries (Vue, Router, Pinia, Tauri, SDK, UI components) via `window.__CONSTRUCT__` globals. This enables space IIFE bundles to reference these dependencies without duplicating code.

2. **Vue App Creation** — `createApp(App)` is instantiated with Pinia store plugin and Vue Router. Global components (`Icon`, `Notification`) are registered.

3. **Authentication Setup** — The auth store runs `hydrateAuthState()` before mount, loading persisted tokens from `auth.json` in the data directory. The UI remains hidden until auth resolves.

4. **App Mount & Layout** — The app mounts to `#app`. The root `DefaultLayout` renders the persistent frame:
   - **Sidebar3D** — Persistent left navigation (projects, spaces, settings)
   - **Toolbar3D** — Top-level actions and breadcrumb
   - **AssistantPanel** — Right-side AI assistant (toggleable with Double-Shift)
   - **RouterView** — Page content area

5. **Project Store Initialization** — `projectStore.initialize()` runs async after mount (non-blocking) to load project metadata.

6. **Operator Bridge** — `startBridgeListener()` begins listening for IPC events from the Go operator. All agent sessions, tool execution, and operator communication flow through here.

7. **Space Loading** — Routes to dynamic spaces (e.g., `/projects/:projectId/my-custom-space`) trigger `DynamicSpacePage`, which:
   - Loads the space's manifest and Vue bundle
   - Injects CSS and global scope
   - Renders the loaded page component

## Directory Structure

```
frontend/
├── main.ts                              # Entry point: space host init → Vue app → auth → mount
├── App.vue                              # Root component wrapping layouts
├── router/
│   ├── routes.ts                        # Route definitions (static + dynamic space routes)
│   └── guards.ts                        # Auth guard, onboarding check, popout detection
├── layouts/
│   ├── DefaultLayout.vue                # Main frame: Sidebar3D + Toolbar3D + AssistantPanel + RouterView
│   ├── ProjectLayout.vue                # Project-scoped wrapper
│   └── SpaceLayout.vue                  # Dynamic space page wrapper
├── operator/                             # Go operator communication layer
│   ├── client.ts                        # useOperator() — connect, dispatch, streaming
│   ├── useAgentSession.ts               # Block-based session handling (Turn, RequestBlock, ResponseBlock)
│   ├── useAssistant.ts                  # Legacy flat message chat panel (deprecated)
│   ├── useStreamStatus.ts               # Stream event → human-readable status conversion
│   ├── streamEvents.ts                  # Event type constants (DISPATCH, STREAM_CHUNK, etc.)
│   └── types.ts                         # Protocol types (DispatchResult, Turn, Block, etc.)
├── assistant/                            # Block-based rendering & AI type system
│   ├── blocks.ts                        # Block type definitions (Text, Tool, Code, Image, etc.)
│   ├── schema.ts                        # Zod validation for assistant.v1 envelopes
│   ├── normalize.ts                     # Envelope → ResponseBlock[] conversion
│   ├── registry.ts                      # Runtime assistant type catalog (register/unregister)
│   ├── loader.ts                        # Core + space-specific assistant type loading
│   └── runtime.ts                       # Surface-to-type mapping for assistant instances
├── components/
│   ├── agent/                           # Agent interaction (AgentView, AgentInput, ResponseBlocks)
│   ├── ai/                              # AssistantPanel component
│   ├── common/                          # Sidebar3D, Toolbar3D, ConfirmationModal, notifications
│   ├── panels/                          # SplitPane, BottomPanel, FileExplorer
│   ├── toolbar/                         # Search bar, breadcrumb navigation
│   └── media/                           # MediaPicker, MediaUpload
├── composables/                          # 50+ reusable Vue composables
│   ├── useOperator.ts                   # Operator client hook
│   ├── useProject.ts                    # Project metadata & selection
│   ├── useAuth.ts                       # Auth state and user info
│   └── (many more...)
├── stores/                              # Pinia state management
│   ├── auth.ts                          # User authentication state
│   ├── project.ts                       # Current project & projects list
│   ├── settings.ts                      # User preferences & configuration
│   ├── conversations.ts                 # Chat history per project
│   └── (more stores)
├── spaces/                              # Built-in native spaces
│   ├── brainstorm/                      # Brainstorm space (idea generation)
│   ├── architect/                       # Architect space (system design)
│   ├── coder/                           # Coder space (code generation & review)
│   └── project/                         # Project space (project management)
├── space_loader/                        # Dynamic space loading & rendering
│   ├── DynamicSpacePage.vue             # Router target for dynamic spaces
│   ├── SpaceLoader.ts                   # Load manifest, bundle, execute, cache
│   └── spaceTypes.ts                    # LoadedSpace, ManifestV1 types
├── pages/                               # Top-level page components
│   ├── Login.vue                        # Auth entry point
│   ├── Home.vue                         # Project list / recent activity
│   ├── Settings/                        # Settings pages (modular)
│   ├── Spaces.vue                       # All spaces grid
│   └── (more pages)
├── lib/                                 # Utility functions & helpers
│   ├── appPaths.ts                      # Data directory resolution (synced with desktop/src/lib.rs)
│   ├── constructSdk.ts                  # Public SDK exports for space bundles
│   ├── spaceHost.ts                     # window.__CONSTRUCT__ setup
│   ├── spaceContextBus.ts               # Pub/sub for space-host communication
│   ├── bridgeListener.ts                # Operator bridge request handler
│   └── (utilities)
├── types/                               # TypeScript type definitions
│   ├── index.ts                         # Global types
│   └── (more type files)
├── config/                              # Runtime configuration
│   ├── spaceThemes.ts                   # CSS theme variables per space
│   └── (more config)
├── assets/                              # Static assets
│   ├── css/                             # Global CSS (main.css, themes)
│   ├── fonts/                           # Font files
│   └── (images, icons)
└── vite.config.ts                       # Vite configuration (externalize shared deps)
```

## Key Conventions

### Import Paths
- Use `@/` alias for frontend directory imports: `import { useProject } from '@/composables'`
- Components auto-imported from `components/` — no explicit import needed in templates
- Composables auto-imported with `use` prefix — `useProject`, `useOperator`, etc.
- Stores auto-imported from `stores/` — `useAuthStore`, `useProjectStore`, etc.

### Architecture Patterns
- **Keep AI logic in the operator** — Frontend handles rendering only. All complex AI/tool logic lives in the Go operator.
- **Use SDK from npm** — Always import from `@construct-space/sdk` (published package). Never use `file:` paths or relative imports from `../../../sdk`.
- **Data directory alignment** — `desktop/src/lib.rs` and `frontend/lib/appPaths.ts` must stay in sync. Any changes to data paths require updates to both files.
- **State management** — Use Pinia stores for app-wide state (auth, projects, settings). Use component state (`ref`, `computed`) for local UI state.
- **API communication** — All operator communication goes through `useOperator()` composable. Never make raw Tauri IPC calls.

### Code Style
- Prefer composition API (setup script) over Options API
- Use TypeScript strict mode — no `any` types without justification
- Keep components small and focused — extract large logic into composables
- Use semantic HTML — avoid `<div>` wrappers when proper elements exist
- Validate user input before sending to operator — use Zod schemas where appropriate

## Styling

### CSS Variables & Theming
The frontend uses CSS variables for dynamic theming. Core variables:

```css
:root {
  --app-accent: #0066ff;           /* Primary brand color */
  --app-foreground: #1a1a1a;       /* Text color */
  --app-border: #e0e0e0;           /* Border color */
  --app-canvas-bg: #f8f8f8;        /* Canvas/panel background */
  --app-status-bg: #ffffff;        /* Status bar background */
  --app-muted: #808080;            /* Muted text color */
}

:root.dark {
  --app-foreground: #f0f0f0;
  --app-canvas-bg: #1a1a1a;
  --app-border: #404040;
  --app-status-bg: #262626;
}
```

### Tailwind Integration
- Import Tailwind via `@import "@tailwindcss"` in `main.css`
- Use semantic utility classes: `.bg-app`, `.text-app`, `.text-app-muted`, `.border-app`
- **No hardcoded colors** — always use CSS variables or Tailwind utilities
- Responsive classes: `.md:flex`, `.lg:grid`, etc.

### Font Stack
- Primary font: **Rubik** (Google Fonts, loaded in HTML head)
- Fallback: `-apple-system, BlinkMacSystemFont, sans-serif`

### Dark Mode
Dark mode is activated via `.dark` class on the root element. CSS variables automatically adjust in dark mode.

```html
<html class="dark">
```

## Common Patterns

### Fetching Data from Operator
```ts
import { useOperator } from '@/composables'

export default {
  setup() {
    const { dispatch } = useOperator()

    const data = ref(null)
    const loading = ref(true)

    onMounted(async () => {
      const result = await dispatch('get_context', {})
      data.value = result.data
      loading.value = false
    })

    return { data, loading }
  }
}
```

### Using Pinia Store
```ts
import { useProjectStore } from '@/stores'

export default {
  setup() {
    const projectStore = useProjectStore()

    const currentProject = computed(() => projectStore.current)

    return { currentProject }
  }
}
```

### Rendering Assistant Blocks
```ts
import { useAgentSession } from '@/operator'

export default {
  setup() {
    const { turns } = useAgentSession()

    return { turns }
  }
}

// In template:
<div v-for="turn in turns" :key="turn.id">
  <div v-for="block in turn.response.blocks" :key="block.id">
    <ResponseBlock :block="block" />
  </div>
</div>
```

## Performance Considerations

- **Code splitting** — Pages and heavy composables are lazy-loaded via `defineAsyncComponent`
- **Component registration** — Global component auto-import reduces redundancy
- **State caching** — Project and auth state are cached in memory; only refresh on explicit user action
- **Space bundle caching** — Loaded space bundles are cached in memory to avoid re-executing
- **Streaming responses** — Large operator responses (e.g., code generation) stream via `STREAM_CHUNK` events to avoid blocking the UI

## Debugging & Development

### Dev Server
```bash
bun run dev
```
Runs Vite dev server on `:60200` with HMR enabled.

### Browser DevTools
- Open DevTools: `F12` or `Cmd+Option+I` (Mac)
- Vue DevTools extension (if installed) provides component tree, props, and store inspection
- Console shows Tauri IPC bridge events and operator communication

### Common Debug Patterns
```ts
// Log operator events
const { on } = useOperator()
on('DISPATCH', (data) => console.log('Operator event:', data))

// Inspect Pinia store
import { useProjectStore } from '@/stores'
const store = useProjectStore()
console.log(store.$state)

// Check window globals
console.log(window.__CONSTRUCT__)
```
