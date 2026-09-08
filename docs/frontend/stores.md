# Pinia Stores

All application state is managed through Pinia stores in `frontend/stores/`. Stores are auto-imported — use them directly in any component or composable.

## Core Stores

### auth.ts — User Session
```ts
const auth = useAuthStore()
auth.user           // User object (id, email, name, avatar)
auth.token          // JWT token
auth.oauthToken     // OAuth token for provider auth
auth.isAuthenticated // boolean
auth.error          // Auth error state

auth.loginWithOAuth(code)       // Exchange OAuth code for tokens
auth.logout()                   // Clear session
auth.hydrateAuthState()         // Load from auth.json on boot
auth.syncTokenToContextService() // Sync token to Go operator via Tauri IPC
```

Explain: Token is synced to operator whenever auth changes. Auth state lives in `config/auth.json` in the data directory.

### project.ts — Project Management
```ts
const project = useProjectStore()
project.currentProject     // Active project
project.projects           // All projects
project.recentProjects     // Recently opened
project.projectsRoot       // Root directory (~/ConstructProjects)
project.externalPaths      // External project paths

project.initialize()       // Load projects on boot (async)
project.openProject(path)  // Set active project
project.createProject(name, template)
```

Default spaces per project: code, design, kanban, docs, notes, architect, git, terminal, calendar. Projects persist to localStorage. `buildProjectId()` generates fuzzy-match slugs.

### settings.ts — User Settings (API-backed)
```ts
const settings = useSettingsStore()
settings.settings          // All settings
settings.getByGroup(group) // Filter by group
settings.getByKey(key)     // Single setting
settings.aiSettings        // Semantic getter
settings.mediaSettings     // Semantic getter

settings.fetchSettings()   // Load from /api/settings
settings.saveSetting(key, value, group)
```

### conversations.ts — Chat History
Wraps useContextDB (SQLite via Tauri) for conversation persistence.

### panels.ts — UI Panel State
Controls visibility of AssistantPanel, BottomPanel, SplitPane, etc.

### preferences.ts — User Preferences
UI preferences like theme, sidebar state, last visited, etc.

### pinned.ts — Pinned Items
Pinned sidebar items persisted via SQLite (Tauri plugin).

## Store Conventions
- All stores are Pinia `defineStore()` with Composition API style
- Auto-imported — no explicit import needed
- Stores that need persistence use localStorage, SQLite, or API calls
- Auth token sync to operator is automatic
