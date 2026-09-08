# UI Library (@construct-space/ui)

The Construct UI library provides 60+ reusable Vue 3 components and 15+ composables. Published on npm as `@construct-space/ui`, it's the shared design system used by both the main frontend and all spaces. Source lives in `packages/ui/`.

## Installation

Spaces install it as a dependency:
```bash
bun add @construct-space/ui
```

In the main frontend, components are auto-imported — just use them directly in templates.

## Components

### Form & Input
| Component | Description |
|-----------|-------------|
| `Button` | Primary action button with variants (primary, secondary, ghost, danger, icon, sm, lg) |
| `Input` | Text input field |
| `Textarea` | Multi-line text input |
| `Checkbox` | Checkbox with label |
| `Switch` | Toggle switch |
| `RadioGroup` | Radio button group |
| `ToggleGroup` | Toggle button group |
| `Select` | Single select dropdown |
| `MultiSelect` | Multi-select dropdown |
| `Autocomplete` | Searchable select |
| `DatePicker` | Date selection |
| `Calendar` | Calendar widget |
| `ColorPicker` | Color selection |
| `Slider` | Range slider |
| `FileInput` | File upload input |
| `FormField` | Form field wrapper with label/error |

### Layout
| Component | Description |
|-----------|-------------|
| `Card` | Content card with header/body/footer slots |
| `DashboardPanel` | Dashboard widget container |
| `Accordion` | Collapsible sections |
| `Drawer` | Side drawer panel |
| `Slideover` | Slide-over panel |
| `Modal` | Dialog modal |
| `ConfirmationModal` | Confirm/cancel dialog |
| `Popover` | Floating popover |
| `SplitPane` | Resizable split layout |
| `PanelSection` | Section within a panel |
| `GroupLayout` | Group layout container |

### Data Display
| Component | Description |
|-----------|-------------|
| `Table` | Data table |
| `Tree` | Tree view |
| `Timeline` | Timeline display |
| `Badge` | Status badge |
| `Chip` | Tag/chip |
| `Avatar` | User avatar |
| `Icon` | Icon renderer (Lucide icons) |
| `Breadcrumbs` | Navigation breadcrumbs |
| `Pagination` | Page navigation |
| `Progress` | Progress bar |
| `Skeleton` | Loading skeleton |
| `Empty` | Empty state placeholder |

### Overlays & Feedback
| Component | Description |
|-----------|-------------|
| `ContextMenu` | Right-click context menu |
| `Dropdown` | Dropdown menu |
| `DropdownMenu` | Extended dropdown menu |
| `SelectMenu` | Selection menu |
| `Notification` | Toast notifications |
| `Alert` | Alert banner |
| `Tooltip` | Hover tooltip |

### Utility
| Component | Description |
|-----------|-------------|
| `Kbd` | Keyboard shortcut display |
| `Separator` | Visual separator |
| `ScrollArea` | Custom scrollable area |

## UI Composables

| Composable | Purpose |
|------------|---------|
| `useAsync()` | Async state management |
| `useAuth()` | Authentication context |
| `useClickOutside()` | Click-outside detection |
| `useClipboard()` | Clipboard operations |
| `useDebounce()` | Debounce utility |
| `useFormValidation()` | Form validation helpers |
| `useIntersectionObserver()` | Visibility tracking |
| `useKeyboard()` | Keyboard event handling |
| `useLocalStorage()` | Persistent local storage |
| `useMediaQuery()` | Responsive media queries |
| `useNotification()` | Toast notification management |
| `useSearch()` | Search/filter logic |
| `useTheme()` | Theme management (14 built-in presets) |
| `useToggle()` | Boolean state toggle |

## CSS Variables & Theming

All theming is driven by CSS custom properties defined in `packages/ui/src/tokens/tokens.css`. Every component references these variables — never hardcoded colors.

### Core Variables (Light Mode)

