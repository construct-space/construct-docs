# Spaces

Spaces are the fundamental unit of extensibility in Construct. Each space is a self-contained module that provides a specific capability or workflow, with its own pages, components, AI agent, tools, and theme.

## What is a Space?

A space is a pluggable interface into the Construct shell. Unlike traditional menu items or plugins, spaces are first-class citizens with their own:

- **Pages:** Vue components defining the space's interface
- **Components:** Reusable UI elements shared within the space
- **Composables:** Reusable logic and state management
- **Stores:** Pinia stores for local state
- **AI Agent:** A configured LLM agent with custom tools and behaviors
- **Tools:** Custom functions the agent can invoke
- **Styling:** Theme overrides and custom CSS
- **Manifest:** Configuration declaring the space to the shell

Spaces are displayed in the sidebar as icons and can teleport content into the main shell interface. When you click a space icon, you're switching to that space's pages and interface.

## Built-in Spaces

Construct ships with several built-in spaces:

| Space | Purpose | Key Features |
|-------|---------|--------------|
| **Code** | File browser, code editing, refactoring | Syntax highlighting, diff view, agent-driven edits |
| **Design** | Visual design and prototyping | Component library, layout tools, CSS preview |
| **AI** | AI assistant and reasoning | Long-form reasoning, model selection, context |
| **Chat** | Conversational interface | Chat history, conversation management |
| **Git** | Version control integration | Commit history, branch management, diff viewer |
| **Terminal** | Command-line interface | PTY terminal emulator, command execution |
| **Tasks** | Task and issue tracking | Task list, kanban board, filtering |
| **Docs** | Documentation browser | Markdown rendering, search, TOC |
| **Notes** | Note-taking | Rich editor, tagging, search |
| **Calendar** | Calendar and scheduling | Event management, time blocking |

Each built-in space includes a pre-configured AI agent optimized for that workflow.

## Space File Structure

A space directory follows this structure:

```
my-space/
├── space.json                    # Space manifest (metadata)
│
├── pages/                        # Space pages (Vue components)
│   ├── index.vue                 # Landing/default page
│   ├── details.vue               # Detail view page
│   └── ...
│
├── components/                   # Reusable components
│   ├── Header.vue
│   ├── ItemCard.vue
│   └── ...
│
├── composables/                  # Reusable logic
│   ├── useMyFeature.ts
│   ├── useData.ts
│   └── ...
│
├── stores/                       # Pinia stores
│   ├── myStore.ts
│   └── ...
│
├── lib/                          # Utilities and helpers
│   ├── constants.ts
│   ├── types.ts
│   └── ...
│
├── agent/                        # AI agent configuration
│   ├── config.md                 # Agent config (YAML + templates)
│   ├── tools/                    # Custom tool definitions
│   │   ├── analyzeTool.md
│   │   ├── transformTool.md
│   │   └── ...
│   └── hooks/                    # Safety hooks
│       └── safety.json           # Pre/post execution checks
│
├── assets/                       # Images, icons, static files
│   ├── icon.svg                  # Space icon for sidebar
│   └── ...
│
└── styles/                       # Theme overrides (optional)
    └── theme.css
```

## Space Manifest (space.json)

The manifest declares the space to the Construct shell:

```json
{
  "id": "my-space",
  "name": "My Space",
  "description": "A custom space for specific workflows",
  "version": "1.0.0",
  "author": "Your Name",

  "icon": "assets/icon.svg",
  "color": "#3B82F6",

  "pages": [
    {
      "id": "index",
      "path": "/",
      "title": "Home",
      "component": "pages/index.vue"
    },
    {
      "id": "details",
      "path": "/details",
      "title": "Details",
      "component": "pages/details.vue"
    }
  ],

  "agent": {
    "enabled": true,
    "configPath": "agent/config.md"
  },

  "scope": ["project", "company"],

  "dependencies": {
    "@construct-space/ui": "^1.0.0",
    "@construct-space/sdk": "^1.0.0"
  },

  "marketplace": {
    "publishable": true,
    "category": "productivity"
  }
}
```

**Fields:**

- **id:** Unique identifier for the space
- **name:** Display name in the UI
- **description:** One-line description
- **version:** Semantic version
- **icon:** Path to SVG icon (shown in sidebar)
- **color:** Brand color for the space
- **pages:** Array of page definitions with routes
- **agent:** Agent configuration (enabled/disabled, path to config.md)
- **scope:** Where the space operates (project-scoped or company-scoped)
- **dependencies:** Npm packages required
- **marketplace:** Publishing settings for the Construct marketplace

## Teleporting Content into the Shell

Spaces don't run in isolation; they can teleport content into the main shell interface:

```vue
<script setup>
import { useTeleport } from '@construct-space/sdk'

const { teleportSidebar, teleportToolbar } = useTeleport()

// Add a button to the toolbar
teleportToolbar({
  label: 'My Action',
  icon: 'IconName',
  action: () => { /* handle click */ }
})

// Add items to the sidebar menu
teleportSidebar({
  items: [
    { label: 'Pinned Item', icon: 'Pin' },
    { label: 'Settings', icon: 'Gear' }
  ]
})
</script>
```

This allows spaces to extend the shell's chrome without modifying core code.

## Agent Configuration (agent/config.md)

Each space can have an AI agent configured with:

```markdown
---
model: claude-3-5-sonnet-20241022
temperature: 0.7
maxIterations: 25
provider: anthropic
canSpawn: false
---

You are an expert code reviewer. Your role is to:

1. Analyze code for quality and correctness
2. Suggest improvements
3. Point out potential bugs

When reviewing, focus on:
- Readability and maintainability
- Performance implications
- Security concerns
- Test coverage

Available tools: read, write, edit, bash, grep, glob
```

