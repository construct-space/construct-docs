# Tool Schema Reference

Tools are the executable actions available to agents. Construct provides built-in tools, supports custom tool definitions, and integrates with external tools via Space manifests and MCP.

## Built-in Tools

Construct includes these essential built-in tools in all spaces:

### bash

Execute shell commands in a working directory context.

| Property | Value |
|----------|-------|
| **ID** | `bash` |
| **Description** | Execute bash/shell commands. Returns stdout and stderr. |
| **Timeout** | 30 seconds default, configurable per invocation |
| **Safe Default** | Blocks dangerous patterns: `rm -rf`, `git push --force` |

Parameters:
- `command` (string, required): Shell command to execute
- `cwd` (string, optional): Working directory for execution

### read

Read file contents from the filesystem.

| Property | Value |
|----------|-------|
| **ID** | `read` |
| **Description** | Read files by path. Handles text, code, and certain binary formats (images, PDFs). |
| **Max Size** | 50 MB per file |
| **Timeout** | 10 seconds |

Parameters:
- `path` (string, required): Absolute file path
- `limit` (number, optional): Max lines to read (default: 2000)
- `offset` (number, optional): Start line number (default: 0)

### write

Create or overwrite files with content.

| Property | Value |
|----------|-------|
| **ID** | `write` |
| **Description** | Write or create files. Requires read of target first (safety check). |
| **Max Size** | 50 MB per file |
| **Timeout** | 10 seconds |
| **Confirm Required** | For sensitive files (.env, credentials.json, etc.) |

Parameters:
- `path` (string, required): Absolute file path
- `content` (string, required): File content

### edit

Replace text in existing files with precise control.

| Property | Value |
|----------|-------|
| **ID** | `edit` |
| **Description** | Replace exact text in files. Useful for surgical modifications. |
| **Max Size** | 50 MB per file |
| **Timeout** | 10 seconds |

Parameters:
- `path` (string, required): Absolute file path
- `old_string` (string, required): Exact text to replace
- `new_string` (string, required): Replacement text
- `replace_all` (boolean, optional): Replace all occurrences (default: false)

### glob

Find files matching patterns in a directory tree.

| Property | Value |
|----------|-------|
| **ID** | `glob` |
| **Description** | Find files by glob pattern (e.g., `**/*.ts`, `src/**/*.json`). |
| **Max Results** | 10,000 files |
| **Timeout** | 5 seconds |

Parameters:
- `pattern` (string, required): Glob pattern to match
- `path` (string, optional): Base directory (default: current directory)

### grep

Search file contents using regex patterns.

| Property | Value |
|----------|-------|
| **ID** | `grep` |
| **Description** | Search file contents with regex. Returns matching lines with context. |
| **Max Results** | 1,000 matches |
| **Timeout** | 10 seconds |

Parameters:
- `pattern` (string, required): Regex pattern to match
- `path` (string, optional): File or directory to search
- `type` (string, optional): File type filter (e.g., "js", "ts", "go")
- `context` or `-C` (number, optional): Lines of context before/after match

### listdir

List directory contents with file metadata.

| Property | Value |
|----------|-------|
| **ID** | `listdir` |
| **Description** | List files and directories with size, type, and modification time. |
| **Max Items** | 10,000 per directory |
| **Timeout** | 5 seconds |

Parameters:
- `path` (string, required): Directory path to list
- `recursive` (boolean, optional): List subdirectories recursively (default: false)

## Custom Tool Definition

Custom tools extend built-in capabilities. Define them in `agent/tools/*.md` files within a space.

### File Location

```
spaces/my-space/
  agent/
    tools/
      deploy.md
      validate-schema.md
      generate-docs.md
```

### Custom Tool Structure

```yaml
---
id: deploy
name: "Deploy to Staging"
description: "Deploys the current branch to the staging environment"
category: "deployment"
parameters:
  - name: branch
    type: string
    description: "Git branch to deploy"
    required: true
  - name: wait
    type: boolean
    description: "Wait for deployment to complete"
    required: false
    default: true
command: "bash scripts/deploy.sh {{branch}}"
timeout: 300
confirm: true
icon: "rocket"
---

# Deploy Tool

This tool handles deployments to staging and production environments.

## Usage

Provide the branch name to deploy. The tool will:
1. Validate the branch exists
2. Run the deployment script
3. Monitor deployment status
4. Report success or failure

## Safety

Always confirm before deploying to production.
```

### Parameter Schema

Each parameter in the `parameters` array:

```typescript
interface ToolParameter {
  name: string;                    // Unique identifier
  type: "string" | "number" | "boolean" | "array";
  description: string;             // Help text
  required: boolean;               // Must be provided
  enum?: string[];                 // Valid values (for enum type)
  default?: unknown;               // Default value if not provided
  pattern?: string;                // Regex pattern (for string type)
}
```

### Command Templates

Commands use Handlebars syntax for parameter interpolation:

```yaml
command: "bash scripts/test.sh {{suite}} --timeout {{timeout}}"
```