```css
:root {
  /* Core colors */
  --app-background: #ffffff;          /* Main background */
  --app-foreground: #1e293b;          /* Primary text */
  --app-muted: #94a3b8;              /* Secondary/muted text */
  --app-accent: #FF2D55;             /* Primary accent (action color) */
  --app-accent-hover: #ff1744;       /* Accent hover state */
  --app-accent-foreground: #ffffff;  /* Text on accent backgrounds */
  --app-border: #e2e8f0;            /* Border color */

  /* Surface colors */
  --app-canvas-bg: #f1f5f9;         /* Canvas/panel background */
  --app-status-bg: #f8fafc;         /* Status/info background */
  --app-card-bg: #ffffff;           /* Card background */
  --app-card-hover: #f8fafc;        /* Card hover state */
  --app-input-bg: #ffffff;          /* Input field background */

  /* Semantic colors */
  --green: #22c55e;                  /* Success */
  --green-bg: rgba(34, 197, 94, 0.1);
  --red: #ef4444;                    /* Error/danger */
  --red-bg: rgba(239, 68, 68, 0.1);
  --yellow: #eab308;                 /* Warning */

  /* Tokens */
  --radius: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --font-sans: 'Rubik', ui-sans-serif, system-ui, sans-serif;
}
```

### Dark Mode

Activated by `.dark` class, `[data-theme="dark"]` attribute, or system `prefers-color-scheme`:

```css
.dark,
:root.dark,
[data-theme="dark"] {
  --app-background: #18181b;
  --app-foreground: #fafafa;
  --app-muted: #71717a;
  --app-accent: #FF2D55;             /* Same accent in dark mode */
  --app-accent-hover: #ff1744;
  --app-accent-foreground: #ffffff;
  --app-border: #27272a;
  --app-canvas-bg: #09090b;
  --app-status-bg: #18181b;
  --app-card-bg: #1e1e22;
  --app-card-hover: #27272b;
  --app-input-bg: #18181b;
}
```

### Tailwind Integration

The frontend maps CSS variables to Tailwind utility classes via `@theme` directives in `main.css`:

```css
@theme inline {
  --color-app-accent: var(--app-accent);
  --color-app-muted: var(--app-muted);
  --color-app-border: var(--app-border);
  --color-app-foreground: var(--app-foreground);
  --color-app-background: var(--app-background);
  --color-app-canvas: var(--app-canvas-bg);
  --color-app-status: var(--app-status-bg);
}

@theme static {
  --font-sans: 'Rubik', ui-sans-serif, system-ui, sans-serif;
}
```

This gives you Tailwind classes that automatically follow the theme:

```html
<!-- These classes resolve to CSS variables at runtime -->
<div class="bg-app-background text-app-foreground border-app-border">
  <button class="bg-app-accent text-app-accent-foreground">
    Action
  </button>
  <p class="text-app-muted">Secondary text</p>
</div>

<!-- Opacity modifiers work too -->
<div class="bg-app-accent/10 border-app-border/30 ring-app-accent/20">
  Tinted background
</div>
```

### Built-in Theme Presets

The `useTheme()` composable provides 14 presets. Each defines background, foreground, muted, accent, and accent-foreground colors:

| ID | Name | Mode | Accent | Background |
|----|------|------|--------|------------|
| `vs` | Light | light | `#E63946` | `#f1f5f9` |
| `vs-dark` | Dark | dark | `#E63946` | `#0f172a` |
| `synthwave-84` | Synthwave '84 | dark | `#ff7edb` | `#262335` |
| `dracula` | Dracula | dark | `#bd93f9` | `#282a36` |
| `one-dark` | One Dark | dark | `#61afef` | `#282c34` |
| `night-owl` | Night Owl | dark | `#82aaff` | `#011627` |
| `github-dark` | GitHub Dark | dark | `#58a6ff` | `#0d1117` |
| `monokai` | Monokai | dark | `#f92672` | `#272822` |
| `nord` | Nord | dark | `#88c0d0` | `#2e3440` |
| `cobalt2` | Cobalt2 | dark | `#ffc600` | `#193549` |
| `material` | Material | dark | `#89ddff` | `#263238` |
| `tokyo-night` | Tokyo Night | dark | `#7aa2f7` | `#1a1b26` |
| `hc-black` | High Contrast Dark | dark | `#ffff00` | `#000000` |
| `hc-light` | High Contrast Light | light | `#0000ff` | `#ffffff` |

Plus `auto` which follows the system preference.

**Setting a theme at runtime:**

```ts
import { useAppTheme } from '@/composables/useAppTheme'

const { setTheme } = useAppTheme()
await setTheme('tokyo-night')   // Apply specific theme
await setTheme('auto')           // Follow system preference
```

Theme preference is stored in `localStorage` under `app-theme-id`.

### Derived Colors

The `useAppTheme` composable automatically derives surface colors from the base background:

```ts
// In dark mode:
--app-border     → background darkened 15%
--app-canvas-bg  → background darkened 30%
--app-status-bg  → same as background

// In light mode:
--app-border     → blended with foreground
--app-canvas-bg  → background lightened 5%
--app-status-bg  → same as background
```

