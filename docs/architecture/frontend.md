# Frontend Architecture

The Construct frontend is a modern Vue 3 + TypeScript single-page application built with Vite and styled with Tailwind CSS. It provides the user interface for interacting with the AI-powered development environment.

## Technology Stack

- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript 5.9
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS 4.2
- **UI Components**: 29 custom components + Headless UI integrations
- **Router**: Vue Router with hash-based routing and auth guards
- **State Management**: Pinia with 7+ stores
- **Storage**: Dexie (IndexedDB) for conversations, idb-keyval for KV storage
- **Utilities**: DOMPurify (XSS protection), Fuse.js (fuzzy search)

## Project Structure

```
frontend/
├── main.ts                 # Entry point
├── App.vue                 # Root component
├── router/                 # Vue Router configuration
├── stores/                 # Pinia stores
├── components/
│   ├── agent/             # Agent view components
│   ├── ai/                # AI/assistant components
│   ├── common/            # Shared UI components
│   ├── spaces/            # Space-specific components
│   └── ui/                # Reusable UI components
├── composables/           # Vue composables (50+)
├── spaces/                # Built-in space definitions
├── utils/                 # Utility functions
├── types/                 # TypeScript type definitions
└── styles/                # Global styles
```

## Entry Point: main.ts

The main entry point handles initialization and setup:

```typescript
// Authentication initialization
await initAuth()

// Operator connection setup
const operatorClient = useOperator()
await operatorClient.connect()

// Space host initialization
const spaceHost = new SpaceHost()
spaceHost.registerBuiltInSpaces()

// Mount Vue app with router and Pinia
const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')
```

**Key Responsibilities**:
- Initialize authentication with stored credentials
- Establish TCP connection to operator on :60100
- Register built-in and custom spaces
- Mount Vue application with all plugins

## Router Configuration

Hash-based routing with automatic auth guards:

- **Base**: Hash-based URLs (`/#/spaces/architect`, `/#/settings`, etc.)
- **Routes**: Lazy-loaded via dynamic imports
- **Auth Guards**: Redirect unauthenticated users to login
- **Redirects**: Handle invalid routes with sensible fallbacks

**Key Routes**:
- `/`: Redirect to default space
- `/login`: Authentication page
- `/spaces/:spaceId`: Individual space pages
- `/settings`: User settings and preferences
- `/conversations`: Conversation history
- `/skills`: Skill manager

## Operator Client: client.ts

The `useOperator()` composable provides the TCP client for communicating with the Go sidecar:

```typescript
const operator = useOperator()

// Connect to operator
await operator.connect('localhost:60100')

// Send a request and stream responses
const stream = await operator.dispatchStream({
  agentID: 'architect',
  sessionID: 'session-123',
  content: 'Deploy the application',
})

for await (const event of stream) {
  // Process streaming events
  if (event.type === 'response-block') {
    // Render response block
  }
  if (event.type === 'tool-call') {
    // Show tool execution
  }
}
```

**Core Methods**:
- `connect(addr)`: Establish TCP connection
- `send(message)`: Send a single message
- `dispatch(request)`: Single request/response
- `dispatchStream(request)`: Streaming request
- `close()`: Close connection

**Message Format**: Newline-delimited JSON following the protocol specification

## useAgentSession Composable

The `useAgentSession()` composable manages agent session state and turn-based interactions:

```typescript
const session = useAgentSession(agentID)

// Add a turn to the conversation
await session.dispatch({
  content: 'Review this code',
  files: ['src/main.ts'],
})

// Access session state
const turns = session.turns
const currentTurn = session.currentTurn
const isLoading = session.isLoading
const usage = session.usage
```

**Features**:
- **Block Management**: Turn = Request + Response pair
- **Streaming**: Real-time event processing
- **State Tracking**: Usage, status, and metadata
- **History**: Persistent turn history with Dexie
- **Error Handling**: Graceful error recovery

