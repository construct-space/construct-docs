# Getting Started

This guide walks you through cloning, installing dependencies, and launching Construct for the first time.

## Step 1: Clone the Repository

```bash
git clone https://github.com/construct/construct-app.git
cd construct-app
```

## Step 2: Install Dependencies

Install all JavaScript/TypeScript dependencies using Bun:

```bash
bun install
```

This installs:
- Frontend dependencies (Vue 3, Pinia, Vite, Tailwind CSS, etc.)
- Build tools and scripts
- Dev dependencies (Vitest, ESLint, TypeScript, etc.)

**Note:** Go and Rust dependencies are managed separately and will be installed during the build process.

## Step 3: Launch the Development Environment

To build and run the complete Construct application (Operator + Frontend + Desktop):

```bash
bun run dev
```

This command:
1. Compiles the Go operator sidecar
2. Starts the operator on TCP port 60100
3. Launches the Tauri desktop shell
4. Loads the frontend

**First run:** The first run may take 2-3 minutes while Rust/Go dependencies are downloaded and compiled.

## Step 4: Verify Launch

Once launched, you should see:
- A native desktop window with the Construct UI
- A 3D sidebar on the left with space icons
- The main chat/agent interface
- Built-in spaces loaded (Code, Chat, Design, Git, Terminal, etc.)

If the window doesn't appear immediately, check the console output in your terminal for errors.

## Port Assignments

Construct uses the following ports in development:

| Port | Service | Purpose |
|------|---------|---------|
| **60100** | Operator TCP | AI engine (agents, tools, provider) |
| **60101** | Bridge | Inter-process communication |
| **60200** | Vite Dev Server | Frontend development (dev mode only) |

If these ports are already in use on your machine, the startup will fail. See [Troubleshooting](#troubleshooting) below.

## First Things to Try

Once Construct launches, try these to get familiar with the interface:

1. **Chat Space:** Type a message in the chat panel to interact with the default AI agent
2. **Code Space:** Open a project folder to see file structure and enable code editing
3. **Terminal Space:** Click the terminal icon to open a PTY terminal
4. **Settings:** Click the gear icon in the sidebar to access preferences
5. **AI Agent Reasoning:** Ask the AI agent to perform a task (e.g., "analyze this file")

## Development Workflow

### Frontend-Only Development

If you're working on the frontend and want faster iteration without rebuilding the operator:

```bash
bun run dev:frontend
```

This starts only the Vite dev server on port 60200. You'll need a running operator process from a previous `bun run dev` session.

### Running Operator Only

If you want to test the operator independently:

```bash
cd operator
go run main.go
```

This starts the operator on port 60100 without the desktop shell or frontend.

### Building for Production

To create an optimized production build:

```bash
bun run build
```

This generates:
- Optimized frontend bundle
- Compiled operator binary
- Packaged Tauri application

## Environment Variables

You can customize behavior with environment variables:

```bash
# Operator port (default: 60100)
export OPERATOR_PORT=60100

# Operator data directory (default: platform-specific, see Data Directory docs)
export CONSTRUCT_DATA_DIR=~/custom-data-dir

# Frontend dev port (default: 60200)
export VITE_PORT=60200

# Operator log level (debug, info, warn, error)
export OPERATOR_LOG_LEVEL=debug

# Enable verbose logging
export DEBUG=construct:*
```

Then run `bun run dev` with the variables set.

## Troubleshooting

### Port 60100 Already in Use

**Problem:** "Address already in use" error on startup.

**Solution:**
```bash
# Find process using port 60100
lsof -i :60100  # macOS/Linux
netstat -ano | findstr :60100  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Then try again
bun run dev
```

### "Go build failed" or Operator Compilation Error

**Problem:** Error compiling the Go operator.

**Solution:**
1. Verify Go 1.23+ is installed: `go version`
2. Check Go workspace setup:
   ```bash
   cd operator
   go mod download
   go mod tidy
   cd ..
   ```
3. Try building directly:
   ```bash
   bun run operator:build
   ```

### "Rust build failed" or Tauri Compilation Error

**Problem:** Error compiling Tauri/Rust dependencies.

**Solution:**
1. Verify Rust is installed: `rustc --version`
2. Update Rust:
   ```bash
   rustup update
   ```
3. Clear build cache:
   ```bash
   cargo clean
   cd desktop
   cargo build
   ```

### Blank Window on Launch

**Problem:** Tauri window opens but frontend doesn't load.

**Solution:**
1. Check that ports 60200 (Vite) and 60100 (Operator) are free
2. Check console output for errors (may show in terminal)
3. Wait 10-15 seconds for frontend to compile on first run
4. Try killing the process and restarting

### Frontend Shows "Cannot Connect to Operator"

**Problem:** Frontend loads but shows error connecting to operator.

**Solution:**
1. Verify operator is running: `lsof -i :60100` (macOS/Linux)
2. Check operator started without errors in console output
3. Verify firewall isn't blocking localhost:60100
4. Try running operator separately:
   ```bash
   cd operator
   go run main.go
   ```
   Then check console for errors.

### Memory or Disk Space Issues

**Problem:** Build fails due to disk space or out-of-memory.

**Solution:**
1. Clear build caches:
   ```bash
   bun run clean  # if script exists
   cargo clean
   go clean -modcache
   ```
2. Free up disk space (builds need ~2GB)
3. Close other applications to free RAM

### Permissions Error on macOS

**Problem:** "Permission denied" when running operator or scripts.

**Solution:**
```bash
# Grant execute permission
chmod +x operator/main.go
chmod +x scripts/*.sh

# Or make executables readable
chmod +x ./construct-app
```

## Common Development Tasks

### Restart Just the Frontend

While keeping operator running:
```bash
# Terminal 1: Original dev process (keep running)
# Terminal 2: Kill frontend and restart
pkill -f "vite"
bun run dev:frontend
```

### Test Frontend Changes

```bash
bun run test          # Run all tests
bun run test -- file  # Run specific test file
bun run test -- --ui  # Interactive test UI
```

### Lint and Format Code

```bash
bun run lint          # Check linting issues
bun run lint -- --fix # Auto-fix linting issues
```

### Type Check Frontend

```bash
bun run typecheck     # Check TypeScript types
```

## Next Steps

- Read [Project Structure](/guide/project-structure) to understand the codebase layout
- Check [Dev Commands Reference](/guide/dev-commands) for all available commands
- Learn about [Spaces](/guide/spaces) to understand the architecture
- Explore [Agents and Tools](/guide/agents-and-tools) for AI engine concepts
