# Code Standards

Construct maintains high code quality through consistent standards across frontend, backend, and infrastructure code. All contributions must follow these guidelines.

## TypeScript Standards

### Strict Mode

All TypeScript code must use strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

This means:

- **No `any` type** unless absolutely unavoidable (and must be documented with `// @ts-ignore`)
- **Explicit null/undefined handling** - Check for nulls before accessing properties
- **Type all function parameters** - No implicit `any` parameters

### Type Annotations

Always provide explicit types:

```typescript
// Good
const users: User[] = [];
function fetchUser(id: string): Promise<User> {
  // ...
}

// Avoid
const users = [];  // Unknown type
function fetchUser(id) {  // No parameter type
  // ...
}
```

### Interfaces over Types

Prefer `interface` for object shapes, `type` for unions:

```typescript
// Good - Interface for objects
interface User {
  id: string;
  email: string;
  name: string;
}

// Good - Type for unions
type Status = "active" | "inactive" | "pending";

// Avoid - Type for objects (less extensible)
type User = {
  id: string;
  email: string;
};
```

## Vue Standards

### Composition API with Setup Script

Always use `<script setup lang="ts">`:

```vue
<!-- Good -->
<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const message = ref('Hello')
</script>

<!-- Avoid - Options API -->
<script lang="ts">
export default {
  data() {
    return { message: 'Hello' }
  }
}
</script>
```

### Composables over Mixins

Use composables for shared logic:

```typescript
// Good - Composable
export function useCount() {
  const count = ref(0)
  const increment = () => count.value++
  return { count, increment }
}

// Avoid - Mixin
const countMixin = {
  data() { return { count: 0 } },
  methods: { increment() { this.count++ } }
}
```

### Component Organization

```vue
<template>
  <!-- Template first, concise -->
  <div class="component">
    <h1>{{ title }}</h1>
    <Button @click="handleClick">Click Me</Button>
  </div>
</template>

<script setup lang="ts">
// Imports
import { ref, computed } from 'vue'
import Button from './Button.vue'

// Props
interface Props {
  initialTitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialTitle: 'Default'
})

// Emits
const emit = defineEmits<{
  click: [value: string]
}>()

// State
const title = ref(props.initialTitle)

// Computed
const upperTitle = computed(() => title.value.toUpperCase())

// Methods
function handleClick() {
  emit('click', title.value)
}
</script>

<style scoped>
.component {
  padding: 1rem;
}
</style>
```

### Props with TypeScript

Always use `withDefaults` and explicit types:

```typescript
interface Props {
  title: string
  count?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  disabled: false
})
```

### Component Naming

- File names: PascalCase (`UserProfile.vue`)
- Component names: Same as file name
- Slots: kebab-case (`<slot name="header-action">`)

## Go Standards

### Code Quality

All Go code must pass:

```bash
# Run before committing
go vet ./...
go test ./...

# Optional but recommended
go fmt ./...
golangci-lint run
```

### Error Handling

Always handle errors explicitly:

```go
// Good
if err != nil {
  return nil, fmt.Errorf("failed to load config: %w", err)
}

// Avoid
result, _ := operation()  // Silently ignoring errors
```

### Interface Definition

Define small, focused interfaces:

```go
// Good - Small, focused interface
type Reader interface {
  Read([]byte) (int, error)
}

// Avoid - Large, bloated interface
type AllOperations interface {
  Read() ([]byte, error)
  Write([]byte) error
  Delete(string) error
  Update(map[string]interface{}) error
  // ... 20 more methods
}
```

### Concurrency

Use goroutines and channels safely:

```go
// Good - Clear channel usage
type Service struct {
  results chan Result
  done    chan struct{}
}

// Good - Error handling with context
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// Avoid - Goroutines without cancellation
go func() { /* runs forever */ }()
```

### Testing

Test files in same package:

```
operator/
  internal/
    state/
      store.go
      store_test.go     // Same package, same directory
```

Example test:

```go
func TestStoreGet(t *testing.T) {
  store := NewStore(t.TempDir())

  store.Set("key", "value")
  value, err := store.Get("key")

  if err != nil {
    t.Fatalf("unexpected error: %v", err)
  }

  if value != "value" {
    t.Errorf("expected 'value', got %q", value)
  }
}
```

## Frontend Structure

### Directory Organization

```
frontend/
  src/
    components/        # Reusable Vue components
      Button.vue
      Modal.vue
    composables/       # Reusable logic
      useAuth.ts
      useStorage.ts
    stores/           # Pinia stores
      auth.ts
      project.ts
    pages/            # Route components
      Dashboard.vue
      Settings.vue
    utils/            # Helper functions
      format.ts
      validate.ts
    router/           # Route definitions
      index.ts
    types/            # TypeScript types
      agent.ts
      space.ts
    styles/           # Global styles
      main.css
    App.vue
    main.ts
```

### Import Alias

Always use `@/` alias for frontend imports:

```typescript
// Good - Use alias
import { useAuth } from '@/composables/useAuth'
import Button from '@/components/Button.vue'

// Avoid - Relative paths
import { useAuth } from '../../../composables/useAuth'
import Button from '../../components/Button.vue'
```

