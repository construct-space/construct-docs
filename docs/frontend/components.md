# Components

The frontend's Vue components live in `frontend/components/` and are auto-imported — no explicit import needed.

## Component Organization

```
components/
├── agent/              # AI agent turn rendering
│   ├── AgentView.vue   # Main: renders Turn[] as request bubbles + response blocks
│   ├── AgentInput.vue  # Dock input: text + image/file drag-drop + mic recording
│   ├── ToolCard.vue    # Collapsible tool call card (running/done/error states)
│   ├── ResponseBlocks.vue  # Renders ResponseBlock[] by type
│   ├── RequestBubble.vue   # User message bubble
│   └── ... other block renderers
├── ai/
│   └── AssistantPanel.vue  # Main AI chat panel (header + AgentView + AgentInput)
├── common/
│   ├── Sidebar3D.vue       # Dock sidebar: home, pinned, spaces, settings
│   ├── Toolbar3D.vue       # Rotating toolbar: breadcrumb + space actions
│   └── ConfirmationModal.vue
├── panels/
│   ├── SplitPane.vue       # Resizable split panels
│   ├── BottomPanel.vue     # Output/debug panel
│   └── files/FileExplorer.vue
├── toolbar/
│   ├── Search.vue
│   └── Breadcrumb.vue
├── media/
│   ├── MediaPickerModal.vue
│   └── MediaUploadModal.vue
└── oracle/
    └── OraclePanel.vue     # Context-aware AI sidebar
```

## Key Components

### AgentView
Renders an array of `Turn[]` — the core AI conversation display. Each turn shows:
- **RequestBubble** — the user's input (text, images, files)
- **ResponseBlocks** — the agent's response rendered by block type
- Auto-scrolls during streaming
- Shows stream status (thinking, tool running, etc.)

### AgentInput
The input dock at the bottom of the assistant panel:
- Text input with glassmorphism styling
- Drag-and-drop for images and files → creates attachment blocks
- Speech recognition (mic button)
- Send button dispatches `RequestBlock[]`

### ToolCard
Visualizes a single tool call:
- State indicator: spinning (running), check (done), X (error)
- Collapsible panel showing tool name, input parameters, and result
- Expandable with input/output inspection

### AssistantPanel
The main AI chat wrapper:
- Header with agent selector
- AgentView for conversation
- AgentInput for user input
- Toggleable with Double-Shift shortcut

### Sidebar3D
72px-wide dock sidebar using CSS 3D transforms:
- **Front face**: Home icon, pinned items, divider, all space icons, settings
- **Right face** (-90°): Space sub-pages (when a space is active)
- Rotates between faces with `rotateY` transform
- Click space → route to `/:spaceName`

### Toolbar3D
Breadcrumb + action bar using CSS 3D transforms:
- **Front face**: Current page breadcrumb
- **Bottom face**: Next page during transition
- Rotates with `rotateX` transform
- Space-specific toolbar items injected from space manifest

## Component Conventions
- Use `<script setup lang="ts">` (Composition API)
- Props defined with `defineProps<T>()`
- Emit events with `defineEmits<T>()`
- Use composables for shared logic (not mixins)
- UI primitives from `@construct-space/ui` (auto-imported)
