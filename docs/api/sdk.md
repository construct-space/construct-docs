# SDK & UI Library Reference

The Construct SDK provides composables, stores, and utilities for building spaces. It consists of two packages: `@construct-space/ui` for design system components and `@construct-space/sdk` for runtime APIs.

## @construct-space/ui Package

Shared design system components and utilities for consistent UI across spaces.

### Components

All components are Vue 3 components with TypeScript support and auto-import support.

#### Button

Interactive button component with variants and states.

```vue
<template>
  <Button
    @click="handleClick"
    variant="primary"
    size="md"
    :disabled="isLoading"
  >
    Click Me
  </Button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isLoading = ref(false)

function handleClick() {
  isLoading.value = true
}
</script>
```

**Props:**
- `variant`: "primary" | "secondary" | "danger" | "ghost" (default: "primary")
- `size`: "sm" | "md" | "lg" (default: "md")
- `disabled`: boolean (default: false)
- `loading`: boolean (default: false)

#### Modal

Modal dialog for focused interactions.

```vue
<template>
  <Modal
    v-model:open="isOpen"
    title="Confirm Action"
    @confirm="handleConfirm"
  >
    Are you sure you want to proceed?
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

function handleConfirm() {
  console.log('Confirmed')
  isOpen.value = false
}
</script>
```

**Props:**
- `v-model:open`: boolean - Modal visibility
- `title`: string - Modal title
- `confirmText`: string (default: "Confirm")
- `cancelText`: string (default: "Cancel")

**Events:**
- `confirm`: Emitted when user clicks confirm button
- `cancel`: Emitted when user clicks cancel or closes modal

#### Input

Text input field with validation and error states.

```vue
<template>
  <Input
    v-model="email"
    type="email"
    placeholder="Enter email"
    :error="emailError"
    label="Email Address"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const emailError = ref('')

function validateEmail() {
  if (!email.value.includes('@')) {
    emailError.value = 'Invalid email'
  }
}
</script>
```

**Props:**
- `modelValue` (v-model): string
- `type`: string (default: "text")
- `placeholder`: string
- `label`: string
- `error`: string
- `disabled`: boolean

#### Select

Dropdown select component.

```vue
<template>
  <Select
    v-model="selectedOption"
    :options="agentList"
    label="Select Agent"
    placeholder="Choose..."
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const selectedOption = ref('architect')
const agentList = [
  { value: 'architect', label: 'Code Architect' },
  { value: 'tester', label: 'QA Tester' }
]
</script>
```

**Props:**
- `modelValue` (v-model): string | number
- `options`: Array<{ value, label }>
- `label`: string
- `placeholder`: string
- `disabled`: boolean

#### Card

Container component for grouping related content.

```vue
<template>
  <Card title="Project Info" :padded="true">
    <p>{{ projectDescription }}</p>
  </Card>
</template>

<script setup lang="ts">
const projectDescription = 'A sample project'
</script>
```

**Props:**
- `title`: string
- `padded`: boolean (default: true)
- `clickable`: boolean (default: false)

#### Badge

Small label component for tags and status indicators.

```vue
<template>
  <div class="flex gap-2">
    <Badge color="green">Active</Badge>
    <Badge color="red">Error</Badge>
    <Badge color="blue" variant="outline">Info</Badge>
  </div>
</template>
```

**Props:**
- `color`: "green" | "red" | "blue" | "yellow" (default: "gray")
- `variant`: "solid" | "outline" (default: "solid")

#### Tabs

Tab navigation component.

```vue
<template>
  <Tabs v-model:selected="activeTab" :tabs="tabList">
    <template #content>
      <div v-if="activeTab === 'overview'">Overview content</div>
      <div v-else-if="activeTab === 'details'">Details content</div>
    </template>
  </Tabs>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref('overview')
const tabList = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' }
]
</script>
```

**Props:**
- `selected` (v-model): string
- `tabs`: Array<{ id, label }>

#### Notification

Toast notification display.

```vue
<template>
  <Button @click="showNotification">Show Toast</Button>
  <Notification
    v-if="notification.visible"
    :type="notification.type"
    :message="notification.message"
    @close="notification.visible = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const notification = ref({
  visible: false,
  type: 'success',
  message: 'Operation completed'
})

function showNotification() {
  notification.visible = true
}
</script>
```

**Props:**
- `type`: "success" | "error" | "warning" | "info"
- `message`: string
- `duration`: number (ms to auto-dismiss, 0 = no auto-dismiss)

#### ConfirmationModal

Specialized modal for confirmation dialogs.

```vue
<template>
  <ConfirmationModal
    v-model:open="showConfirm"
    title="Delete Item?"
    message="This action cannot be undone"
    confirmText="Delete"
    confirmColor="danger"
    @confirm="deleteItem"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showConfirm = ref(false)

function deleteItem() {
  // Perform deletion
}
</script>
```

