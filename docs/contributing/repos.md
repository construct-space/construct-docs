# Repositories & Ownership

Construct is distributed across multiple repositories, each with a specific purpose and tech stack. All repositories follow the same branch strategy and contribution guidelines.

## Repository Overview

| Repo | GitHub | Purpose | Stack | Owner |
|------|--------|---------|-------|-------|
| `construct` | `construct-ai/construct` | Desktop application | Vue 3 + Tauri 2 | Team |
| `construct-operator` | `construct-ai/construct-operator` | AI backend and orchestration | Go 1.25+ | Team |
| `construct-sdk` | `construct-ai/construct-sdk` | Space SDK and type definitions | TypeScript | Team |
| `design-system` | `construct-ai/design-system` | Design documentation and components | Vue 3 + Vite | Team |
| `releases` | `construct-ai/releases` | CI/CD pipelines and release automation | GitHub Actions | DevOps |

## construct

**Purpose**: The main desktop application. Where users interact with Construct.

**Tech Stack**:
- Frontend: Vue 3 + Vite
- Backend: Tauri 2 (Rust)
- Language: TypeScript + Rust
- Package Manager: bun

**Key Directories**:
```
construct/
  frontend/                # Vue 3 application
    src/
      components/         # UI components
      composables/        # Vue composables
      pages/             # Route pages
      stores/            # Pinia stores
      router/            # Vue Router config
  desktop/                # Tauri application
    src/
      lib.rs             # Rust bridge for native functionality
  package.json           # npm dependencies
  vitest.config.ts       # Frontend test config
```

**Development**:
```bash
cd construct
bun install              # Install dependencies
bun run dev             # Start dev server
bun run build           # Build desktop app
bun run test            # Run tests
```

