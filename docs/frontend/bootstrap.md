# App Bootstrap & Lifecycle

## Boot Sequence

The frontend bootstrap process is carefully orchestrated to ensure the UI is functional, responsive, and secure. The boot sequence in `main.ts` follows a strict order:

### 1. Space Host Initialization (First)

```ts
// main.ts - line 1
import { initSpaceHost } from '@/lib/spaceHost'

initSpaceHost()
```

`initSpaceHost()` runs **before** anything else. It exposes shared libraries via `window.__CONSTRUCT__` globals. This is critical: space IIFE bundles (loaded at runtime) reference these shared dependencies instead of bundling their own copies.

**Shared packages exposed:**
- `vue` — Vue 3 core
- `vue-router` — Vue Router
- `pinia` — Pinia store
- `@tauri-apps/api` — Tauri IPC, window, filesystem, etc.
- `@construct-space/ui` — 60+ reusable UI components
- `@construct-space/sdk` — Public SDK for space development
- Additional 15+ utility packages (lodash, zod, etc.)

This setup allows a space bundle to do:
```ts
const { ref, computed } = window.__CONSTRUCT__['vue']
const { useRouter } = window.__CONSTRUCT__['vue-router']
```

Without duplicating code, achieving smaller bundle sizes and faster loading times.

### 2. Create Vue App

```ts
const app = createApp(App)
  .use(pinia)
  .use(router)
```

Create the Vue application instance with:
- **Pinia plugin** — state management
- **Vue Router plugin** — client-side routing (hash-based)

No mounting yet. This is a setup phase.

### 3. Global Component Registration

```ts
app.component('Icon', Icon)
app.component('Notification', Notification)
```

Register globally-used components so they don't need explicit imports in every template. These are lightweight, frequently-used UI primitives.

### 4. Authentication Initialization (Auth Guard)

```ts
const authStore = useAuthStore()
await authStore.hydrateAuthState()
```

The auth store runs `hydrateAuthState()` before mount. This:
- Reads `auth.json` from the data directory (resolved via `appPaths.ts`)
- Loads persisted access/refresh tokens
- Validates token expiry and refreshes if needed
- Sets `authStore.isAuthenticated` and `authStore.currentUser`

**Critical:** The UI does not render until this completes. If hydration fails or tokens are invalid, the user is redirected to `/login`.

Splash screen or loading animation should be shown while this runs.

### 5. App Mount to DOM

```ts
app.mount('#app')
```

The app mounts to the HTML element `<div id="app">`. At this point:
- Vue is active and reactive
- Router is ready to resolve the current route
- Auth state is fully hydrated

The **DefaultLayout** renders:
- **Sidebar3D** — Persistent left navigation
- **Toolbar3D** — Top bar with breadcrumb and actions
- **AssistantPanel** — Right sidebar (AI assistant)
- **RouterView** — Current page content

### 6. Project Store Initialization (Async, Non-Blocking)

```ts
const projectStore = useProjectStore()
projectStore.initialize()
```

After mount, the project store asynchronously loads:
- List of user's projects (from cache or operator)
- Current project metadata
- Project settings

This runs **non-blocking**. If project data hasn't loaded yet, the UI remains functional with graceful fallbacks (e.g., "Recent Projects" shows a skeleton loader).

### 7. Start Bridge Listener

```ts
startBridgeListener()
```

Begins listening for IPC events from the Go operator. The operator sends:
- `DISPATCH_RESULT` — Response to operator commands
- `STREAM_CHUNK` — Streaming events (e.g., AI response tokens)
- Bridge request callbacks (operator calling frontend functions)

The listener sets up event handlers and enables bidirectional communication.

### 8. Render Complete

The frontend is now fully functional:
- Auth is validated
- Projects are loading
- Routes are responsive
- Operator communication is active
- UI is interactive

## Router & Auth Guard

### Hash-Based Routing

Routes use the hash strategy (`createWebHashHistory()`), which is ideal for desktop apps and single-page apps:
- URL: `file:///path/to/app.html#/app/projects/123`
- No server-side routing required
- URLs are shareable
- Compatible with Tauri's file:// protocol

### Auth Guard Logic

The auth guard runs on every route navigation and implements these rules:

```ts
// router/guards.ts

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Rule 1: Guest-only routes
  if (['login', 'register', 'oauth-callback'].includes(to.name)) {
    if (authStore.isAuthenticated) {
      return next({ name: 'home' })  // Authenticated users skip login
    }
    return next()
  }

  // Rule 2: Auth-required routes
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      return next({ name: 'login' })  // Redirect to login
    }
  }

  // Rule 3: Onboarding check
  if (to.path.startsWith('/app') && to.name !== 'onboarding') {
    const hasSeenOnboarding = localStorage.getItem('onboarding-complete')
    if (!hasSeenOnboarding) {
      return next({ name: 'onboarding' })
    }
  }

  // Rule 4: Popout detection
  if (to.path === '/assistant') {
    const windowLabel = await window.__TAURI__.window.getCurrent().label
    if (!windowLabel.includes('assistant-popout')) {
      return next({ name: 'home' })  // Only allow in popout window
    }
  }

  next()
})
```

