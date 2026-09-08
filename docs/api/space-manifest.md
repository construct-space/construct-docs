# Space Manifest Reference

The space manifest (`space.manifest.json`) defines the structure, navigation, and configuration for a Construct space. It tells the shell how to render UI, organize content, and expose tools.

## Manifest Location

```
spaces/my-space/
  space.manifest.json
  space.config.ts
  agent/
    config.md
  pages/
    index.md
    settings.md
```

## Full JSON Schema

```json
{
  "id": "my-space",
  "name": "My Awesome Space",
  "version": "1.0.0",
  "description": "A space for building amazing things",
  "icon": "rocket",
  "scope": "project",
  "navigation": [
    {
      "label": "Dashboard",
      "icon": "home",
      "to": "/",
      "order": 0
    },
    {
      "label": "Components",
      "icon": "box",
      "to": "/components",
      "order": 1
    }
  ],
  "pages": [
    {
      "path": "index",
      "label": "Dashboard",
      "default": true,
      "toolbar": [
        {
          "id": "refresh",
          "icon": "refresh",
          "label": "Refresh",
          "action": "reload"
        }
      ]
    },
    {
      "path": "components",
      "label": "Components",
      "toolbar": []
    }
  ],
  "tools": [
    {
      "id": "generate",
      "name": "Generate Component",
      "description": "Generate a new component",
      "icon": "plus",
      "command": "scripts/generate.sh"
    }
  ],
  "theme": {
    "color": "#8b5cf6",
    "bg": "#f8fafc"
  }
}
```

## Field Reference

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier (kebab-case). Used internally for routing. |
| `name` | string | yes | Human-readable display name. Shown in UI. |
| `version` | string | yes | Semantic version for the space (e.g., "1.0.0"). |
| `description` | string | no | Brief description of the space's purpose. |
| `icon` | string | no | Icon identifier for the space (e.g., "rocket", "settings"). |
| `scope` | "project" \| "company" \| "both" | no | Whether space is project-scoped, company-scoped, or both. Default: "project". |
| `navigation` | NavItem[] | no | Top-level navigation items for the space. |
| `pages` | PageDefinition[] | yes | Page definitions for the space. |
| `tools` | ToolDefinition[] | no | CLI tools exposed by the space. |
| `theme` | ThemeConfig | no | Theme colors and styling. |

### scope

Determines when the space is available:

- **"project"**: Only visible when a project is open
- **"company"**: Visible at company/workspace level, no project required
- **"both"**: Available in both project and company contexts

### navigation

Navigation items appear in the sidebar:

```typescript
interface NavItem {
  label: string;      // Display text
  icon?: string;      // Icon identifier
  to: string;         // Route path (relative to space root)
  order?: number;     // Sort order (ascending)
  children?: NavItem[]; // Nested nav items (recursive)
}
```

### pages

Page definitions map file paths to UI pages:

```typescript
interface PageDefinition {
  path: string;              // Relative file path (no extension)
  label: string;             // Display name in navigation
  default?: boolean;         // Is this the default/home page?
  toolbar?: ToolbarItem[];   // Page-specific toolbar items
  breadcrumb?: boolean;      // Show in breadcrumb (default: true)
  layout?: "split" | "full"; // Layout type (default: "full")
}
```

**Example**:
```json
{
  "path": "docs/getting-started",
  "label": "Getting Started",
  "toolbar": [
    {
      "id": "pdf-export",
      "icon": "download",
      "label": "Export as PDF",
      "action": "export_pdf"
    }
  ]
}
```

### toolbar

Toolbar items appear in the page's action bar:

```typescript
interface ToolbarItem {
  id: string;            // Unique identifier for the item
  icon: string;          // Icon to display
  label?: string;        // Tooltip or label text
  action?: string;       // Action to perform:
                         //   - "reload" (refresh page)
                         //   - "export_pdf" (download as PDF)
                         //   - "copy" (copy content to clipboard)
                         //   - "search" (open search)
                         //   - Custom: invokes a tool
  tool?: string;         // If action is a tool, tool ID to invoke
  confirm?: string;      // Confirmation message before action
  group?: string;        // Toolbar group for organization
}
```

**Standard actions:**
- `reload`: Refresh the current page
- `export_pdf`: Export page content to PDF
- `copy`: Copy page content to clipboard
- `search`: Open search overlay
- Custom: If neither matches, treated as a tool ID

### tools

Tools are commands available via space CLI:

```typescript
interface ToolDefinition {
  id: string;                  // Unique tool identifier
  name: string;                // Display name
  description?: string;        // Help text
  icon?: string;               // Icon identifier
  command: string;             // Shell command to run
  parameters?: Parameter[];    // Input parameters
  confirm?: boolean;           // Require confirmation
}

interface Parameter {
  name: string;
  type: "string" | "number" | "boolean";
  description?: string;
  required?: boolean;
  enum?: string[];
}
```

**Example**:
```json
{
  "id": "lint",
  "name": "Lint Code",
  "description": "Run linter on source files",
  "icon": "checkmark",
  "command": "npm run lint",
  "confirm": false
}
```

### theme

Customization for space appearance:

```typescript
interface ThemeConfig {
  color?: string;     // Primary color (hex, rgb, or name)
  bg?: string;        // Background color
  accent?: string;    // Accent color for interactive elements
  text?: string;      // Text color
}
```

**Example**:
```json
{
  "color": "#8b5cf6",
  "bg": "#f8fafc",
  "accent": "#ec4899",
  "text": "#1e293b"
}
```

## Manifest Resolution

When a space loads, the shell:

1. Reads `space.manifest.json`
2. Validates required fields
3. Builds navigation from `navigation` array
4. Maps page paths to components from `pages` array
5. Registers tools from `tools` array
6. Applies theme from `theme` object
7. Registers agents from `agent/config.md` files
8. Loads hooks from `agent/hooks/` directory

If the manifest is invalid, the space fails to load with a clear error message.

## space.config.ts

The space config is a TypeScript file for programmatic configuration and runtime behavior:

```typescript
// space.config.ts
import type { SpaceConfig } from "@construct-space/sdk";

export default {
  id: "my-space",
  name: "My Space",

  // Default AI model for this space
  model: "claude-3-5-sonnet-20241022",

  // Which agents are available
  agents: ["architect", "tester"],

  // Runtime initialization
  async setup(runtime) {
    // Load dynamic content
    const agents = await runtime.loadAgents();

    // Register hooks
    await runtime.onPreTool("bash", (input) => {
      // Validate tool input
      return input;
    });
  },

  // Custom page loader
  async loadPage(path) {
    // Can fetch from API, CMS, etc.
    return {
      content: "...",
      metadata: {}
    };
  }
} satisfies SpaceConfig;
```

### SpaceConfig Interface

```typescript
interface SpaceConfig {
  id: string;
  name: string;
  model?: string;                    // Default LLM model
  agents?: string[];                 // Available agent IDs
  setup?: (runtime: SpaceRuntime) => Promise<void>;
  loadPage?: (path: string) => Promise<PageContent>;
  beforeToolCall?: (tool: ToolCall) => Promise<ToolCall>;
  afterToolResult?: (result: ToolResult) => Promise<ToolResult>;
}

interface SpaceRuntime {
  loadAgents(): Promise<Agent[]>;
  onPreTool(name: string, handler: (input) => any): void;
  onPostTool(name: string, handler: (result) => any): void;
}
```

## Manifest Example: Blog Space

```json
{
  "id": "blog",
  "name": "Blog Engine",
  "version": "2.1.0",
  "description": "Publish and manage blog posts",
  "icon": "newspaper",
  "scope": "company",
  "navigation": [
    {
      "label": "Posts",
      "icon": "book",
      "to": "/posts"
    },
    {
      "label": "Drafts",
      "icon": "edit",
      "to": "/drafts"
    },
    {
      "label": "Analytics",
      "icon": "bar-chart",
      "to": "/analytics"
    }
  ],
  "pages": [
    {
      "path": "posts",
      "label": "Published Posts",
      "default": true,
      "toolbar": [
        {
          "id": "new-post",
          "icon": "plus",
          "label": "New Post",
          "action": "new_post"
        },
        {
          "id": "export",
          "icon": "download",
          "label": "Export",
          "action": "export_pdf"
        }
      ]
    },
    {
      "path": "drafts",
      "label": "Draft Posts",
      "toolbar": [
        {
          "id": "publish",
          "icon": "send",
          "label": "Publish Selected",
          "action": "publish_drafts",
          "confirm": "Publish selected drafts?"
        }
      ]
    },
    {
      "path": "analytics",
      "label": "Analytics",
      "toolbar": [
        {
          "id": "refresh",
          "icon": "refresh",
          "label": "Refresh",
          "action": "reload"
        }
      ]
    }
  ],
  "tools": [
    {
      "id": "new-post",
      "name": "Create New Post",
      "description": "Create and initialize a new blog post",
      "icon": "plus",
      "command": "scripts/new-post.sh",
      "parameters": [
        {
          "name": "title",
          "type": "string",
          "description": "Post title",
          "required": true
        },
        {
          "name": "category",
          "type": "string",
          "description": "Post category",
          "enum": ["engineering", "design", "business", "culture"]
        }
      ]
    }
  ],
  "theme": {
    "color": "#2563eb",
    "bg": "#ffffff"
  }
}
```

## Production: Spaces as IIFE Bundles

In production, spaces are bundled as Immediately-Invoked Function Expressions (IIFE):

```typescript
// dist/space-bundle.js
(function() {
  const manifest = { /* ... */ };
  const config = { /* ... */ };
  const pages = { /* ... */ };

  // Register in window
  window.__CONSTRUCT_SPACE__ = {
    manifest,
    config,
    pages
  };
})();
```

The shell loads the bundle and extracts the space configuration at runtime. This allows:

- Efficient code splitting
- Lazy loading of space modules
- Isolation from other spaces
- Easy deployment and versioning

Build tools (Vite, Webpack) automatically handle IIFE generation during the build process.

## Loading and Error Handling

The shell handles manifest loading with:

1. **File reading**: Fetch `space.manifest.json`
2. **Validation**: Validate against JSON schema
3. **Loading**: Load referenced files (agent configs, pages)
4. **Registration**: Register space in shell
5. **Error handling**: Clear messages for missing files or invalid schemas

Common errors:

- `MANIFEST_NOT_FOUND`: `space.manifest.json` doesn't exist
- `INVALID_MANIFEST`: JSON is malformed or missing required fields
- `AGENT_NOT_FOUND`: Referenced agent in config doesn't exist
- `PAGE_NOT_FOUND`: Referenced page path doesn't exist
- `THEME_INVALID`: Theme colors are not valid CSS color values

## Best Practices

1. **Keep manifest lean**: Move complex logic to `space.config.ts`
2. **Use consistent naming**: Kebab-case for IDs, Title Case for labels
3. **Order navigation logically**: Group related items, use `order` field
4. **Document descriptions**: Help users understand space purpose
5. **Test manifest validation**: Validate before deployment
6. **Use appropriate scope**: Don't expose company tools in project spaces
7. **Customize themes**: Use theme colors that match your brand
8. **Default page**: Always set one page as `default: true`
