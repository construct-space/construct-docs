# Data Directory

Construct stores user data, configuration, and application state in a platform-specific data directory. This guide explains the directory structure, conventions, and how to customize the location.

## Platform-Specific Locations

The default data directory varies by platform:

### macOS (Production)

```
~/Library/Application Support/Construct/
```

### macOS (Development)

```
~/Library/Application Support/Construct Dev/
```

The development version uses a separate directory to avoid conflicts with production data.

### Windows

```
%APPDATA%\Construct\
```

Typically expands to:

```
C:\Users\{username}\AppData\Roaming\Construct\
```

### Linux

```
$XDG_DATA_HOME/construct/
```

Or if `XDG_DATA_HOME` is not set:

```
~/.local/share/construct/
```

## Override with Environment Variable

To use a custom data directory, set the `CONSTRUCT_DATA_DIR` environment variable:

```bash
export CONSTRUCT_DATA_DIR=~/custom-construct-data
bun run dev
```

Or on Windows:

```cmd
set CONSTRUCT_DATA_DIR=C:\custom-construct-data
bun run dev
```

This overrides the platform default for all instances of Construct.

## Directory Structure

The data directory is organized as follows:

```
{DATA_DIR}/
├── config/                      # Application configuration
│   ├── auth.json                # OAuth tokens and session info
│   ├── settings.json            # User preferences and settings
│   ├── window-state.json        # Window size, position, maximized state
│   └── providers.json           # LLM provider API keys and config
│
├── state/                       # Application state
│   ├── pinned.json              # Pinned items (projects, spaces, favorites)
│   ├── recent.json              # Recent projects and items
│   ├── theme.json               # Theme preferences (dark/light)
│   └── sidebar.json             # Sidebar state (expanded/collapsed)
│
├── sessions/                    # Agent session data
│   ├── {sessionId}/
│   │   ├── metadata.json        # Session timestamp, space, project
│   │   ├── messages.json        # All messages in session
│   │   └── tools.json           # Tool calls and results
│   └── ...
│
├── chat-sessions/              # Chat history
│   ├── {chatId}/
│   │   ├── config.json          # Chat metadata
│   │   ├── history.json         # Conversation history
│   │   └── attachments/         # Uploaded files
│   └── ...
│
├── spaces/                      # User-installed spaces
│   ├── {space-id}/              # Each space is a directory
│   │   ├── space.json           # Space manifest
│   │   ├── pages/
│   │   ├── components/
│   │   ├── agent/
│   │   └── ...
│   └── ...
│
├── projects/                    # Project configuration
│   ├── {projectId}/
│   │   ├── config.json          # Project metadata
│   │   ├── .construct/          # Project-specific data
│   │   │   ├── agents/          # Project agents config
│   │   │   ├── tools/           # Project tools
│   │   │   └── state.json       # Project state
│   │   └── ...
│   └── ...
│
├── logs/                        # Application logs
│   ├── operator.log             # Operator (Go) process logs
│   ├── frontend.log             # Frontend (Vue) logs
│   ├── tauri.log                # Tauri (shell) logs
│   └── {date}.log               # Dated log files
│
├── telemetry.db                 # SQLite database for telemetry
│
└── cache/                       # Cached data
    ├── http-cache/              # HTTP response cache
    ├── file-cache/              # File metadata cache
    └── ...
```

## Directory Details

### config/ Directory

**auth.json** — OAuth tokens and session information

```json
{
  "accessToken": "sk-...",
  "refreshToken": "sk-...",
  "expiresAt": "2024-12-31T23:59:59Z",
  "userId": "user-123",
  "provider": "anthropic"
}
```

**settings.json** — User preferences

```json
{
  "theme": "dark",
  "fontSize": 14,
  "fontFamily": "Monaco",
  "autoSave": true,
  "autoSaveInterval": 10000,
  "notifications": {
    "enabled": true,
    "sound": false,
    "desktop": true
  },
  "editor": {
    "tabSize": 2,
    "useTabs": false,
    "lineWrapping": true,
    "minimap": true
  },
  "ai": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.7
  }
}
```

