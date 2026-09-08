# Testing Guide

This guide covers testing practices for Construct frontend and backend code. All new features require tests before PR review.

## Frontend Testing

### Setup

Frontend tests use Vitest with Node environment:

```bash
# Install dependencies
bun install

# Run tests
bun run test

# Watch mode for development
bun run test:watch

# Coverage report
bun run test:coverage
```

### Configuration

Vitest config in `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

### Test File Organization

Test files use either `.test.ts` or `.spec.ts` suffix:

```
src/
  composables/
    useAuth.ts
    useAuth.test.ts          # Alongside source file
  utils/
    format.ts
    format.test.ts
  router/
    __tests__/               # Or in __tests__ folder
      router.spec.ts
```

Put tests near the code they test for easy discovery.

### Example Test: Composable

Testing a composable that uses the SDK:

```typescript
// composables/useAuth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuth } from './useAuth'

// Mock the SDK
vi.mock('@construct-space/sdk', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '123', email: 'test@example.com' },
    isAuthenticated: true,
    logout: vi.fn()
  }))
}))

describe('useAuth', () => {
  let auth: ReturnType<typeof useAuth>

  beforeEach(() => {
    auth = useAuth()
  })

  it('should return authenticated user', () => {
    expect(auth.user?.email).toBe('test@example.com')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('should logout', async () => {
    await auth.logout()
    expect(auth.isAuthenticated).toBe(false)
  })
})
```

### Example Test: Component

Testing a Vue component:

```typescript
// components/Button.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from './Button.vue'

describe('Button', () => {
  it('renders slot content', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click Me'
      }
    })

    expect(wrapper.text()).toContain('Click Me')
  })

  it('emits click event', async () => {
    const wrapper = mount(Button)
    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('applies disabled state', () => {
    const wrapper = mount(Button, {
      props: { disabled: true }
    })

    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('calls onClick handler', async () => {
    const onClick = vi.fn()
    const wrapper = mount(Button, {
      props: { onClick }
    })

    await wrapper.trigger('click')
    expect(onClick).toHaveBeenCalled()
  })
})
```

### Example Test: Utility Function

Testing a pure utility function:

```typescript
// utils/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate, parseEmail } from './format'

describe('format utilities', () => {
  describe('formatDate', () => {
    it('formats ISO date to readable string', () => {
      const result = formatDate('2026-03-29T10:15:30Z')
      expect(result).toBe('Mar 29, 2026 10:15 AM')
    })

    it('handles invalid dates', () => {
      expect(() => formatDate('invalid')).toThrow()
    })
  })

  describe('parseEmail', () => {
    it('extracts email parts', () => {
      const result = parseEmail('test@example.com')
      expect(result).toEqual({
        local: 'test',
        domain: 'example.com'
      })
    })

    it('validates email format', () => {
      expect(parseEmail('invalid')).toBeNull()
    })
  })
})
```

### Mocking Best Practices

#### Mock API Calls

```typescript
import { vi } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: '123' })
  })
)
```

#### Mock Composables

```typescript
vi.mock('@construct-space/sdk', () => ({
  useAuth: vi.fn(),
  useStorage: vi.fn()
}))

// In test
import { useAuth } from '@construct-space/sdk'
const mockUseAuth = vi.mocked(useAuth)
mockUseAuth.mockReturnValue({ /* ... */ })
```

#### Mock Modules

```typescript
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))
```

### Test Coverage

Check coverage with:

```bash
bun run test:coverage
```

Coverage reports are generated in HTML:

```
coverage/
  index.html       # Open in browser
  utils.ts.html
  composables.ts.html
```

Aim for:
- **Statements**: 80%+ for critical code
- **Branches**: 75%+ (all conditionals covered)
- **Functions**: 85%+ (all functions tested)
- **Lines**: 80%+

Exclude test files and mocks from coverage.

## Operator Testing

### Setup

Go tests use standard `testing` package:

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run with verbose output
go test -v ./...

# Run specific test
go test -run TestStoreGet ./operator/internal/state
```

### Test File Naming

Test files use `_test.go` suffix in the same package:

```
operator/
  internal/
    state/
      store.go
      store_test.go       # Same package as store.go
    hooks/
      executor.go
      executor_test.go
```

### Example Test: Unit Test

Testing a state store function:

```go
// operator/internal/state/store_test.go
package state

import (
  "testing"
)

func TestStoreGet(t *testing.T) {
  store := NewStore(t.TempDir())

  // Setup
  store.Set("key", "value")

  // Execute
  value, err := store.Get("key")

  // Assert
  if err != nil {
    t.Fatalf("unexpected error: %v", err)
  }

  if value != "value" {
    t.Errorf("expected 'value', got %q", value)
  }
}

func TestStoreGetMissing(t *testing.T) {
  store := NewStore(t.TempDir())

  _, err := store.Get("missing")

  if err == nil {
    t.Error("expected error for missing key, got nil")
  }
}
```

### Example Test: Table-Driven Test

Testing multiple scenarios:

```go
func TestFormatDuration(t *testing.T) {
  tests := []struct {
    name     string
    duration time.Duration
    want     string
  }{
    {
      name:     "seconds",
      duration: 30 * time.Second,
      want:     "30s",
    },
    {
      name:     "minutes",
      duration: 5 * time.Minute,
      want:     "5m0s",
    },
    {
      name:     "hours",
      duration: 1 * time.Hour,
      want:     "1h0m0s",
    },
  }

  for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
      got := FormatDuration(tt.duration)
      if got != tt.want {
        t.Errorf("got %q, want %q", got, tt.want)
      }
    })
  }
}
```

