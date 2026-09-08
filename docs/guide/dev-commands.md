# Dev Commands Reference

This is a quick reference for all commonly-used development commands. All commands are run from the root directory (`construct-app/`).

## Core Development Commands

### `bun run dev`

Full desktop application build and launch.

```bash
bun run dev
```

**What it does:**
1. Compiles the Go operator
2. Starts the operator on TCP `:60100`
3. Launches the Tauri desktop shell
4. Loads the frontend (either from Vite or bundled)

**Use when:** Starting development, testing the complete app

**First run time:** 2-3 minutes (downloading and compiling dependencies)

**Subsequent runs:** 30-60 seconds

**Output:** Native Construct window opens; check terminal for errors

---

### `bun run dev:frontend`

Frontend-only development mode (Vite dev server).

```bash
bun run dev:frontend
```

**What it does:**
1. Starts Vite dev server on `:60200`
2. Enables hot module replacement (HMR) for fast frontend iteration
3. Connects to an existing operator on `:60100`

**Use when:** Working on frontend code with fast iteration

**Prerequisites:** Operator must be running (from a previous `bun run dev` session)

**Output:** Terminal shows Vite startup; visit `http://localhost:60200` in a browser or wait for Tauri to connect

---

### `bun run build`

Production build of the entire application.

```bash
bun run build
```

**What it does:**
1. Optimizes and bundles the frontend
2. Compiles the Go operator with optimizations
3. Packages the Tauri application
4. Creates platform-specific binaries

**Use when:** Preparing a release or testing production behavior

**Output:** Built app available in `src-tauri/target/release/`

**Time:** 3-5 minutes

---

### `bun run release`

Create a signed, versioned release for the current platform.

```bash
bun run release
```

**What it does:**
1. Updates version numbers in all files
2. Creates git tag
3. Builds production binary
4. Signs the binary (platform-specific)

**Use when:** Creating official releases

**Prerequisites:** Git repo must be clean; signing keys configured for macOS/Windows

**Output:** Signed app and version bump commit + tag

---

### `bun run clean`

Remove all build artifacts and caches.

```bash
bun run clean
```

**What it does:**
1. Removes `node_modules/`
2. Clears Cargo build cache
3. Clears Go module cache
4. Removes `.next/`, `dist/`, and other build output

**Use when:** Recovering from build issues, freeing disk space

**Time:** 1-2 minutes

---

## Frontend Commands

### `bun run test`

Run frontend tests with Vitest.

```bash
bun run test
```

**Options:**
```bash
bun run test -- src/components/Agent.test.ts  # Run specific file
bun run test -- --ui                          # Interactive UI
bun run test -- --watch                       # Watch mode
bun run test -- --coverage                    # Coverage report
```

**Use when:** Running unit and component tests

**Output:** Test results with pass/fail summary

---

### `bun run lint`

Check code for style and quality issues (ESLint).

```bash
bun run lint
```

**Options:**
```bash
bun run lint -- --fix          # Auto-fix issues
bun run lint -- --max-warnings 0 # Fail on warnings
```

**Use when:** Checking code quality before commit

**Output:** List of issues or "0 errors, 0 warnings"

---

### `bun run typecheck`

Run TypeScript type checking (vue-tsc).

```bash
bun run typecheck
```

**Use when:** Catching type errors before runtime

**Output:** Type errors or success

**Note:** ESLint and other linters may miss some TypeScript issues; this is a comprehensive check

---

### `bun run format`

Format code with Prettier.

```bash
bun run format
```

**Use when:** Ensuring consistent code style

**Output:** Files modified in-place

---

## Operator Commands

### `bun run operator:build`

Compile the Go operator (without running it).

```bash
bun run operator:build
```

**What it does:**
1. Navigates to `operator/`
2. Runs `go build`
3. Outputs binary to `operator/construct-operator` (or `.exe` on Windows)

**Use when:** Testing operator compilation, checking for Go errors

**Time:** 30-60 seconds

---

### `bun run operator:test`

Run all Go tests in the operator.

```bash
bun run operator:test
```

**Options:**
```bash
bun run operator:test -- -v                    # Verbose output
bun run operator:test -- -run TestAgentExecution # Run specific test
```

**Use when:** Verifying operator logic, testing after changes

**Output:** Test results with pass/fail summary

---

### `bun run operator:lint`

Lint the Go code (golangci-lint or gofmt).

```bash
bun run operator:lint
```

**Use when:** Checking Go code quality

**Output:** List of issues

---

## Desktop/Tauri Commands

### `tauri dev`