**window-state.json** — Desktop window configuration

```json
{
  "width": 1400,
  "height": 900,
  "x": 100,
  "y": 50,
  "maximized": false,
  "fullscreen": false
}
```

**providers.json** — LLM provider configuration

```json
{
  "anthropic": {
    "apiKey": "${ANTHROPIC_API_KEY}",
    "baseUrl": "https://api.anthropic.com"
  },
  "openai": {
    "apiKey": "${OPENAI_API_KEY}",
    "baseUrl": "https://api.openai.com/v1"
  },
  "ollama": {
    "baseUrl": "http://localhost:11434"
  }
}
```

### state/ Directory

Lightweight application state files for quick access:

**pinned.json** — Pinned projects and favorites

```json
{
  "projects": ["proj-123", "proj-456"],
  "spaces": ["code", "chat"],
  "folders": ["/Users/user/work", "/Users/user/projects"]
}
```

**recent.json** — Recently accessed items

```json
{
  "projects": [
    {
      "id": "proj-123",
      "name": "My App",
      "path": "/Users/user/projects/my-app",
      "accessedAt": "2024-03-15T14:30:00Z"
    }
  ],
  "files": [
    {
      "path": "/Users/user/projects/my-app/src/index.ts",
      "projectId": "proj-123",
      "accessedAt": "2024-03-15T14:25:00Z"
    }
  ]
}
```

### sessions/ Directory

Agent session history, one directory per session:

**metadata.json**

```json
{
  "id": "session-abc123",
  "spaceId": "code",
  "projectId": "proj-123",
  "createdAt": "2024-03-15T14:00:00Z",
  "updatedAt": "2024-03-15T14:30:00Z",
  "messageCount": 42,
  "iterationCount": 15
}
```

**messages.json** — All messages in the session

```json
[
  {
    "id": "msg-1",
    "role": "user",
    "content": "Fix this function",
    "timestamp": "2024-03-15T14:00:00Z"
  },
  {
    "id": "msg-2",
    "role": "assistant",
    "content": "I'll analyze the function...",
    "timestamp": "2024-03-15T14:00:05Z",
    "toolCalls": ["msg-2-tool-1"]
  }
]
```

**tools.json** — Tool execution records

```json
[
  {
    "id": "msg-2-tool-1",
    "name": "read",
    "input": { "path": "/src/utils.ts" },
    "output": "function content...",
    "executionTime": 125,
    "status": "success"
  }
]
```

### chat-sessions/ Directory

Chat history separate from agent sessions:

**config.json**

```json
{
  "id": "chat-xyz",
  "name": "Project Planning",
  "createdAt": "2024-03-10T09:00:00Z",
  "archived": false
}
```

**history.json** — Conversation turns

```json
[
  {
    "turn": 1,
    "user": "What files changed?",
    "assistant": "Let me check...",
    "timestamp": "2024-03-15T14:00:00Z"
  }
]
```

### spaces/ Directory

User-installed custom spaces (marketplace or private installs).

Each space directory mirrors the space directory structure:

```
spaces/
├── my-productivity-space/
│   ├── space.json
│   ├── pages/
│   ├── components/
│   ├── agent/
│   └── ...
└── custom-integration/
    ├── space.json
    └── ...
```

### projects/ Directory

Project-specific configuration and state:

**config.json** — Project metadata

```json
{
  "id": "proj-123",
  "name": "My Application",
  "path": "/Users/user/projects/my-app",
  "createdAt": "2024-01-01T00:00:00Z",
  "description": "A web application",
  "type": "web",
  "tags": ["production", "active"]
}
```

**state.json** — Project-specific application state

```json
{
  "lastOpenFile": "/src/index.ts",
  "expandedFolders": ["/src", "/src/components"],
  "pinnedFiles": ["/README.md", "/package.json"],
  "customSettings": {}
}
```

### logs/ Directory

Application logs at various levels:

**operator.log** — Go operator process logs

```
2024-03-15 14:30:00 INFO Starting operator on :60100
2024-03-15 14:30:01 DEBUG Loaded 10 agents
2024-03-15 14:30:02 INFO Ready for connections
```

