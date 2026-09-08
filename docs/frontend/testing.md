# Frontend Testing

The frontend uses Vitest for all tests, running in a Node environment.

## Setup

**Config**: `frontend/vitest.config.ts`
**Environment**: Node (not jsdom)
**Command**: `bun run test`
**File patterns**: `*.test.ts` or `*.spec.ts`

## Test Locations

```
frontend/
├── operator/*.test.ts          # Protocol & session tests
├── assistant/*.test.ts         # Envelope parsing, registry, normalization
├── composables/*.test.ts       # Composable unit tests
├── router/__tests__/           # Routing tests
├── lib/__tests__/              # Utility tests
└── utils/__tests__/            # Pure function tests
```

## Mocking Patterns

### Mocking Tauri
```ts
import { vi } from 'vitest'

const invokeMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args) => invokeMock(...args)
}))
```

### Mocking Stores
```ts
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    token: 'test-token',
    isAuthenticated: true,
    user: { id: 1, email: 'test@example.com' }
  })
}))
```

### Mocking the Operator Client
```ts
const dispatchStreamMock = vi.fn()
vi.mock('./client', () => ({
  useOperator: () => ({
    dispatchStream: dispatchStreamMock,
    dispatch: vi.fn(),
    send: vi.fn(),
    connected: ref(true),
  }),
}))
```

## Test Examples

### Testing Model Resolution (useAIModel)
```ts
it('sends resolved model instead of raw stored ID', async () => {
  await session.send([{ type: 'text', content: 'hello' }])

  expect(dispatchStreamMock).toHaveBeenCalledWith(
    'general',
    'hello',
    expect.any(Function),  // onChunk
    expect.any(Function),  // onDone
    expect.any(Function),  // onError
    'openai-oauth:gpt-5.3-codex',  // RESOLVED composite model ID
    {}
  )
})
```

### Testing Envelope Normalization
```ts
it('normalizes assistant.v1 envelope to blocks', () => {
  const envelope = {
    version: 'assistant.v1',
    state: 'ok',
    content: {
      title: 'Plan',
      blocks: [
        { type: 'markdown', text: '## Overview' },
        { type: 'steps', items: [{ title: 'Step 1', status: 'done' }] }
      ]
    }
  }

  const blocks = normalizeAssistantEnvelope(envelope)
  expect(blocks[0]).toEqual({ type: 'text', content: '# Plan' })
  expect(blocks[1]).toEqual({ type: 'text', content: '## Overview' })
  expect(blocks[2]).toEqual({ type: 'tasklist', tasks: [...] })
})
```

### Testing Registry Lifecycle
```ts
it('registers and unregisters space assistant types', () => {
  loadSpaceAssistantTypes([{ id: 'devops', manifest: { assistant: { ... } } }])
  expect(getAssistantType('devops')).toBeDefined()

  unregisterAssistantTypesBySource('space:devops')
  expect(getAssistantType('devops')).toBeUndefined()
})
```

## Conventions

- Mock external dependencies (Tauri, API, stores) at the module level
- Test composables in isolation with mock dependencies
- Use `ref()` for reactive test data
- Test stream events by simulating chunk callbacks
- Tests are required for new features — run before every PR
- Coverage available via v8 plugin

---
