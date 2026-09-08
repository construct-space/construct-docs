# Assistant & Block System

The assistant system renders AI agent responses as structured blocks rather than flat text. This enables rich rendering of tool calls, code execution, tables, plans, and custom space-provided blocks.

## Block Types

### Request Blocks (User Input)

| Type | Description |
|------|-------------|
| `text` | Text message |
| `image` | Attached image (drag-drop or paste) |
| `file` | Attached file |

### Response Blocks (Agent Output)

| Type | Description |
|------|-------------|
| `text` | Markdown text content |
| `tool` | Tool call visualization (name, input, result, running/done/error state) |
| `code` | Code block with syntax highlighting |
| `svg` | SVG visualization |
| `image` | Generated or returned image |
| `error` | Error message |
| `status` | Status update (thinking, processing) |
| `question` | Extracted question (used by architect flow) |
| `plan` | Plan or spec output |
| `tasklist` | Task list with checkable items |
| `progress` | Progress indicator |
| `table` | Tabular data (headers + rows) |
| `json` | JSON data display |
| `action` | Actionable suggestion |
| `link` | External link |
| `diff` | Code diff |
| `custom` | Space-provided custom renderer |

## Turn Model

A Turn represents one complete request/response cycle:

```ts
interface Turn {
  id: string
  request: RequestBlock[]      // What the user sent
  response: ResponseBlock[]    // What the agent returned (built up during streaming)
  agentId: string
  status: 'pending' | 'streaming' | 'done' | 'error'
  timestamp: number
  turns?: number               // Multi-turn count from operator
}
```

## useAgentSession Composable

**File**: `operator/useAgentSession.ts` (529 lines)

The primary composable for block-based agent interactions:

```ts
const session = useAgentSession()

// State
session.turns              // Ref<Turn[]> — all conversation turns
session.isLoading          // Ref<boolean>
session.selectedAgent      // Ref<string> — 'general', 'brainstorm', etc.

// Actions
session.send(blocks)       // Send RequestBlock[] → streams response into new Turn
session.stop()             // Cancel active stream
session.clear()            // Reset conversation

// Persistence
session.saveSession()      // Save current session
session.loadSession(id)    // Restore a session
session.listSessions()     // List saved sessions
```

### How Streaming Builds Blocks

1. User calls `send([{ type: 'text', content: 'Build a login page' }])`
2. A new Turn is created with `status: 'streaming'` and empty response
3. `useOperator().dispatchStream()` starts the stream
4. As events arrive, blocks are added/updated:
   - **`text` event** → append text to current TextBlock (or create new one)
   - **`tool.call` event** → push new ToolBlock with `state: 'running'`
   - **`tool.result` event** → find matching ToolBlock by `call_id`, update with result and `state: 'done'`
   - **`status` event** → update stream status display
   - **`done` event** → if assistant type specified, normalize the final envelope
5. Turn `status` set to `'done'`

### Per-Type Normalization

If an `assistantType` is specified (e.g., `'architect'`), the final content is passed through a custom normalizer that converts the raw output into the appropriate block types for that assistant.

## Assistant Envelope

**File**: `assistant/schema.ts`

The operator can return structured output in the `assistant.v1` envelope format (validated with Zod):

```ts
{
  version: 'assistant.v1',
  state: 'ok' | 'refusal' | 'incomplete' | 'error',
  provider: 'anthropic',
  content: {
    title?: 'Project Plan',
    summary?: 'A brief summary...',
    blocks: [
      { type: 'markdown', text: '## Architecture\n...' },
      { type: 'steps', items: [{ title: 'Step 1', body: '...', status: 'done' }] },
      { type: 'kv', items: [{ label: 'Framework', value: 'Vue 3' }] },
      { type: 'list', items: ['Item 1', 'Item 2'], ordered: false }
    ],
    data?: { customKey: 'customValue' }
  }
}
```

## Normalization Pipeline

**File**: `assistant/normalize.ts`

Converts raw operator output into renderable `ResponseBlock[]`:

1. Try to parse as `assistant.v1` envelope
2. If valid envelope:
   - `title` → TextBlock with `# Title`
   - `summary` → TextBlock
   - `markdown` block → TextBlock
   - `list` block → TextBlock (formatted as markdown list)
   - `steps` block → TaskListBlock
   - `kv` block → TableBlock
   - `data` → JsonBlock
3. If not an envelope: treat as raw text → single TextBlock
4. Per-type normalizers can override the entire pipeline (e.g., architect custom normalizer)

## Assistant Type Registry

**File**: `assistant/registry.ts`

Each assistant type defines its rendering behavior:

```ts
interface AssistantTypeConfig {
  id: string                    // 'general', 'brainstorm', 'architect', 'coder'
  label: string                 // Display name
  entryAgent: string            // Agent ID to dispatch to
  renderMode: 'blocks' | 'timeline' | 'custom'
  finalSchema?: string          // 'assistant.v1', 'architect.v1'
  sessionScope: 'global' | 'assistant' | 'project'
  supportsAttachments: boolean
  requiresProjectPath: boolean
  source: 'builtin' | string   // 'builtin' or 'space:{spaceId}'
  normalizer?: (raw: unknown) => ResponseBlock[]  // Custom normalization
}
```

### Builtin Types

| Type | Entry Agent | Session Scope | Notes |
|------|-------------|---------------|-------|
| `general` | general | global | Default chat, always available |
| `brainstorm` | brainstorm | assistant | Idea exploration |
| `architect` | architect | project | Custom normalizer for Q&A blocks |
| `coder` | coder | project | Highest iteration limit (50) |

### Space-Defined Types

Spaces can register custom assistant types via their manifest:

```json
{
  "assistant": {
    "id": "myspace",
    "entryAgent": "specialist",
    "renderMode": "blocks",
    "sessionScope": "project",
    "supportsAttachments": true
  }
}
```

Space types are loaded via `loadSpaceAssistantTypes()` and unloaded on space removal via `unregisterAssistantTypesBySource('space:{id}')`.

## Component Hierarchy

```
AssistantPanel.vue
  ├── Header (agent selector dropdown)
  ├── AgentView.vue
  │     ├── RequestBubble.vue (per turn — user message)
  │     └── ResponseBlocks.vue (per turn — agent response)
  │           ├── TextBlock renderer (markdown)
  │           ├── ToolCard.vue (collapsible tool call)
  │           │     ├── State indicator (spinner/check/error)
  │           │     ├── Tool name + input params
  │           │     └── Expandable result panel
  │           ├── CodeBlock renderer (syntax highlighted)
  │           ├── TableBlock renderer
  │           ├── TaskListBlock renderer
  │           └── ... other block type renderers
  └── AgentInput.vue
        ├── Text input (glassmorphism)
        ├── Attachment zone (drag-drop)
        ├── Mic button (speech recognition)
        └── Send button
```

## Runtime Resolution

**File**: `assistant/runtime.ts`

Maps UI surfaces to assistant types:

```ts
resolveAssistantType({ surface: 'assistant-panel' })  // → 'general'
resolveAssistantType({ surface: 'architect-page' })   // → 'architect'
resolveAssistantType({ surface: 'coder-page' })       // → 'coder'
```