### Route Structure

```
/
├── /login                          (guest-only, no layout)
├── /register                       (guest-only, no layout)
├── /oauth/callback                 (guest-only, OAuth redirect)
│
├── /app                            (auth-required, DefaultLayout)
│   ├── /                           (HomePage — recent projects)
│   ├── /spaces                     (SpacesPage — all spaces grid)
│   ├── /marketplace                (Marketplace)
│   ├── /settings                   (ModularSettings, lazy-loaded pages)
│   │   ├── /settings/profile       (Profile settings)
│   │   ├── /settings/appearance    (Theme, font, dark mode)
│   │   ├── /settings/llms          (LLM configuration)
│   │   ├── /settings/mcp           (MCP server management)
│   │   ├── /settings/skills        (Skills library)
│   │   └── /settings/...           (more modular pages)
│   │
│   ├── /projects                   (ProjectListPage)
│   ├── /projects/:projectId        (ProjectLayout)
│   │   ├── /                       (Project overview)
│   │   ├── /architect              (Native architect space)
│   │   ├── /coder                  (Native coder space)
│   │   └── /:spaceName/:subPage    (DynamicSpacePage for custom spaces)
│   │
│   ├── /brainstorm                 (Native brainstorm space, company-scoped)
│   ├── /architect                  (Native architect space, company-scoped)
│   ├── /coder                      (Native coder space, company-scoped)
│   └── /:spaceName/:subPage        (DynamicSpacePage for company-scoped spaces)
│
├── /onboarding                     (FirstTimeSetup, space picker)
├── /assistant                      (AssistantPopout, only in popout window)
└── /preview/:spaceName             (SpacePreviewPage, for space builders)
```

## Layouts

### DefaultLayout

The main application frame. Renders:

```vue
<template>
  <div class="layout-default">
    <!-- Left sidebar navigation -->
    <Sidebar3D />

    <div class="layout-main">
      <!-- Top toolbar -->
      <Toolbar3D />

      <!-- Main content area -->
      <div class="layout-content">
        <RouterView />
      </div>
    </div>

    <!-- Right assistant panel -->
    <AssistantPanel v-show="showAssistant" @close="showAssistant = false" />
  </div>
</template>

<script setup lang="ts">
const showAssistant = ref(false)

// Double-Shift toggles assistant
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.shiftKey && e.shiftKey && /* previous shift in last 200ms */) {
    showAssistant.value = !showAssistant.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})
</script>
```

**Key features:**
- Sidebar and toolbar are persistent across route changes
- AssistantPanel is toggled via Double-Shift
- `<RouterView>` renders the current page
- ResponsiveLayout adjusts for mobile/tablet
- Sidebar shows projects, spaces, and user menu
- Toolbar shows breadcrumb navigation and search

### ProjectLayout

Wraps pages within a project context. Used for routes like `/projects/:projectId/*`:

```vue
<template>
  <div class="project-layout">
    <ProjectHeader :project="currentProject" />
    <ProjectNavigation :project="currentProject" />
    <div class="project-content">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const projectStore = useProjectStore()

const currentProject = computed(() => {
  const projectId = route.params.projectId as string
  return projectStore.projects.find(p => p.id === projectId)
})
</script>
```

**Key features:**
- Sets `meta: { projectScoped: true }` on routes
- Passes `projectId` from route params to child pages
- Renders project-specific header and sidebar tabs
- Child routes access `route.params.projectId`

### SpaceLayout

Wraps dynamic space pages. Used for routes like `/:spaceName/:subPage`:

```vue
<template>
  <div class="space-layout">
    <DynamicSpacePage
      :spaceName="route.params.spaceName as string"
      :subPage="route.params.subPage as string"
      :projectId="route.params.projectId as string | undefined"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
```

**Key features:**
- Loads space bundle dynamically
- Renders injected Vue components
- Supports dynamic sub-pages (any path segment matched)
- Falls back to agent placeholder if space has no Vue bundle

## Space Loading Flow

### Detailed Steps

1. **Route Match** — User navigates to `/projects/proj-123/my-space/settings`
   - Router matches `/:spaceName/:subPage` → `DynamicSpacePage` component

2. **Props Resolution** — Component receives:
   - `spaceName` = `my-space`
   - `subPage` = `settings`
   - `projectId` = `proj-123` (optional, for project-scoped spaces)