**Branch Strategy**: Same as all repos (main, beta, dev, feat/*, fix/*)

**CI/CD**: GitHub Actions workflows in `.github/workflows/`
- Tests on every commit
- Build on dev branch
- Deploy to staging on dev merge
- Production release on main merge

## construct-operator

**Purpose**: The AI orchestration backend. Manages agent sessions, tool execution, and state persistence.

**Tech Stack**:
- Language: Go 1.25+
- Architecture: gRPC + REST API
- Storage: SQLite (dev) / PostgreSQL (production)
- Build: Docker + Captain deployment

**Key Directories**:
```
construct-operator/
  cmd/
    operator/           # Main binary
  internal/
    agent/             # Agent configuration and execution
    state/             # State store implementation
    hooks/             # Hook execution engine
    mcp/               # MCP server integration
    tools/             # Built-in tool definitions
  api/
    proto/             # gRPC protocol definitions
  tests/               # Integration tests
  Dockerfile
  go.mod / go.sum      # Go dependencies
```

**Development**:
```bash
cd construct-operator
go mod download         # Download dependencies
go build ./cmd/operator # Build binary
go test ./...          # Run tests
go run ./cmd/operator  # Run development server
```

**Testing**:
```bash
go test ./...          # Run all tests
go test -cover ./...   # With coverage
go test -v ./...       # Verbose output
```

**Branch Strategy**: Same as all repos (main, beta, dev, feat/*, fix/*)

**Database**:
- Development: SQLite file in data directory
- Production: PostgreSQL with connection pooling
- Migrations: SQL files in `db/migrations/`

## construct-sdk

**Purpose**: Exported TypeScript packages for space developers.

**Tech Stack**:
- Language: TypeScript
- Package Manager: npm
- Build: Vite
- Publishing: npm registry

**Packages**:
1. `@construct-space/sdk` - Runtime APIs (useAuth, useStorage, etc.)
2. `@construct-space/ui` - Design system components

**Key Directories**:
```
construct-sdk/
  packages/
    sdk/              # @construct-space/sdk
      src/
        composables/  # useAuth, useStorage, etc.
        stores/       # Pinia stores
        types/        # Type definitions
    ui/               # @construct-space/ui
      src/
        components/   # UI components
        composables/  # UI composables
  tsconfig.json      # TypeScript config
  package.json       # Monorepo root
```

**Development**:
```bash
cd construct-sdk
npm install
npm run build           # Build packages
npm run test            # Run tests
npm run publish         # Publish to npm
```

**Versioning**: Follows semantic versioning. Version bumps trigger npm publication.

**Branch Strategy**: Same as all repos

**Publishing**: On main branch merge, GitHub Actions publishes to npm registry.

## design-system

**Purpose**: Design documentation, component showcase, and design specs.

**Tech Stack**:
- Frontend: Vue 3 + Vite
- Build: Static site generation
- Hosting: GitHub Pages

**Key Directories**:
```
design-system/
  src/
    components/       # Reusable component examples
    pages/           # Documentation pages
    styles/          # Global design tokens
  docs/              # Markdown documentation
  vite.config.ts
  package.json
```

**Development**:
```bash
cd design-system
npm install
npm run dev           # Start dev server
npm run build         # Build static site
```

**Branch Strategy**: Same as all repos

**Publishing**: On main branch merge, builds and deploys to GitHub Pages automatically.

## releases

**Purpose**: CI/CD pipeline definitions and release automation.

**Tech Stack**:
- GitHub Actions (YAML workflows)
- Shell scripts for automation

**Key Workflows**:
```
releases/
  .github/
    workflows/
      test.yml           # Run tests on all PRs
      lint.yml           # Code quality checks
      build.yml          # Build artifacts
      deploy-staging.yml # Deploy to staging from dev
      deploy-prod.yml    # Deploy to production from main
      publish-npm.yml    # Publish packages to npm
```

**Workflow Triggers**:
- `test.yml`: On every push to any branch
- `lint.yml`: On PR to main, beta, or dev
- `build.yml`: On PR and commit to main, beta, or dev
- `deploy-staging.yml`: On merge to dev
- `deploy-prod.yml`: On merge to main
- `publish-npm.yml`: On push tag matching `v*.*.*`

**Key Scripts**:
```bash
scripts/
  release.sh        # Bump version and create release
  deploy.sh         # Deploy to environment
  publish.sh        # Publish packages
```

**Branch Strategy**: Not a code repo, houses CI/CD configs for all repos

## Shared Branch Strategy

All repositories use the same branching strategy:

### Protected Branches

**main**
- Production release branch
- No direct pushes
- Requires 1+ approval and passing CI
- Auto-deploys to production

**beta**
- Release candidate branch
- No direct pushes
- Pre-release testing environment
- Auto-deploys to beta.construct.dev

**dev**
- Integration branch
- No direct pushes
- Where all features merge
- Auto-deploys to staging environment

### Working Branches

**feat/***
- Feature branches
- Based on: `dev`
- Merged to: `dev` via PR
- Naming: `feat/agent-spawning`, `feat/dark-mode`

**fix/***
- Bug fix branches
- Based on: `dev`
- Merged to: `dev` via PR
- Naming: `fix/memory-leak`, `fix/auth-bug`

**chore/***
- Maintenance and dependency updates
- Based on: `dev`
- Merged to: `dev` via PR
- Naming: `chore/update-deps`, `chore/ci-improvements`

## Repository Synchronization

Some files must stay synchronized across repositories:

### construct ↔ construct-sdk

**Frontend imports from SDK**:
```typescript
// construct/frontend imports from construct-sdk
import { useAuth } from '@construct-space/sdk'
import { Button } from '@construct-space/ui'
```

These are installed as npm packages, so versioning is automatic.

### construct ↔ construct-operator

**Desktop communicates with operator**:
```rust
// construct/desktop/src/lib.rs
// Tauri bridge that talks to operator at http://localhost:60100
```

Protocol is versioned separately. Breaking changes require coordinated releases.

### construct ↔ design-system

**Design system documents construct patterns**:
The design system documents the UI component library used in construct. Should stay in sync.

## Development Setup

### First Time Setup

```bash
# Clone all necessary repos
git clone https://github.com/construct-ai/construct.git
git clone https://github.com/construct-ai/construct-operator.git
git clone https://github.com/construct-ai/construct-sdk.git

# Setup construct
cd construct
bun install
bun run dev

# In another terminal, setup operator
cd ../construct-operator
go mod download
go run ./cmd/operator

# Frontend will connect to localhost:60100
```

### Common Workflows

**Working on a feature across repos**:

1. Create feature branch in each repo
2. Make changes locally
3. Test integration locally
4. Create PRs in all repos
5. Ensure tests pass in all repos
6. Merge all PRs
7. Deploy together if needed

**Syncing with upstream**:

```bash
# In each repo
git fetch origin dev
git rebase origin/dev
```

## Dependency Management

### construct Dependencies

- **Frontend dependencies**: `package.json` (managed with bun)
- **Desktop dependencies**: `Cargo.toml` (Rust)
- **SDK imports**: From npm `@construct-space/sdk` and `@construct-space/ui`

Update with:
```bash
bun update              # Update all dependencies
bun audit               # Check for vulnerabilities
```

### construct-operator Dependencies

- **Go dependencies**: `go.mod` and `go.sum`

Update with:
```bash
go get -u ./...         # Update all dependencies
go mod tidy             # Clean up unused
go vulnerabilities      # Check CVEs
```

### construct-sdk Dependencies

- **npm dependencies**: `package.json`

Update with:
```bash
npm update
npm audit
npm audit fix           # Auto-fix vulnerabilities
```

## Release Coordination

### Simultaneous Release

When releasing features that span multiple repos:

1. All PRs merged to `dev`
2. Test thoroughly in staging
3. All repos: Create release branch (release/v1.2.0) to `beta`
4. Final testing in beta environment
5. All repos: Merge `beta` → `main`
6. Tag all repos with matching version
7. CI automatically publishes packages and deploys

### Staggered Release

If repos have independent release cycles:

1. **construct-sdk**: Publish to npm independently
2. **construct-operator**: Deploy Go service independently
3. **construct**: Releases depend on stable SDK and operator versions

Document dependency versions clearly in release notes.

## Contribution Guidelines

All repos follow:
- [Commit Conventions](./commits.md)
- [Code Standards](./code-standards.md)
- [Testing Guide](./testing.md)
- [Workflow Guidelines](./workflow.md)

## Access and Permissions

### Required Access

- GitHub repos (read access minimum)
- npm registry (publish access for releases)
- Docker registry (push access for releases)
- Production deployments (limited to maintainers)

### Who Can Merge

- **Team members**: Can merge PRs to dev and beta
- **Maintainers**: Can merge PRs to main
- **DevOps**: Manage CI/CD and deployments

## Backup and Disaster Recovery

### Code Backup

All repos are backed up to private mirrors:
- Contact maintainers for access
- Used only in case of primary repo compromise

### Release Artifacts

Previous releases stored in:
- npm registry: All published packages
- Docker registry: All published images
- GitHub releases: Binaries and changelogs

Deployments can be rolled back to any previous version.