Configure in `vite.config.ts`:

```typescript
export default {
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
}
```

### Auto-imports

Enable auto-imports in `vite.config.ts` to avoid verbose imports:

```typescript
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

export default {
  plugins: [
    AutoImport({
      imports: ['vue', 'vue-router'],
      dirs: ['src/composables', 'src/stores'],
      vueTemplate: true
    }),
    Components({
      dirs: ['src/components'],
      dts: 'src/components.d.ts'
    })
  ]
}
```

Then use without imports:

```vue
<script setup lang="ts">
// useAuth, Button already available
const auth = useAuth()
</script>
```

## Operator Code

### AI Logic in Operator Only

Keep all AI interaction logic in the Go operator, never in frontend:

```typescript
// Good - Frontend uses SDK
const result = await dispatch({
  messages: [...],
  agentID: 'architect'
})

// Avoid - Frontend calling AI directly
const response = await fetch('https://api.anthropic.com/...')
```

This ensures:
- Consistent AI logic across clients
- Easier to update models/providers
- Better security (API keys server-side)
- Session management centralized

## SDK Import Rules

Always import from npm packages, never use `file:` paths:

```typescript
// Good - From npm
import { useAuth, useStorage } from '@construct-space/sdk'
import { Button, Modal } from '@construct-space/ui'

// Avoid - File paths break in production
import { useAuth } from 'file:../../../construct-sdk/src/composables'
```

## Alignment Requirements

Two files must stay synchronized:

### desktop/src/lib.rs

Tauri-bridge-enabled functions:

```rust
#[tauri::command]
pub fn show_file_picker(title: String) -> Result<Vec<String>> {
  // Implementation
}
```

### frontend/lib/appPaths.ts

Frontend-accessible paths must be declared:

```typescript
// Must list all available commands from Tauri bridge
export const appPaths = {
  showFilePicker: 'show_file_picker',
  // Add new Tauri commands here
}
```

**Critical**: Always update both files when adding Tauri commands.

## Documentation

### Code Comments

Comments explain "why", not "what":

```typescript
// Good - Explains reasoning
// Use Handlebars to support dynamic context in system prompts
const compiled = Handlebars.compile(template)

// Avoid - Explains what code obviously does
// Increment count
count++
```

### Function Documentation

Document public functions:

```typescript
/**
 * Dispatch a request to an agent and stream results.
 *
 * @param request - The dispatch request with messages and agent ID
 * @returns Promise resolving to session ID for streaming
 * @throws Error if agent not found or request invalid
 *
 * @example
 * const sessionId = await dispatch({
 *   messages: [{ role: 'user', content: [...] }],
 *   agentID: 'architect'
 * })
 */
export async function dispatch(request: DispatchRequest): Promise<string> {
  // Implementation
}
```

### README Files

Each major module should have a README explaining:
- What it does
- How to use it
- Key concepts
- Examples

## Linting & Formatting

### ESLint

Frontend must pass ESLint:

```bash
npm run lint        # Check for issues
npm run lint:fix    # Fix automatically
```

Configuration in `.eslintrc.json`:
- No `any` types
- No unused variables
- No console in production
- Consistent naming conventions

### Prettier

All frontend code is formatted with Prettier:

```bash
npm run format      # Format all files
```

Configuration in `.prettierrc`:
- 2-space indentation
- Single quotes
- Semicolons required
- Line width: 80 characters

### Go fmt

Go code must be formatted:

```bash
go fmt ./...
```

No configuration needed - standard Go style.

## Performance

### Frontend

- Lazy load routes with Vue Router's dynamic imports
- Use computed() for derived state (not methods)
- Memoize expensive computations
- Avoid unnecessary re-renders (use v-show for toggling)

### Operator

- Cache file reads when possible
- Use goroutines for I/O-bound operations
- Profile before optimizing
- Keep tight loops fast

## Security

### Never in Frontend

- API keys
- Tokens
- Secrets
- Authentication logic

### Environment Variables

Use `.env.local` for development secrets (never committed):

```bash
# .env.local (in .gitignore)
VITE_OPERATOR_URL=http://localhost:60100
```

Access via `import.meta.env`:

```typescript
const operatorUrl = import.meta.env.VITE_OPERATOR_URL
```

### Dependency Updates

Keep dependencies current but tested:

```bash
npm outdated           # Check for updates
npm update             # Update safely
npm audit              # Check for vulnerabilities
```

## Testing Requirements

See [Testing Guide](./testing.md) for complete details.

Quick summary:
- Unit tests for utilities and composables
- Integration tests for complex flows
- E2E tests for critical user paths
- All new features require tests

## Checklist Before Commit

- [ ] Code passes linter (`npm run lint`, `go vet`)
- [ ] Tests pass locally (`npm run test`, `go test ./...`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in development
- [ ] Code follows style standards (run formatter)
- [ ] TypeScript: no `any` types without explanation
- [ ] Commit message follows conventions
- [ ] No hardcoded secrets or API keys