#### SplitPane

Two-panel layout with resizable divider.

```vue
<template>
  <SplitPane :initial-ratio="0.3">
    <template #left>
      <div>Left panel</div>
    </template>
    <template #right>
      <div>Right panel</div>
    </template>
  </SplitPane>
</template>
```

**Props:**
- `initialRatio`: number (0-1, default: 0.5)
- `minLeft`: number (pixels)
- `minRight`: number (pixels)

### Composables

#### useNotification

Display toast notifications with a simple API.

```typescript
import { useNotification } from '@construct-space/ui'

const notify = useNotification()

// Success notification
notify.success('Operation completed')

// Error with custom duration
notify.error('Something went wrong', 5000)

// Warning
notify.warning('Are you sure?')

// Info
notify.info('Here is some information')
```

**API:**

```typescript
interface Notification {
  success(message: string, duration?: number): void
  error(message: string, duration?: number): void
  warning(message: string, duration?: number): void
  info(message: string, duration?: number): void
  dismiss(id: string): void
}
```

## @construct-space/sdk Package

Runtime APIs for interacting with the operator and managing application state.

### Composables

#### useToolbar

Access and manage toolbar items for the current page.

```vue
<script setup lang="ts">
import { useToolbar } from '@construct-space/sdk'

const toolbar = useToolbar()

// Add toolbar item
toolbar.add({
  id: 'export',
  icon: 'download',
  label: 'Export',
  action: 'export_pdf'
})

// Remove item
toolbar.remove('export')

// Update item
toolbar.update('export', {
  label: 'Export as PDF'
})

// Clear all
toolbar.clear()
</script>
```

#### useSpaces

Discover and switch between available spaces.

```vue
<script setup lang="ts">
import { useSpaces } from '@construct-space/sdk'

const spaces = useSpaces()

// Get all spaces
const all = spaces.getAll()

// Get space by ID
const architect = spaces.getById('architect')

// Get current space
const current = spaces.getCurrent()

// Switch space
spaces.switch('tester')

// Get available agents in space
const agents = spaces.getAgents('architect')
</script>
```

#### useAuth

Access authentication information and user context.

```vue
<script setup lang="ts">
import { useAuth } from '@construct-space/sdk'

const auth = useAuth()

// Get current user
const user = auth.getUser()  // { id, email, name, avatar }

// Check if authenticated
if (auth.isAuthenticated) {
  console.log('User is logged in')
}

// Get auth token
const token = auth.getToken()

// Logout
auth.logout()
</script>
```

#### useStorage

Access the persistent state store.

```vue
<script setup lang="ts">
import { useStorage } from '@construct-space/sdk'

const storage = useStorage()

// Set value
storage.set('user.preferences', { theme: 'dark' })

// Get value
const prefs = storage.get('user.preferences')

// Delete value
storage.delete('user.preferences')

// Get all with prefix
const userSettings = storage.getByPrefix('user.')

// Watch for changes
storage.watch('user.preferences', (newVal) => {
  console.log('Preferences changed:', newVal)
})
</script>
```

#### useConstructConfig

Access Construct configuration and environment information.

```vue
<script setup lang="ts">
import { useConstructConfig } from '@construct-space/sdk'

const config = useConstructConfig()

// Get operator URL
const operatorUrl = config.operatorUrl  // "http://localhost:60100"

// Get current space info
const space = config.currentSpace

// Get available models
const models = config.availableModels

// Get feature flags
const features = config.features
</script>
```

#### useAgentSession

Interact with the AI operator and dispatch agent requests.

```vue
<script setup lang="ts">
import { useAgentSession } from '@construct-space/sdk'

const session = useAgentSession()

// Dispatch a request and stream results
const sessionId = await session.dispatch({
  messages: [
    {
      role: 'user',
      content: [{ type: 'text', text: 'Analyze this code' }]
    }
  ],
  agentID: 'architect',
  tools: ['bash', 'read', 'write']
})

// Stream events for this session
session.stream(sessionId, (event) => {
  if (event.content) {
    // Handle new content blocks
  }
  if (event.stopReason === 'end_turn') {
    // Turn complete
  }
})

// Or use query for immediate response
const result = await session.query({
  messages: [...],
  agentID: 'architect'
})
</script>
```

### Stores

#### useProjectStore

Manage project context and metadata.

```typescript
import { useProjectStore } from '@construct-space/sdk'

const project = useProjectStore()

// Get current project
const currentProject = project.current  // { id, name, path, icon }

// Get all projects
const allProjects = project.getAll()

// Switch project
project.switch('my-project')

// Project is reactive
onMounted(() => {
  watch(() => project.current, (newProject) => {
    console.log('Project changed:', newProject.name)
  })
})
```