**frontend.log** — Vue/TypeScript logs

```
2024-03-15 14:30:05 INFO Vue app initialized
2024-03-15 14:30:06 DEBUG Connecting to operator...
2024-03-15 14:30:07 INFO Connected to operator
```

**tauri.log** — Tauri shell and native integration logs

```
2024-03-15 14:30:00 INFO Tauri app started
2024-03-15 14:30:01 INFO Window created
2024-03-15 14:30:02 DEBUG Spawning operator sidecar
```

Logs are typically kept for 30 days and rotated by date.

### telemetry.db

SQLite database storing:
- Feature usage (which spaces, tools, agents used)
- Error and crash reports (if telemetry enabled)
- Performance metrics
- Aggregated usage statistics

**Privacy:** Telemetry is local only and not sent to servers unless explicitly enabled.

## Conventions and Best Practices

### Reading Data

Always check for file existence before reading:

```typescript
import { readFile } from 'fs/promises'
import path from 'path'

const dataDir = process.env.CONSTRUCT_DATA_DIR || DEFAULT_DATA_DIR
const settingsPath = path.join(dataDir, 'config', 'settings.json')

try {
  const data = await readFile(settingsPath, 'utf-8')
  return JSON.parse(data)
} catch (error) {
  // File doesn't exist or is corrupted, return defaults
  return getDefaultSettings()
}
```

### Writing Data

Always use atomic writes to prevent corruption:

```typescript
import { writeFile } from 'fs/promises'
import path from 'path'

const dataDir = process.env.CONSTRUCT_DATA_DIR || DEFAULT_DATA_DIR
const settingsPath = path.join(dataDir, 'config', 'settings.json')

// Write to temp file first
const tempPath = settingsPath + '.tmp'
await writeFile(tempPath, JSON.stringify(settings, null, 2))

// Atomic rename
await rename(tempPath, settingsPath)
```

### Versioning Data

Include version in config files for migrations:

```json
{
  "version": "2.0.0",
  "settings": { ... }
}
```

Then handle migrations when reading:

```typescript
const data = JSON.parse(...)
if (data.version === '1.0.0') {
  data = migrateFromV1(data)
}
```

### Clearing Data

Users can reset Construct by removing the data directory:

```bash
rm -rf ~/Library/Application\ Support/Construct  # macOS
rmdir /s %APPDATA%\Construct                     # Windows
rm -rf ~/.local/share/construct                  # Linux
```

Or set a custom data directory to have multiple independent instances.

## Security Considerations

### API Keys and Tokens

Never commit credentials to git. Store in:
- `config/auth.json` (OAuth tokens)
- `config/providers.json` (API keys)
- Environment variables (preferred for CI/CD)

### File Permissions

The data directory should be readable/writable only by the current user:

```bash
# macOS/Linux
chmod 700 ~/Library/Application\ Support/Construct
chmod 600 ~/Library/Application\ Support/Construct/config/*
```

### Encryption

Currently, files are stored in plaintext. For production, consider:
- Encrypting sensitive files (auth, API keys)
- Using OS keychain for token storage
- At-rest encryption for archived sessions

## Troubleshooting

### "Cannot write to data directory"

```bash
# Check permissions
ls -la ~/Library/Application\ Support/Construct

# Fix ownership
sudo chown -R $(whoami) ~/Library/Application\ Support/Construct

# Make writable
chmod 700 ~/Library/Application\ Support/Construct
```

### Data directory grows too large

1. Clear old sessions: `rm -rf {DATA_DIR}/sessions/{old_id}`
2. Clear logs: `rm {DATA_DIR}/logs/*.log`
3. Clear cache: `rm -rf {DATA_DIR}/cache`
4. Archive chat history: Export and delete old chats

### Corrupted settings.json

1. Rename the file: `mv settings.json settings.json.bak`
2. Restart Construct (creates defaults)
3. Manually restore custom settings if needed

## Next Steps

- Learn about [Spaces](/guide/spaces) and how they store data
- See [Agents and Tools](/guide/agents-and-tools) for session format details
- Read Operator documentation for session persistence details
