# Commit Conventions

Construct follows Conventional Commits for clear, semantic version control history. This enables automated changelog generation and makes history readable.

## Format

```
type(scope): description

[optional body]

[optional footer]
```

## Types

### feat
New feature or capability.

**Examples:**
- `feat(agent): add agent spawning capability`
- `feat(operator): implement MCP tool bridging`
- `feat(ui): add dark mode toggle to settings`

### fix
Bug fix or correction.

**Examples:**
- `fix(operator): prevent infinite loop in tool execution`
- `fix(auth): clear session on logout`
- `fix(ui): resolve modal overflow on small screens`

### chore
Maintenance tasks, dependency updates, or build system changes. Does not affect feature code.

**Examples:**
- `chore: update dependencies`
- `chore(ci): add database migration test step`
- `chore(build): optimize bundle size`

### docs
Documentation additions or improvements. Does not affect code.

**Examples:**
- `docs: add operator protocol reference`
- `docs(api): document state store interfaces`
- `docs(contributing): add testing guide`

### refactor
Code refactoring that doesn't change behavior.

**Examples:**
- `refactor(operator): extract tool execution into separate module`
- `refactor(ui): simplify modal component logic`
- `refactor: consolidate duplicate utility functions`

### test
Test additions or improvements.

**Examples:**
- `test(agent): add tests for agent spawning`
- `test: increase coverage to 85%`
- `test(operator): add integration tests for tool execution`

## Scopes

Scopes organize commits by component. Use kebab-case.

Common scopes:
- `agent` - Agent configuration and behavior
- `operator` - Go operator backend
- `sidebar` - Sidebar navigation
- `toolbar` - Toolbar and page actions
- `space` - Space manifest and configuration
- `sdk` - TypeScript SDK and composables
- `design` - Design system components
- `vibe` - UI styling and themes
- `architect` - Architect agent specifically
- `auth` - Authentication and authorization
- `settings` - Settings and preferences

**Examples:**
- `feat(agent): add spawning capability`
- `fix(operator): memory leak in state store`
- `docs(sdk): improve composable documentation`

Scopes are optional for generic work:
- `chore: update dependencies` (no scope needed)
- `docs: add contributing guide` (no scope needed)

## Description

The description is concise and imperative (present tense):

- `add` not `added` or `adds`
- `fix` not `fixed` or `fixes`
- `implement` not `implemented`
- `refactor` not `refactored`

Keep it short (under 50 characters):

```
Good:  feat(agent): add spawning capability
Long:  feat(agent): add the ability for agents to spawn new sessions or fork existing ones

Good:  fix(operator): prevent infinite loop
Long:  fix(operator): fix a bug that could cause infinite loops in tool execution
```

## Body

Optional but recommended for complex changes. Explain what and why.

```
feat(agent): add agent spawning capability

Allow agents to spawn new sessions by invoking other agents.
This enables complex multi-agent workflows where one agent
can delegate work to another.

Implemented by adding canSpawn field to agent config and
spawn() method to agent interface. Includes validation to
prevent circular spawning.

Closes #234
```

## Footer

Optional. Use for metadata:
- `Closes #123` - Link to GitHub issue
- `Refs #123` - Reference issue without closing
- `Breaking change:` - Document breaking API changes
- `BREAKING CHANGE:` - Trigger major version bump in release

**Example:**

```
feat(operator): redesign tool execution API

BREAKING CHANGE: Tool input format changed from flat object
to nested structure. Update custom tools accordingly.

Closes #456
```

## Examples by Type

### feat Examples

```
feat(agent): add spawning capability
feat(operator): implement MCP tool bridging
feat(ui): add dark mode toggle to settings
feat(sdk): expose runtime configuration API
feat(space): add toolbar item support in manifest
feat(design): create button component variants
```

### fix Examples

```
fix(operator): prevent infinite loop in tool execution
fix(auth): clear session on logout
fix(ui): resolve modal overflow on small screens
fix(agent): handle missing context gracefully
fix(sdk): fix race condition in useStorage composable
```

### chore Examples

```
chore: update dependencies
chore: upgrade to Node 20
chore(ci): add database migration test step
chore(build): optimize bundle size
chore(deps): update Go dependencies to latest
```

### docs Examples

```
docs: add operator protocol reference
docs(api): document state store interfaces
docs(contributing): add testing guide
docs(sdk): improve composable documentation
docs(example): add space configuration example
```

### refactor Examples

```
refactor(operator): extract tool execution into separate module
refactor(ui): simplify modal component logic
refactor: consolidate duplicate utility functions
refactor(sdk): reorganize composables directory
refactor(agent): improve system prompt compilation
```