Helper functions: `darkenColor(hex, amount)`, `lightenColor(hex, amount)`, `hexToRgb(hex)`, `rgbToHex(r, g, b)`.

## Utility CSS Classes

The tokens file (`tokens.css`) defines semantic utility classes used across the UI library and app:

### Buttons
```css
.btn                /* Base button */
.btn-primary        /* Accent background */
.btn-secondary      /* Muted background */
.btn-ghost          /* Transparent */
.btn-danger         /* Red/destructive */
.btn-icon           /* Icon-only (square) */
.btn-sm / .btn-lg   /* Size variants */
```

### Cards
```css
.card               /* Bordered container with radius */
.card-header        /* Header with bottom border */
.card-title         /* Title typography */
.card-body          /* Body padding */
.card-hover         /* Hover transition effects */
.glass-card         /* Glassmorphism (backdrop blur) */
```

### Forms
```css
.form-group         /* Field wrapper */
.form-label         /* Label (uppercase, bold, small) */
.form-input         /* Input styling */
.form-row           /* Two-column layout */
```

### Layout
```css
.container          /* Max-width 1200px, horizontal padding */
.page               /* Page wrapper padding */
.page-title         /* Page title typography */
.page-subtitle      /* Page subtitle */
```

### Navigation
```css
.sidebar-link       /* Inactive sidebar link */
.sidebar-link-active /* Active link with accent highlight */
.tabs / .tab        /* Tab container and items */
.tab.active         /* Active tab with accent underline */
```

### Feedback
```css
.spinner            /* Animated loading spinner */
.loading-state      /* Loading container */
.empty-state        /* Empty state display */
.badge              /* Small status label */
```

### Modals
```css
.modal-overlay      /* Fixed overlay with blur backdrop */
.modal              /* Modal container */
.modal-header/title/body/footer
```

### Info Display
```css
.info-grid          /* Responsive info grid */
.info-item          /* Grid item */
.info-label/value   /* Label/value pair */
```

## Component Theming Overrides

The tokens file includes high-specificity overrides for Radix/Reka UI primitives to ensure theme colors apply correctly:

```css
/* Switch/Checkbox checked states use accent */
[data-state="checked"].bg-primary,
button[role="switch"][data-state="checked"] {
  background-color: var(--app-accent) !important;
}

/* Slider uses accent */
[data-radix-slider-range],
[data-radix-slider-thumb] {
  background-color: var(--app-accent) !important;
}

/* Input focus rings use accent */
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  border-color: var(--app-accent) !important;
}

/* Input text follows theme */
input, textarea, select {
  color: var(--app-foreground) !important;
}
input::placeholder {
  color: var(--app-muted) !important;
}
```

## Custom Scrollbar

WebKit scrollbars are styled to match the theme:

```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track {
  background-color: color-mix(in srgb, var(--app-background) 90%, var(--app-muted) 10%);
}
::-webkit-scrollbar-thumb {
  background-color: var(--app-muted);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: var(--app-accent);
}
```

## Usage in Spaces

```vue
<script setup lang="ts">
import { Button, Card, Notification, useNotification } from '@construct-space/ui'

const { add } = useNotification()

function showToast() {
  add({
    title: 'Success',
    description: 'Operation completed.',
    color: 'success',
  })
}
</script>

<template>
  <Card title="My Content">
    <template #body>
      <p>Content here</p>
      <Button label="Action" @click="showToast" />
    </template>
  </Card>
  <Notification />
</template>
```

## Customizing Per-Service

Override `--app-*` variables at `:root` to apply a custom accent across all components:

```css
:root {
  --app-accent: #7c3aed;        /* Purple accent */
  --app-accent-hover: #6d28d9;
}
```

## Layout Components

- `HeaderLayout` — Header + content area
- `SidebarLayout` — Sidebar + content area

These can be used by spaces to create consistent page layouts without rebuilding common patterns.

## Key Files

| File | Purpose |
|------|---------|
| `packages/ui/src/tokens/tokens.css` | CSS variable definitions and utility classes |
| `packages/ui/src/composables/useTheme.ts` | Theme composable with 14 built-in presets |
| `packages/ui/src/index.ts` | Component and composable exports |
| `frontend/assets/css/main.css` | Tailwind `@theme` directives mapping variables |
| `frontend/assets/css/custom.css` | App-specific utility classes |
| `frontend/composables/useAppTheme.ts` | App theme composable (derives colors, syncs Monaco) |