**Block Model**:
```typescript
interface Turn {
  id: string
  request: RequestBlock
  response: ResponseBlock
  toolCalls: ToolCall[]
  usage: TokenUsage
  timestamp: number
}

interface RequestBlock {
  content: string
  files?: string[]
  metadata?: Record<string, any>
}

interface ResponseBlock {
  content: string
  toolCards: ToolCard[]
  finalResponse: string
}
```

## Component Architecture

### Agent Components (components/agent/)

**AgentView**: Main component for displaying agent interactions
- Renders turns with request and response blocks
- Handles scrolling and focus management
- Provides turn history navigation

**AgentInput**: User input interface
- Text input with markdown support
- File attachment support
- Command palette integration
- Auto-complete for context awareness

**RequestBubble**: Displays user request
- Message content rendering
- File reference display
- Metadata visualization

**ResponseBlocks**: Renders AI response
- Markdown rendering with syntax highlighting
- Streaming text animation
- Tool call visualization
- Token usage display

**ToolCard**: Individual tool execution display
- Tool name and input parameters
- Real-time execution status
- Output rendering
- Error display with recovery options

### AI Components (components/ai/)

**AssistantPanel**: Main AI assistant interface
- Message input and history
- Model and provider selection
- Settings and configuration
- Integration with agent view

**ModelSelector**: LLM model selection
- Provider dropdown
- Model list
- Token limit display
- Cost estimation

### Common Components (components/common/)

**Sidebar3D**: 3D-transformed navigation sidebar
- Space list with icons
- Active space highlighting
- Drag-to-reorder support
- 3D transform for visual depth

**Toolbar3D**: Breadcrumb and action toolbar
- Current space breadcrumb
- Action buttons (new, save, etc.)
- Search integration
- Settings quick access

**Shell**: Main layout container
- Sidebar and toolbar integration
- Space content area
- Assistant panel docking
- Responsive design handling

### UI Components (components/ui/, 29 total)

Reusable Headless UI-based components:
- Buttons, inputs, dropdowns
- Modals, dialogs, popovers
- Cards, badges, tags
- Tables, lists, pagination
- Tabs, accordions, menus
- Loaders, skeletons, toasts

## Spaces System

Spaces are pluggable UI pages loaded dynamically:

### Space Definition

```typescript
interface SpaceDefinition {
  id: string
  name: string
  icon: string
  description: string
  component: () => Promise<DefineComponent>
  metadata?: SpaceMetadata
}
```

### Built-in Spaces (frontend/spaces/)

Located in dedicated space directories:
- **Architect**: AI-powered code review and design
- **Chat**: General conversation interface
- **Terminal**: Shell integration
- **Notebook**: Code execution environment
- **Project**: Project management

### Space Host (spaceHost.ts)

Manages space discovery, registration, and mounting:

```typescript
const spaceHost = new SpaceHost()

// Register built-in spaces
spaceHost.registerBuiltInSpaces()

// Register custom space
spaceHost.register({
  id: 'custom',
  name: 'Custom Space',
  component: () => import('./CustomSpace.vue'),
})

// Load space
const space = await spaceHost.load('architect')
```

## Pinia Stores

State management with Pinia (7+ stores):

### Auth Store
- Current user information
- Authentication status
- Token management
- Login/logout actions

### Project Store
- Active project metadata
- Project settings
- File tree state
- Recent projects

### Settings Store
- User preferences
- UI configuration
- Editor settings
- Keybindings

### Conversations Store
- Conversation history
- Active conversation
- Conversation metadata
- Search and filtering

### Preferences Store
- Visual preferences (theme, font size)
- Workspace layout
- Window state
- Accessibility options

### Panels Store
- Open panel state
- Panel sizes
- Panel ordering
- Dock positions

### Pinned Store
- Pinned items (tools, skills)
- Quick access items
- Custom shortcuts
- Favorites list

## Composables

50+ composables providing reusable logic:

### Core Composables
- `useOperator()`: Operator TCP client
- `useAgentSession()`: Agent session management
- `useAuth()`: Authentication and session
- `useRouter()`: Navigation and route utilities

### AI Composables
- `useAIModel()`: Model selection and management
- `useStreamStatus()`: Stream event handling
- `useToolExecution()`: Tool call processing
- `useTokenUsage()`: Token counting and display

### UI Composables
- `useDarkMode()`: Theme management
- `useViewport()`: Responsive breakpoints
- `useClipboard()`: Clipboard operations
- `useDebounce()`: Debouncing utilities
- `useThrottle()`: Throttling utilities

### Storage Composables
- `useIndexedDB()`: Dexie database access
- `useLocalStorage()`: Browser storage
- `useSessionStorage()`: Session storage

## Key Conventions

### @/ Alias

All imports use the `@/` alias for absolute imports:

```typescript
import { useOperator } from '@/composables/useOperator'
import { AgentView } from '@/components/agent/AgentView'
```

### Auto-Imports

TypeScript auto-imports enabled for:
- Vue composition functions (ref, computed, watch, etc.)
- Common utilities and helpers
- Type definitions

### AI Logic Placement

**Keep in Operator**:
- LLM prompts and logic
- Tool execution
- Session management
- State persistence

**Keep in Frontend**:
- UI rendering
- User interactions
- Visual state
- Layout and styling

## Security

### XSS Protection

DOMPurify sanitizes all dynamic content:

```typescript
import DOMPurify from 'dompurify'

const cleanHTML = DOMPurify.sanitize(userContent)
```

**Applied to**:
- Markdown rendering
- Tool output display
- User-provided content

### Authentication

- Tokens stored in system keychain (via desktop layer)
- Token refresh automatic
- Session validation on route changes
- CSRF protection via Tauri

## Storage

### IndexedDB (Dexie)

Persistent storage for:
- Conversation history
- Session state
- Cached responses
- Large binary data

```typescript
import { db } from '@/db'

const conversation = await db.conversations.get(id)
```

### LocalStorage (idb-keyval)

Key-value storage for:
- User preferences
- UI state (sidebar collapse, etc.)
- Temporary data
- Quick-access items

```typescript
import { get, set } from 'idb-keyval'

await set('theme', 'dark')
const theme = await get('theme')
```

## Search and Filtering

Fuse.js provides fast fuzzy search:

```typescript
import Fuse from 'fuse.js'

const fuse = new Fuse(items, {
  keys: ['name', 'description'],
  threshold: 0.3,
})

const results = fuse.search('query')
```

**Used for**:
- Tool search
- Skill search
- File search
- Command palette

## Build Configuration

### Vite Configuration

```typescript
export default defineConfig({
  plugins: [vue(), typescript()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:60100',
    },
  },
})
```

### TypeScript Configuration

- Strict mode enabled
- DOM lib included
- ES2020+ target
- Path aliases configured

## Performance Optimization

### Code Splitting

Routes and large components are lazy-loaded:

```typescript
const ArchitectSpace = defineAsyncComponent(() =>
  import('@/spaces/architect/ArchitectSpace.vue')
)
```

### Memoization

Computed properties automatically memoize values:

```typescript
const filteredTools = computed(() => {
  return tools.value.filter(t => t.enabled)
})
```

### Virtual Scrolling

For long lists (conversations, tool history):

```vue
<VirtualScroller
  :items="conversations"
  :item-height="64"
  class="h-full"
>
  <template #default="{ item }">
    <ConversationItem :conversation="item" />
  </template>
</VirtualScroller>
```

## Development Workflow

### Development Server

```bash
npm run dev
```

Starts Vite dev server on port 5173 with HMR

### Build

```bash
npm run build
```

Optimized production build with code splitting

### Type Checking

```bash
npm run type-check
```

Full TypeScript validation

### Linting

```bash
npm run lint
```

ESLint with Vue 3 and TypeScript rules