At execution, parameters are injected:

```
Input: { suite: "unit", timeout: "30" }
Rendered: "bash scripts/test.sh unit --timeout 30"
```

### Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique tool ID (kebab-case) |
| `name` | string | yes | Display name |
| `description` | string | yes | Brief description shown in UI |
| `category` | string | no | Category for organization ("build", "test", "deploy", etc.) |
| `parameters` | object[] | no | Parameter definitions |
| `command` | string | yes | Shell command to execute (can use Handlebars) |
| `timeout` | number | no | Execution timeout in seconds (default: 60) |
| `confirm` | boolean | no | Require user confirmation before running (default: false) |
| `icon` | string | no | Icon identifier (e.g., "rocket", "test", "bug") |
| `environment` | object | no | Environment variables to set |

### Example: Database Migration Tool

```yaml
---
id: migrate-db
name: "Run Database Migration"
description: "Executes pending database migrations"
category: "database"
parameters:
  - name: direction
    type: "string"
    enum: ["up", "down"]
    description: "Migration direction"
    required: true
  - name: steps
    type: "number"
    description: "Number of migrations to apply"
    required: false
    default: 1
command: "go run scripts/migrate.go --direction {{direction}} --steps {{steps}}"
timeout: 120
confirm: true
environment:
  DATABASE_URL: "${DB_URL}"
  MIGRATION_DIR: "db/migrations"
---

# Database Migration

Runs pending migrations or rolls back recent ones.
```

## Space CLI Tools via Manifest

Tools can be registered via the space manifest (`space.manifest.json`):

```json
{
  "tools": [
    {
      "id": "deploy",
      "name": "Deploy to Staging",
      "description": "Deploy current branch to staging",
      "icon": "rocket",
      "command": "scripts/deploy.sh"
    }
  ]
}
```

See [Space Manifest Reference](./space-manifest.md) for complete schema.

## Bridge Tools (Desktop-Only)

Bridge tools invoke native code through the Tauri bridge. Available on desktop only.

Example: File picker, system notifications, native dialogs.

```typescript
// In agent space code
const files = await invoke("show_file_picker", {
  title: "Select files",
  multiple: true
});
```

Bridge tools are defined in `desktop/src/lib.rs` and registered in the frontend.

## MCP Tools (External Integration)

MCP (Model Context Protocol) tools connect to external services. The operator communicates with MCP servers over stdio or HTTP.

### MCP Tool Structure

```yaml
---
id: github-issue
name: "Create GitHub Issue"
description: "Creates a new issue in the GitHub repository"
mcp: true
server: "github-mcp-server"
timeout: 30
parameters:
  - name: title
    type: string
    description: "Issue title"
    required: true
  - name: body
    type: string
    description: "Issue description"
    required: false
---
```

MCP servers are configured in operator config, not in agent configs. They're loaded at startup and made available to all agents that request them.

See operator documentation for MCP server setup.

## Tool Execution Flow

The complete execution path:

```
1. Agent requests tool execution
   { type: "tool", name: "bash", input: { command: "ls" } }

2. Operator receives request

3. Tool registry lookup
   - Check built-in tools
   - Check custom tools in agent/tools/
   - Check space manifest tools
   - Check MCP tools

4. Validate parameters
   - Check required fields
   - Type checking
   - Pattern validation (regex)

5. Pre-execution hooks
   - Safety checks
   - Confirmation prompts (if confirm: true)
   - Hook execution (pre_tool hooks)

6. Template rendering
   - Render Handlebars in command
   - Resolve environment variables

7. Tool execution
   - Run command in subprocess or via bridge
   - Capture stdout, stderr, exit code

8. Post-execution hooks
   - Hook execution (post_tool hooks)
   - Result filtering

9. Return result
   { type: "tool_result", id: "...", content: "...", error?: "..." }

10. Agent receives result and continues
```

## Tool Availability in Context

Tools available to an agent depend on:

1. **Agent config**: `blockedTools` array excludes specific tools
2. **Space manifest**: `tools` array defines available tools
3. **Context**: Some tools unavailable outside certain environments
4. **Permissions**: MCP tool permissions checked per tool

Example context request:

```json
{
  "type": "dispatch",
  "agentID": "architect",
  "context": {
    "tools": ["bash", "read", "write", "edit", "glob", "grep"]
  }
}
```

## Best Practices

1. **Name tools clearly**: Use descriptive names like "deploy-to-staging" not "d1"
2. **Document parameters**: Each parameter needs clear description
3. **Set appropriate timeouts**: Longer for I/O bound (database, network), shorter for quick operations
4. **Use confirm for destructive**: Always confirm for deletion, deployment, or data mutation
5. **Template safely**: Validate parameters before injecting into commands
6. **Handle errors gracefully**: Tools should return clear error messages
7. **Test thoroughly**: Test custom tools in isolation before using in agents
8. **Secure credentials**: Never hardcode secrets; use environment variables or secure stores