### test Examples

```
test(agent): add tests for agent spawning
test: increase coverage to 85%
test(operator): add integration tests for tool execution
test(ui): add tests for form validation
test(sdk): add tests for useStorage composable
```

## Multi-line Messages

For complex commits, use the body:

```
feat(operator): implement MCP tool bridging

Add support for MCP (Model Context Protocol) servers to expose
additional tools to agents. Servers are configured in operator
config and managed via MCPRuntimeState in the state store.

Changes:
- Add MCP server registry and lifecycle management
- Implement tool discovery from MCP servers
- Add MCP tool execution with proper error handling
- Update tool schema documentation

Closes #234
```

## What NOT to Do

### Don't mix types

```
Bad:  feat(agent): add spawning and fix memory leak
Good: feat(agent): add spawning capability
      fix(operator): prevent memory leak in state store
```

### Don't be vague

```
Bad:  feat: stuff
Bad:  fix: random changes
Good: feat(agent): add spawning capability
Good: fix(operator): prevent infinite loop in tool execution
```

### Don't use past tense

```
Bad:  feat(agent): added spawning capability
Bad:  fix: fixed the bug
Good: feat(agent): add spawning capability
Good: fix: prevent infinite loop
```

### Don't include implementation details in type

```
Bad:  refactor(operator): feat: optimize tool execution
Good: refactor(operator): optimize tool execution
Good: feat(operator): add parallel tool execution
```

### Never add Co-Authored-By

Construct commits should only list the individual committer. Do not add `Co-Authored-By` trailers to commits.

```
# Don't do this:
feat(agent): add spawning

Co-Authored-By: Jane Doe <jane@example.com>

# Just commit as yourself
```

If multiple people contributed, mention in PR description instead.

## Commit Squashing

When merging PRs, always **squash and merge** commits:

```
# Before merge: 5 commits
feat(agent): WIP - add spawning
fix: address review comments
refactor: simplify implementation
test: add tests
docs: update documentation

# After squash merge: 1 clean commit
feat(agent): add spawning capability
```

The merge commit message should be a clean, conventional commit message.

## Automated Tools

### commitlint

Optional but recommended. Install and configure to enforce conventions:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

Configuration in `commitlint.config.js`:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional']
}
```

Use husky to run commitlint on every commit:

```bash
npm install --save-dev husky
npx husky add .husky/commit-msg 'npx commitlint --edit'
```

Now commits that don't follow conventions are rejected:

```
$ git commit -m "bad commit"
✖ subject must not be empty
```

### Changelog Generation

Conventional commits enable automated changelog generation. Tools like `conventional-changelog-cli` parse commits and generate:

```markdown
## [1.2.0] - 2026-03-29

### Added
- Agent spawning capability
- Dark mode toggle in settings

### Fixed
- Infinite loop in tool execution
- Modal overflow on small screens

### Changed
- Tool execution API (BREAKING)
```

## Release Versioning

Conventional commits inform semantic versioning:

- **feat** commits → Minor version bump (1.0.0 → 1.1.0)
- **fix** commits → Patch version bump (1.0.0 → 1.0.1)
- **BREAKING CHANGE** footer → Major version bump (1.0.0 → 2.0.0)

The release tooling automatically calculates version bumps from commits.

## Examples from Real Projects

### Simple feature

```
feat(ui): add notification component
```

### Bug fix with detail

```
fix(operator): prevent memory leak in state store

The state store was holding references to old entries
even after deletion. Changed to explicitly clear entry
references on deletion.

Closes #234
```

### Breaking change

```
feat(api): redesign tool input format

BREAKING CHANGE: Tool input is now nested under 'input'
property. Update custom tools:
  Old: { command: "..." }
  New: { input: { command: "..." } }

Closes #456
```

### Large refactor

```
refactor(operator): extract tool execution into module

Move tool execution logic from agent.go into new
operator/execution/tools.go module for better organization
and testability.

This is a pure refactor with no functional changes.
Execution behavior is identical.
```

## Why This Matters

Conventional commits provide:

1. **Readable history**: `git log` shows clear feature/fix/chore progression
2. **Automation**: Release tooling can generate changelogs and bump versions
3. **Consistency**: Everyone follows the same rules
4. **Search**: Easy to find commits by type or scope
5. **Integration**: Many tools expect this format

```bash
# See all features
git log --oneline --grep="feat:"

# See all fixes in agent scope
git log --oneline --grep="fix(agent)"

# See commits since last tag
git log v1.0.0..HEAD
```