3. **Space Manifest Load** — `SpaceLoader.loadSpace(spaceName)` runs:
   ```ts
   // frontend/space_loader/SpaceLoader.ts
   const manifestPath = `spaces/${spaceName}/manifest.json`
   const manifest = await window.__TAURI__.fs.readTextFile(manifestPath)
   const parsedManifest = JSON.parse(manifest) // ManifestV1
   ```

4. **Bundle Loading** — Two modes:

   **Dev Mode** (Vite dev server):
   ```ts
   const pageComponent = await import(`@/spaces/${spaceName}/pages.ts`)
   const Page = pageComponent[`${subPage}Page`] // e.g., "settingsPage"
   ```

   **Production Mode** (Compiled bundles):
   ```ts
   // Load IIFE bundle from file system
   const bundlePath = `spaces/${spaceName}/dist/${spaceName}.iife.js`
   const bundleSource = await window.__TAURI__.fs.readTextFile(bundlePath)

   // Execute bundle → assigns globals like window.__CONSTRUCT_SPACE_my_space_v1
   eval(bundleSource)

   // Extract page from globals
   const namespace = window.__CONSTRUCT_SPACE_my_space_v1
   const Page = namespace.pages[subPage]
   ```

5. **CSS Injection** — Load and inject space-specific CSS:
   ```ts
   const cssPath = `spaces/${spaceName}/dist/${spaceName}.css`
   const cssSource = await window.__TAURI__.fs.readTextFile(cssPath)

   const style = document.createElement('style')
   style.setAttribute('data-space', spaceName)
   style.textContent = cssSource
   document.head.appendChild(style)
   ```
   CSS is scoped to avoid conflicts with main app styles.

6. **Component Caching** — Cache loaded space in memory:
   ```ts
   const cachedSpaces = new Map<string, LoadedSpace>()
   cachedSpaces.set(spaceName, {
     id: spaceName,
     pages: { settings: Page, ... },
     manifest: parsedManifest,
     cssInjected: true,
   })
   ```
   Subsequent navigations to the same space use cached components.

7. **Page Rendering** — `DynamicSpacePage` renders the matched page:
   ```vue
   <component :is="loadedPageComponent" :projectId="projectId" />
   ```

8. **Sub-Page Matching** — Routes with dynamic params like `:id`:
   - Route: `/my-space/:id` → spaceName = `my-space`, subPage = `:id`
   - Request to `/my-space/user-456` → DynamicSpacePage receives `:id` = `user-456`
   - Page component accesses `route.params.id` to fetch specific data

### Error Handling

If space loading fails:
```ts
try {
  await spaceLoader.loadSpace(spaceName)
} catch (e) {
  // Fallback: render agent placeholder
  return <AgentPlaceholder spaceName={spaceName} />
}
```

Users can still interact with the AI assistant while space components fail gracefully.

## Window.__CONSTRUCT__ Globals

The `window.__CONSTRUCT__` object is set up in `frontend/lib/spaceHost.ts` and enables space bundles to reference shared dependencies:

```ts
// spaceHost.ts
window.__CONSTRUCT__ = {
  // Core frameworks
  'vue': { ref, computed, onMounted, ... },
  'vue-router': { useRouter, useRoute, ... },
  'pinia': { defineStore, createPinia, ... },

  // Tauri APIs
  '@tauri-apps/api': {
    window,
    fs,
    invoke,
    event,
    ...
  },

  // Construct libraries
  '@construct-space/ui': {
    Button,
    Card,
    Dialog,
    ...
  },
  '@construct-space/sdk': {
    useProject,
    useAuth,
    useOperator,
    ...
  },

  // Utilities
  'lodash-es': { debounce, throttle, ... },
  'zod': { z },
  'date-fns': { format, parse, ... },
  // ... and 15+ more packages
}
```

### Vite Externalize Configuration

In `frontend/vite.config.ts`:

```ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'vue',
        'vue-router',
        'pinia',
        '@tauri-apps/api',
        '@construct-space/ui',
        '@construct-space/sdk',
        // ... list of all shared packages
      ],
    },
  },
})
```

When a space bundle does `import { ref } from 'vue'`, Vite's externalize config intercepts it and emits:
```js
const { ref } = window.__CONSTRUCT__['vue']
```

This ensures no duplicates and allows spaces to be lightweight IIFE bundles.

### Runtime Window.construct Object

Additionally, `window.construct` is set up with runtime SDK data composables:

```ts
window.construct = {
  auth: useAuthStore(),
  project: useProjectStore(),
  space: useSpaceStore(),
  operator: useOperator(),
  storage: useStorageAPI(),
}
```

Spaces can call:
```ts
const currentProject = window.construct.project.current
const { dispatch } = window.construct.operator
```

## Settings System

### Settings Navigation Structure