**YAML Frontmatter:**

- **model:** LLM to use (defaults to configured provider model)
- **temperature:** Creativity (0.0-1.0, default 0.7)
- **maxIterations:** Max reasoning loops (default 25)
- **provider:** LLM provider (anthropic, openai, deepseek, ollama)
- **canSpawn:** Allow spawning sub-agents (default false)

**Body:** System prompt written in markdown. Use Handlebars templates to insert variables:

```markdown
You are analyzing the project at {{projectPath}}.
The current file is {{currentFile}}.
User context: {{userContext}}
```

## Custom Tools (agent/tools/)

Define custom tools as markdown files:

```markdown
# analyzeCode

Analyze code for quality and issues.

## Parameters

- **filePath** (string, required): Path to the file to analyze
- **checkType** (string, optional): Type of check (security, performance, style)

## Description

This tool analyzes the given file for common issues and provides suggestions.

## Example

```
analyzeCode(filePath="/src/index.ts", checkType="security")
```

## Implementation

The tool executes bash commands to analyze the code.
```

**Tool Registration:**

Tools are registered in the agent config:

```markdown
---
tools:
  - id: analyzeCode
    path: tools/analyzeCode.md
    enabled: true
  - id: transformCode
    path: tools/transformCode.md
    enabled: true
---
```

## Safety Hooks (agent/hooks/safety.json)

Define pre/post execution safety checks:

```json
{
  "preToolExecution": [
    {
      "toolId": "*",
      "check": "confirm_user",
      "message": "The agent wants to execute {toolName}. Allow?"
    },
    {
      "toolId": "bash",
      "check": "dangerous_command",
      "patterns": ["rm -rf", "sudo", "chmod 777"]
    }
  ],
  "postToolExecution": [
    {
      "toolId": "*",
      "check": "validate_output",
      "rules": [
        "output must be under 10000 characters",
        "output must be valid JSON (if expected)"
      ]
    }
  ]
}
```

**Hook Types:**

- **confirm_user:** Require explicit user approval before tool execution
- **dangerous_command:** Detect and block suspicious commands
- **validate_output:** Validate tool output matches expected format
- **rate_limit:** Limit tool execution frequency

## Scope: Project vs. Company

Spaces can operate at different scopes:

**Project Scope:**
- Specific to the active project
- Access project files and context
- Isolated state per project

**Company Scope:**
- Available across all projects
- Shared state and data
- Global context

```json
{
  "scope": ["project"]  // Only project scope
}
```

Or:

```json
{
  "scope": ["project", "company"]  // Both scopes
}
```

## Distribution

### Marketplace Distribution

Publish your space to the Construct marketplace:

1. Ensure `space.json` has `marketplace.publishable: true`
2. Create a `README.md` with usage instructions
3. Add screenshots and demo GIFs
4. Submit to the marketplace (process TBD)
5. Once approved, space is discoverable in Construct's marketplace

Users can install via: Settings → Spaces → Marketplace → Search → Install

### Private Installation

Install a space locally without publishing:

1. Clone or download the space directory
2. Place in `~/Library/Application Support/Construct/spaces/` (macOS)
3. Restart Construct
4. Space appears in the sidebar

Or programmatically:

```typescript
import { useSpaces } from '@construct-space/sdk'

const { installSpace } = useSpaces()
await installSpace({
  source: 'local',
  path: '/path/to/space'
})
```

## Building a Custom Space

See the [Building a Space](/guide/building-a-space) guide for a step-by-step tutorial on creating your first space.

## Space Lifecycle

1. **Discovery:** Space is discovered from `spaces/` directory or marketplace
2. **Load:** `space.json` is parsed and validated
3. **Initialize:** Vue components are registered, stores initialized
4. **Mount:** Space pages are rendered in the main interface
5. **Agent Init:** Space agent is initialized with tools and config
6. **Ready:** Space is fully functional and interactive

## Space Communication

Spaces communicate with the shell and each other through the SDK:

```typescript
import {
  useSpaceContext,
  useHost,
  useBroadcast
} from '@construct-space/sdk'

// Get current space context
const { spaceId, projectId, scope } = useSpaceContext()

// Communicate with shell
const { sendToHost, onHostMessage } = useHost()
sendToHost({ action: 'notify', message: 'Done!' })

// Broadcast between spaces
const { broadcast, onBroadcast } = useBroadcast()
broadcast({ type: 'file_changed', path: '/src/index.ts' })
onBroadcast((message) => {
  if (message.type === 'file_changed') {
    console.log('File changed:', message.path)
  }
})
```

## Best Practices

1. **Keep spaces focused:** Each space should do one thing well
2. **Use shared UI:** Import from `@construct-space/ui` for consistency
3. **Test your tools:** Thoroughly test custom tools before publishing
4. **Document thoroughly:** Include README with screenshots and examples
5. **Version carefully:** Use semantic versioning and maintain changelog
6. **Consider accessibility:** Ensure keyboard navigation and screen reader support
7. **Handle errors gracefully:** Provide helpful error messages to users
8. **Optimize performance:** Lazy-load heavy components and data

## Next Steps

- [Building a Space](/guide/building-a-space) — Step-by-step space creation tutorial
- [Agents and Tools](/guide/agents-and-tools) — Deep dive into agent configuration
- `@construct-space/sdk` API reference — SDK documentation
- `@construct-space/ui` component library — Reusable UI components
