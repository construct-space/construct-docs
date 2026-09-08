# Space Context Bus & Bridge

The frontend provides two mechanisms for communication between spaces and the host shell: the Space Context Bus (frontend pub/sub) and the Bridge Listener (operator ↔ frontend).

## Space Context Bus (`lib/spaceContextBus.ts`)

A lightweight pub/sub system for space-to-host and cross-space communication. Designed to work without importing domain stores — keeping spaces loosely coupled.

### Publish / Subscribe

```ts
import { publishSpaceContext, subscribeSpaceContext, getLatestSpaceContext } from '@/lib/spaceContextBus'

// Space publishes its state
publishSpaceContext({
  spaceId: 'coder',
  type: 'progress',
  summary: { completedGoals: 3, totalGoals: 5 },
  timestamp: Date.now()
})

// Host or other space subscribes
const unsubscribe = subscribeSpaceContext('progress', (payload) => {
  console.log(payload.spaceId, payload.summary)
})

// Get cached latest
const latest = getLatestSpaceContext('progress')
```

### Request / Response

For direct data requests between spaces:

```ts
import { registerContextHandler, requestSpaceData } from '@/lib/spaceContextBus'

// Space registers a handler
registerContextHandler('coder', async ({ type, params }) => {
  if (type === 'file-content') return readFile(params.path)
})

// Another space requests data
const content = await requestSpaceData('coder', {
  type: 'file-content',
  params: { path: 'src/main.ts' }
})
```

### Automation Providers

Spaces can register automation capabilities that the operator bridge can invoke:

```ts
import { registerAutomationProvider, getAutomationProvider, listAutomationProviders } from '@/lib/spaceContextBus'

// Space registers its automation provider
registerAutomationProvider('project', {
  snapshot: async () => ({ projects: [...], activeProject: '...' }),
  listActions: async () => ['create-project', 'deploy', 'run-tests'],
  runAction: async (action, payload) => { /* execute */ }
})

// Bridge listener uses these
const provider = getAutomationProvider('project')
await provider.runAction('deploy', { projectId: '...' })
```

### Active Space Tracking

```ts
import { setActiveSpace, getActiveSpace } from '@/lib/spaceContextBus'

// Router sets active space on navigation
setActiveSpace('coder')

// Components query active space
const activeId = getActiveSpace()  // 'coder' | null
```

## Bridge Listener (`lib/bridgeListener.ts`)

Handles requests from the Go operator via Tauri IPC. The operator can request space state through the bridge.

### How It Works

1. `startBridgeListener()` is called during app boot
2. Listens for `bridge:request` events from Tauri
3. Routes requests to the appropriate handler
4. Responds via `invoke('bridge_respond', { id, result })`

### Supported Bridge Methods

| Method | Description |
|--------|-------------|
| `space.snapshot` | Get automation provider's current state snapshot |
| `space.list_actions` | List available automation actions for a space |
| `space.run_action` | Execute a space automation action |
| `space.context_request` | Request arbitrary data from a space |

### Request Flow

```
Go Operator → Tauri bridge:request event → bridgeListener
  → routes to registered automation provider
  → executes action
  → bridge_respond → Tauri IPC → Go Operator
```

This enables the Go operator to query frontend state (e.g., "what project is open?", "what files are visible?") and trigger actions (e.g., "run the deploy action") without direct TCP access to the frontend.

## When to Use What

| Scenario | Mechanism |
|----------|-----------|
| Space publishes state to host | Context Bus — `publishSpaceContext()` |
| Host subscribes to space updates | Context Bus — `subscribeSpaceContext()` |
| Space-to-space data request | Context Bus — `requestSpaceData()` |
| Operator queries frontend state | Bridge Listener — `space.snapshot` |
| Operator triggers frontend action | Bridge Listener — `space.run_action` |
| Cross-space navigation | Router — `useRouter().push()` |