Settings are declared in `frontend/config/settingsNavigation.ts`:

```ts
export const settingsNavigation = [
  {
    group: 'Account',
    items: [
      {
        name: 'Profile',
        path: '/settings/profile',
        component: () => import('@/pages/Settings/Profile.vue'),
      },
      {
        name: 'Security',
        path: '/settings/security',
        component: () => import('@/pages/Settings/Security.vue'),
      },
    ],
  },
  {
    group: 'General',
    items: [
      {
        name: 'Appearance',
        path: '/settings/appearance',
        component: () => import('@/pages/Settings/Appearance.vue'),
      },
      {
        name: 'Data & Privacy',
        path: '/settings/privacy',
        component: () => import('@/pages/Settings/Privacy.vue'),
      },
    ],
  },
  {
    group: 'AI & Integrations',
    items: [
      {
        name: 'LLMs',
        path: '/settings/llms',
        component: () => import('@/pages/Settings/LLMs.vue'),
      },
      {
        name: 'MCP Servers',
        path: '/settings/mcp',
        component: () => import('@/pages/Settings/MCP.vue'),
      },
      {
        name: 'Skills',
        path: '/settings/skills',
        component: () => import('@/pages/Settings/Skills.vue'),
      },
    ],
  },
]
```

### Benefits

- **Modular** — Each settings page is a separate component imported dynamically
- **Lazy-loaded** — Settings pages are only loaded when accessed, reducing initial bundle size
- **Maintainable** — Easy to add, remove, or reorder settings pages
- **Typed** — Full TypeScript support for navigation structure

### Rendering Settings Pages

The `SettingsLayout` component renders the navigation and page:

```vue
<template>
  <div class="settings-layout">
    <SettingsSidebar :navigation="settingsNavigation" />
    <div class="settings-content">
      <Suspense>
        <template #default>
          <component :is="currentPageComponent" />
        </template>
        <template #fallback>
          <SettingsPageSkeleton />
        </template>
      </Suspense>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const currentPageComponent = computed(() => {
  const settingsPath = route.path
  // Find matching component from settingsNavigation
  return resolveSettingsComponent(settingsPath)
})
</script>
```

### Adding a New Settings Page

1. Create component: `frontend/pages/Settings/NewSetting.vue`
2. Add to `settingsNavigation`:
   ```ts
   {
     name: 'New Setting',
     path: '/settings/new-setting',
     component: () => import('@/pages/Settings/NewSetting.vue'),
   }
   ```
3. No route changes needed — navigation structure drives the routing

## Common Patterns & Best Practices

### Accessing Auth State
```ts
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
console.log(authStore.isAuthenticated)
console.log(authStore.currentUser.email)
```

### Accessing Project State
```ts
import { useProjectStore } from '@/stores'

const projectStore = useProjectStore()
const currentProject = computed(() => projectStore.current)
const allProjects = computed(() => projectStore.projects)
```

### Communicating with Operator
```ts
import { useOperator } from '@/composables'

const { dispatch, on, stream } = useOperator()

// Single-response dispatch
const result = await dispatch('get_context', { projectId: '123' })

// Streaming dispatch
stream('generate_code', { language: 'ts' }, (chunk) => {
  console.log(chunk)
})

// Listen to events
on('DISPATCH_RESULT', (data) => {
  console.log('Result:', data)
})
```

### Reactive Form Handling
```ts
import { ref, computed } from 'vue'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

const form = ref({
  name: '',
  email: '',
})

const errors = ref({})

const submit = async () => {
  const result = schema.safeParse(form.value)
  if (!result.success) {
    errors.value = result.error.flatten().fieldErrors
    return
  }
  // Submit to operator
}
```

## Debugging & Troubleshooting

### Check Boot Logs
```ts
// In console
console.log('Auth state:', window.__CONSTRUCT__.construct.auth)
console.log('Project store:', window.__CONSTRUCT__.construct.project)
console.log('Operator connected:', window.__CONSTRUCT__.construct.operator.connected)
```

### Inspect Space Loading
```ts
// Add debug logs in DynamicSpacePage
const { data: loadedSpace, loading, error } = spaceLoader.loadSpace(spaceName)
console.log('Space loading:', { loadedSpace, loading, error })
```

### Monitor IPC Events
```ts
// Listen to all Tauri events
window.__TAURI__.event.listen('tauri://message', (event) => {
  console.log('IPC:', event.payload)
})
```

### Check Network Requests
Open DevTools → Network tab to see:
- API calls to operator (localhost:60100)
- Space bundle requests
- Asset loading

### Performance Profiling
Open DevTools → Performance tab:
1. Click "Record"
2. Perform action (e.g., navigate to space)
3. Click "Stop"
4. Analyze flame graph for slow components/operations
