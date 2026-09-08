# Testing

The operator has 33 test files covering all major packages. Tests follow Go conventions: table-driven tests, mock providers, and temporary directories.

## Running Tests

```bash
# Run all tests
cd construct-app/operator
go test ./...

# Run tests for a specific package
go test ./internal/runner/
go test ./internal/tool/
go test ./internal/mcp/

# Run with verbose output
go test -v ./...

# Run a specific test
go test -v -run TestRunnerLoop ./internal/runner/

# Run with race detector
go test -race ./...

# Run with coverage
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Test Patterns

### Table-Driven Tests

Most tests use Go's table-driven pattern:

```go
func TestToolSanitize(t *testing.T) {
    tests := []struct {
        name    string
        input   map[string]any
        wantErr bool
    }{
        {
            name:    "valid path",
            input:   map[string]any{"path": "src/main.go"},
            wantErr: false,
        },
        {
            name:    "path traversal",
            input:   map[string]any{"path": "../../../etc/passwd"},
            wantErr: true,
        },
        {
            name:    "absolute path outside project",
            input:   map[string]any{"path": "/etc/passwd"},
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := sanitizePath(tt.input, "/home/user/project")
            if (err != nil) != tt.wantErr {
                t.Errorf("sanitizePath() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### Mock Providers

Tests use mock providers that return predefined responses:

```go
type MockProvider struct {
    responses []provider.Response
    callCount int
}

func (m *MockProvider) Complete(req provider.Request) (provider.Response, error) {
    if m.callCount >= len(m.responses) {
        return provider.Response{StopReason: "end_turn"}, nil
    }
    resp := m.responses[m.callCount]
    m.callCount++
    return resp, nil
}

func (m *MockProvider) Stream(req provider.Request) (provider.Stream, error) {
    // Return a channel-based mock stream
}
```

This allows testing the runner loop, tool execution, and multi-turn flows without hitting real AI APIs.

### Temporary Directories

File-related tests use `t.TempDir()` for isolation:

```go
func TestStateStore(t *testing.T) {
    dir := t.TempDir()
    store := state.NewStore(dir)

    store.Set("key", "value")
    got, ok := store.Get("key")
    if !ok || got != "value" {
        t.Errorf("expected 'value', got %v", got)
    }

    // dir is automatically cleaned up after test
}
```

### Tool Tests

Tool tests verify both successful execution and error handling:

```go
func TestReadTool(t *testing.T) {
    dir := t.TempDir()
    // Create test file
    os.WriteFile(filepath.Join(dir, "test.txt"), []byte("hello\nworld"), 0644)

    tool := NewReadTool()
    ctx := ExecContext{ProjectPath: dir}

    // Test: read entire file
    result, err := tool.Execute(map[string]any{"path": "test.txt"}, ctx)
    if err != nil {
        t.Fatal(err)
    }
    if !strings.Contains(result, "hello") {
        t.Error("expected file contents")
    }

    // Test: read with offset
    result, err = tool.Execute(map[string]any{"path": "test.txt", "offset": 2}, ctx)
    // ...

    // Test: file not found
    _, err = tool.Execute(map[string]any{"path": "missing.txt"}, ctx)
    if err == nil {
        t.Error("expected error for missing file")
    }
}
```

## Test Coverage by Package

| Package | Test File(s) | Key Tests |
|---------|-------------|-----------|
| `agent` | `config_test.go`, `registry_test.go` | Config parsing, YAML loading, registry CRUD |
| `runner` | `runner_test.go` | Turn loop, tool execution, stuck detection, max turns |
| `tool` | `tool_test.go`, `sanitize_test.go` | Each built-in tool, path sanitization, input validation |
| `provider` | `provider_test.go`, `anthropic_test.go` | Request translation, error handling, model listing |
| `mcp` | `client_test.go`, `protocol_test.go` | JSON-RPC messaging, tool discovery, connection lifecycle |
| `skill` | `skill_test.go`, `match_test.go` | Trigger matching, variable expansion, agent filtering |
| `hook` | `hook_test.go` | Pre/post execution, blocking, shell command hooks |
| `state` | `store_test.go` | Read/write, concurrency, file persistence |
| `session` | `session_test.go` | Create, save, load, delete sessions |
| `transport` | `tcp_test.go`, `http_test.go` | Message routing, streaming, connection handling |
| `module` | `router_test.go` | Handler registration, message dispatch |

## Writing New Tests

When adding a new feature:

1. **Create `*_test.go`** in the same package
2. **Use table-driven tests** for input/output variations
3. **Mock external dependencies** (providers, file system)
4. **Use `t.TempDir()`** for any file operations
5. **Test error cases** — not just the happy path
6. **Use `t.Parallel()`** where tests don't share state

```go
func TestMyFeature(t *testing.T) {
    t.Parallel()  // Run in parallel with other tests

    tests := []struct {
        name string
        // ... test cases
    }{
        // ...
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()  // Sub-tests can also run in parallel
            // ...
        })
    }
}
```

## CI Integration

Tests run in CI on every push:

```bash
go test -race -cover ./...
```

The `-race` flag enables the race detector to catch concurrency bugs. Coverage reports are generated and uploaded as artifacts.