#### useAuthStore

Manage authentication state.

```typescript
import { useAuthStore } from '@construct-space/sdk'

const auth = useAuthStore()

// Check authentication
if (auth.isAuthenticated) {
  console.log('User:', auth.user)
}

// Get auth state
const { user, token, isLoading } = auth

// Login/logout handled by auth composable
```

#### usePinnedStore

Manage pinned items (spaces, agents).

```typescript
import { usePinnedStore } from '@construct-space/sdk'

const pinned = usePinnedStore()

// Get pinned items
const pinnedSpaces = pinned.getByType('space')

// Add to pinned
pinned.add({
  id: 'space.architect',
  type: 'space',
  name: 'Code Architect'
})

// Remove from pinned
pinned.remove('space.architect')

// Reorder
pinned.reorder('space.architect', 0)  // Move to top
```

### Types

Common TypeScript types exported from SDK:

```typescript
interface SpaceInfo {
  id: string
  name: string
  icon?: string
  path: string
  category?: string
}

interface ToolbarItem {
  id: string
  icon: string
  label?: string
  action?: string
  tool?: string
  group?: string
}

interface Turn {
  request: Request
  response: Response
  toolCalls: ToolExecution[]
}

interface RequestBlock {
  type: 'text' | 'image' | 'file'
  text?: string
  url?: string
  path?: string
  mimeType?: string
}

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}
```

## Runtime Injection

The Construct runtime injects APIs via `window.__CONSTRUCT__`:

```typescript
// Access runtime APIs
const runtime = window.__CONSTRUCT__

// Dispatch to operator
const result = await runtime.dispatch({
  messages: [...],
  agentID: 'architect'
})

// Access state store
const value = await runtime.storage.get('key')

// Get configuration
const operatorUrl = runtime.config.operatorUrl
```

This injection happens automatically during space initialization. All spaces have access to the runtime.

## Import Patterns

### Auto-imports (Recommended)

With auto-import configured, use components and composables directly without imports:

```vue
<template>
  <Button @click="handleClick">Click Me</Button>
</template>

<script setup lang="ts">
// Composables auto-imported
const toolbar = useToolbar()
const storage = useStorage()
</script>
```

Configure auto-imports in `vite.config.ts`:

```typescript
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

export default {
  plugins: [
    AutoImport({
      imports: ['vue'],
      dirs: ['src/composables'],
      vueTemplate: true
    }),
    Components({
      dirs: ['src/components'],
      dts: 'src/components.d.ts'
    })
  ]
}
```

### Explicit Imports

Import specific APIs as needed:

```typescript
import { Button, Card, Modal } from '@construct-space/ui'
import { useToolbar, useStorage, useAuth } from '@construct-space/sdk'
```

## Best Practices

1. **Use composables**: Prefer composables over direct store access
2. **Type everything**: Always provide TypeScript types for data
3. **Handle loading states**: Show loading indicators during async operations
4. **Error boundaries**: Wrap agent calls in try-catch blocks
5. **Cache results**: Use storage to cache API responses
6. **Stream efficiently**: Process stream events as they arrive, don't buffer
7. **Manage subscriptions**: Unsubscribe from watches and streams
8. **Validate inputs**: Verify tool inputs before dispatching to agent
9. **Use computed**: Derive state with computed() for reactivity
10. **Test components**: Test UI components in isolation

## Example: Complete Space Page

```vue
<template>
  <div class="space-page">
    <Card title="Project Analysis">
      <Input
        v-model="projectPath"
        placeholder="Enter project path"
        @keyup.enter="analyze"
      />

      <Button
        v-if="!isLoading"
        @click="analyze"
        variant="primary"
        class="mt-4"
      >
        Analyze with Architect
      </Button>

      <div v-if="isLoading" class="mt-4">
        <p>Analyzing...</p>
      </div>

      <div v-if="result" class="mt-4 whitespace-pre-wrap">
        {{ result }}
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAgentSession } from '@construct-space/sdk'
import { useNotification } from '@construct-space/ui'

const projectPath = ref('')
const isLoading = ref(false)
const result = ref('')

const session = useAgentSession()
const notify = useNotification()

async function analyze() {
  if (!projectPath.value) {
    notify.warning('Please enter a project path')
    return
  }

  isLoading.value = true

  try {
    const response = await session.query({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze the project at ${projectPath.value}`
            }
          ]
        }
      ],
      agentID: 'architect'
    })

    result.value = response.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')

    notify.success('Analysis complete')
  } catch (error) {
    notify.error('Analysis failed')
    console.error(error)
  } finally {
    isLoading.value = false
  }
}
</script>
```

See [Operator Protocol Reference](./operator-protocol.md) for details on the dispatch protocol.