### Example Test: Integration Test

Testing tool execution:

```go
func TestToolExecution(t *testing.T) {
  // Setup
  operator := NewOperator()
  result, err := operator.Execute(ToolCall{
    Name: "bash",
    Input: map[string]interface{}{
      "command": "echo hello",
    },
  })

  // Assert
  if err != nil {
    t.Fatalf("unexpected error: %v", err)
  }

  if result.Output != "hello\n" {
    t.Errorf("expected 'hello\\n', got %q", result.Output)
  }
}
```

### Test Helpers

Create helper functions for common test setup:

```go
// operator/internal/test/helpers.go
package test

import (
  "testing"
  "operator/internal/state"
)

// NewTestStore creates a store with temporary directory
func NewTestStore(t *testing.T) *state.Store {
  return state.NewStore(t.TempDir())
}

// NewTestOperator creates an operator with test config
func NewTestOperator(t *testing.T) *Operator {
  return &Operator{
    store: NewTestStore(t),
    // ... other test config
  }
}
```

Then use in tests:

```go
import "operator/internal/test"

func TestSomething(t *testing.T) {
  store := test.NewTestStore(t)
  // ... rest of test
}
```

### Benchmarking

For performance-critical code, add benchmarks:

```go
func BenchmarkStoreGet(b *testing.B) {
  store := NewStore(b.TempDir())
  store.Set("key", "value")

  b.ResetTimer()
  for i := 0; i < b.N; i++ {
    store.Get("key")
  }
}
```

Run benchmarks:

```bash
go test -bench=. -benchmem ./operator/internal/state
```

## Testing Practices

### What to Test

1. **Unit Tests**: Individual functions and methods
   - Pure functions (deterministic input/output)
   - Error handling
   - Edge cases

2. **Integration Tests**: Multiple components working together
   - Tool execution with hooks
   - Agent spawning and context
   - State persistence

3. **End-to-End**: Critical user flows
   - Agent dispatch and stream
   - File operations
   - Authentication flow

### What NOT to Test

- Library internals (Vue internals, Go stdlib)
- Visual rendering (use visual regression tests if needed)
- Third-party APIs (mock them instead)
- Implementation details (test behavior, not how)

### Test Organization

```typescript
describe('useAuth', () => {
  describe('when authenticated', () => {
    it('returns user info', () => { /* ... */ })
    it('allows logout', () => { /* ... */ })
  })

  describe('when not authenticated', () => {
    it('returns null user', () => { /* ... */ })
    it('requires login', () => { /* ... */ })
  })
})
```

### Async Testing

```typescript
// Using async/await
it('should fetch user', async () => {
  const user = await fetchUser('123')
  expect(user.id).toBe('123')
})

// Or returning promise
it('should fetch user', () => {
  return fetchUser('123').then(user => {
    expect(user.id).toBe('123')
  })
})
```

### Error Testing

```typescript
it('should throw on invalid input', () => {
  expect(() => {
    parseEmail('invalid')
  }).toThrow()
})

it('should reject with error', () => {
  return expect(fetchUser(-1)).rejects.toThrow('Invalid ID')
})
```

## Pre-Commit Checklist

Before pushing:

```bash
# Frontend
bun run lint      # ESLint check
bun run test      # Run tests
bun run build     # Verify build

# Operator
go vet ./...      # Static analysis
go test ./...     # Run tests
go build ./cmd/   # Verify build
```

## CI/CD Integration

Tests run automatically on every commit:

1. **Feature branches**: Must pass all tests
2. **dev branch**: Tests + deploy to staging
3. **main branch**: Tests + deploy to production

If any test fails, the build is marked red and cannot be merged.

## Common Issues

### "Test timeout"

Increase timeout for slow operations:

```typescript
// Vitest
it('should complete', async () => { /* ... */ }, 10000) // 10s

// Go
func TestSlowOperation(t *testing.T) {
  done := make(chan bool, 1)
  go func() {
    // slow operation
    done <- true
  }()

  select {
  case <-done:
    // success
  case <-time.After(30 * time.Second):
    t.Fatal("timeout")
  }
}
```

### "Mock not working"

Ensure mocks are imported before tested code:

```typescript
// Wrong - mock too late
import { useAuth } from '@construct-space/sdk'
vi.mock('@construct-space/sdk')

// Right - mock before import
vi.mock('@construct-space/sdk')
import { useAuth } from '@construct-space/sdk'
```

### "Flaky tests"

Tests that sometimes pass/fail are usually timing issues:

```typescript
// Avoid - timing-dependent
it('should update', async () => {
  updateUser()
  expect(user.name).toBe('Jane') // Might fail if async!
})

// Better - wait for actual change
it('should update', async () => {
  await updateUser()
  expect(user.name).toBe('Jane')
})

// Or use waitFor
it('should update', async () => {
  updateUser()
  await waitFor(() => {
    expect(user.name).toBe('Jane')
  })
})
```

## Resources

- [Vitest Docs](https://vitest.dev)
- [Vue Test Utils](https://test-utils.vuejs.org)
- [Go Testing](https://golang.org/pkg/testing/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