Build and run Tauri app (alternative to `bun run dev`).

```bash
tauri dev
```

**Use when:** Debugging Tauri-specific issues or using Tauri CLI directly

**Note:** `bun run dev` is preferred as it handles operator setup

---

### `tauri build`

Build Tauri app for current platform (alternative to `bun run build`).

```bash
tauri build
```

**Use when:** Testing Tauri build separately from operator/frontend

---

## Platform-Specific Build Commands

Build for specific platforms (requires appropriate toolchain):

```bash
# macOS Intel
bun run build:mac-x64

# macOS Apple Silicon
bun run build:mac-arm64

# macOS Universal (Intel + ARM in one binary)
bun run build:mac-universal

# Development mode (no codesigning, faster)
bun run build:devmode

# Windows
bun run build:win

# Linux
bun run build:linux
```

**Note:** Cross-compilation may not be supported; run platform builds on the target platform.

---

## Utility Commands

### `bun install`

Install JavaScript dependencies (package manager).

```bash
bun install
```

**Use when:** Initial setup, after changing `package.json`

**Output:** Installs packages and creates `bun.lock`

---

### `bun run doctor`

Check system setup (if script exists).

```bash
bun run doctor
```

**What it does:** Verifies all prerequisites are installed and correct versions

**Use when:** Troubleshooting setup issues

**Output:** List of tools with versions or errors

---

## Development Workflow Examples

### Scenario: I'm working on the frontend

```bash
# Terminal 1: Start full dev (includes operator)
bun run dev

# Wait for app to launch, then in another terminal:

# Terminal 2: Kill the Vite process from Terminal 1 and restart for better feedback
pkill -f vite
bun run dev:frontend

# Now you have HMR on the frontend with the operator running
```

### Scenario: I'm fixing a bug in the operator

```bash
# Terminal 1: Start full dev
bun run dev

# Terminal 2: Make changes to operator code, then rebuild
bun run operator:build

# The change will be picked up on next app restart in Terminal 1
# Or restart the operator process manually
```

### Scenario: I'm running tests before commit

```bash
# Frontend tests
bun run test

# Frontend linting
bun run lint -- --fix

# Type checking
bun run typecheck

# Operator tests
bun run operator:test

# If all pass, you're good to commit!
```

### Scenario: I'm preparing a release

```bash
# Build for production
bun run build

# Test the production build locally
# (app will be in src-tauri/target/release/)

# Create signed release
bun run release

# Or manually:
bun run operator:build
# ... tag the version in git
```

---

## Environment Variables

Set environment variables to customize behavior:

```bash
# Operator port (default: 60100)
export OPERATOR_PORT=60100

# Data directory (default: platform-specific)
export CONSTRUCT_DATA_DIR=~/data

# Vite dev port (default: 60200)
export VITE_PORT=60200

# Log level
export OPERATOR_LOG_LEVEL=debug

# Enable debug output
export DEBUG=construct:*
```

Then run commands with variables:

```bash
OPERATOR_LOG_LEVEL=debug bun run dev
```

---

## Troubleshooting Commands

### Port already in use

```bash
# Find what's using the port
lsof -i :60100      # macOS/Linux
netstat -ano | findstr :60100  # Windows

# Kill the process
kill -9 <PID>       # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Clear all caches and rebuild

```bash
bun run clean
bun install
bun run build
```

### Check Node/Bun/Go/Rust versions

```bash
node --version
bun --version
go version
rustc --version
tauri --version
```

### View operator logs

```bash
# If operator is running separately
cd operator
go run main.go

# Look for logs in the terminal
```

---

## Command Cheat Sheet

| Command | Purpose | Time |
|---------|---------|------|
| `bun run dev` | Full app launch | 2-3 min (first), 30-60 sec (subsequent) |
| `bun run dev:frontend` | Frontend only | 10-15 sec |
| `bun run build` | Production build | 3-5 min |
| `bun run release` | Signed release | 5-10 min |
| `bun run test` | Frontend tests | 10-30 sec |
| `bun run lint` | Lint frontend | 5-10 sec |
| `bun run typecheck` | Type check | 10-20 sec |
| `bun run operator:build` | Compile Go | 30-60 sec |
| `bun run operator:test` | Test Go | 10-30 sec |
| `bun run clean` | Clear caches | 1-2 min |

## Next Steps

- See [Getting Started](/guide/getting-started) for first-time setup
- Check [Project Structure](/guide/project-structure) to understand what each build touches
- Read [Troubleshooting](/guide/getting-started#troubleshooting) for common issues
