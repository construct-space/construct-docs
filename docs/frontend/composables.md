# Composables Reference

The frontend has 50+ composables in `frontend/composables/`. They follow Vue 3 Composition API patterns and are auto-imported.

## Operator & AI
| Composable | Purpose |
|------------|---------|
| `useOperator()` | Main operator client — connect, dispatch, stream |
| `useAgentSession()` | Block-based agent sessions (turns, send, stop) |
| `useAssistant()` | Chat panel visibility + flat message mode |
| `useAIModel()` | AI provider/model selection and resolution |
| `useStreamStatus()` | Parse stream events into human-readable status |

## Storage & Data
| Composable | Purpose |
|------------|---------|
| `useStorage()` | Unified async storage (SQLite in Tauri, localStorage fallback) |
| `useContextDB()` | SQLite context database via Tauri |
| `useApi()` | HTTP client with token management |
| `useSkills()` | Skill management, discovery, and search |
| `useCredits()` | Credit pool, transactions, purchase |

## App State
| Composable | Purpose |
|------------|---------|
| `useAuth()` | Auth status and actions |
| `useProjectContext()` | Current project info |
| `useSidebar()` | Sidebar state (active space, nav items) |
| `useToolbar()` | Toolbar items (dynamic per space) |
| `usePanelLayout()` | Panel arrangement state |
| `usePanels()` | Panel visibility toggles |
| `useTheme()` | Dark/light mode |

## Spaces
| Composable | Purpose |
|------------|---------|
| `useSpaces()` | Load installed spaces from marketplace |
| `useSpaceMarketplace()` | Browse/install spaces |
| `useSpacePreview()` | Dev preview for space builders |
| `useSpaceAutoInstall()` | Auto-install space bundles |

## Desktop Integration
| Composable | Purpose |
|------------|---------|
| `useConstructWindow()` | Tauri window management |
| `useDraggableWindow()` | Window position/size persistence |
| `useWindowChromeState()` | Native title bar visibility |
| `useDeepLink()` | Deep link handling (construct://) |
| `useGlobalShortcuts()` | System-wide shortcuts (Shift+Shift, Cmd+Shift+A) |

## Utilities
| Composable | Purpose |
|------------|---------|
| `useLogger()` | Structured logging (Tauri plugin-log or console) |
| `useTelemetry()` | Session tracking, screen views |
| `useMarkdown()` | Markdown rendering |
| `useGoogleFonts()` | Font loading |
| `useDevMode()` | Dev mode detection |
| `useConstructAuth()` | OAuth exchange, profile fetch |
| `useConstructConfig()` | App config (API base URL, graph URL) |

## Key Patterns

### Composite Model IDs
`useAIModel()` uses composite IDs: `"provider:model"` (e.g., `"anthropic:claude-sonnet-4-6"`). Resolution chain: exact match → provider family default → server default → configured fallback → first available.

### Storage Keys
`useStorage()` builds namespaced keys: `construct:category:proj123:key`. Supports scoping by category, projectId, userId. Reactive refs are cached to avoid duplicates.

### Auto-Initialization
Many composables use a shared `initPromise` pattern — first access triggers initialization, subsequent accesses share the same promise. Prevents parallel init calls.

### Fallback Chains
- Tauri → localStorage (storage)
- Operator → hardcoded defaults (providers)
- Stream → sync dispatch (if streaming fails)
