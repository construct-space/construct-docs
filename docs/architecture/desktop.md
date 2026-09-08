# Desktop Architecture

The Construct desktop layer provides native system integration, process management, and bridge communication between the frontend and the Go operator sidecar. Built with Tauri 2 and Rust, it enables features like OAuth, shell integration, language server support, and deep system integration.

## Technology Stack

- **Framework**: Tauri 2 with Rust
- **Runtime**: Webview2 (Windows), WKWebView (macOS), WebKit (Linux)
- **IPC Bridge**: Custom protocol on TCP port 60101
- **Process Management**: Sidecar spawning and lifecycle
- **Plugins**: 13+ official Tauri plugins

## Project Structure

```
desktop/
├── src/
│   ├── lib.rs              # Core library
│   ├── main.rs             # Entry point
│   ├── operator.rs         # Go sidecar management
│   ├── bridge.rs           # IPC bridge
│   ├── oauth.rs            # OAuth flow
│   ├── shell.rs            # Shell/PTY integration
│   ├── lsp.rs              # Language server
│   ├── menu.rs             # Menu system
│   └── commands/           # Tauri commands
├── tauri.conf.json         # Tauri configuration
├── tauri.devmode.conf.json # Dev configuration
└── Cargo.toml              # Rust dependencies
```

## Core Components

### lib.rs: Runtime Orchestration

The main library provides the Tauri runtime setup:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Start operator sidecar
      let operator = start_operator(app)?;

      // Initialize bridge
      let bridge = Bridge::new(operator.port);

      // Store operator handle
      app.manage(operator);
      app.manage(bridge);

      // Setup menu
      setup_menu(app)?;

      // Register commands
      register_commands(app);

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

**Responsibilities**:
- Initialize Tauri webview
- Spawn operator sidecar
- Setup IPC bridge
- Register menu and commands
- Manage lifecycle

### operator.rs: Sidecar Management

Handles spawning, monitoring, and communication with the Go operator:

```rust
pub struct OperatorProcess {
  pub process: Child,
  pub port: u16,
  pub pid: u32,
}

pub fn start_operator(app: &AppHandle) -> Result<OperatorProcess> {
  // Get resource path for operator binary
  let operator_path = app
    .path()
    .resource("operator")
    .context("Failed to get operator resource")?;

  // Find available port (60100 default)
  let port = find_available_port(60100)?;

  // Spawn as sidecar
  let (rx, cmd) = tauri::async_runtime::spawn_sidecar(
    "operator",
    &operator_path,
  )?;

  // Start process
  let process = cmd
    .arg(format!("--port={}", port))
    .arg(format!("--data-dir={}", data_dir(app)?))
    .spawn()?;

  // Wait for ready
  wait_for_port(port, Duration::from_secs(5))?;

  Ok(OperatorProcess {
    process,
    port,
    pid: process.id(),
  })
}

pub fn monitor_operator(operator: Arc<Mutex<OperatorProcess>>) {
  tauri::async_runtime::spawn(async move {
    loop {
      let mut op = operator.lock().await;

      if op.process.try_wait().is_ok() {
        // Process exited, restart
        // emit event to frontend
        break;
      }

      drop(op);
      tokio::time::sleep(Duration::from_secs(1)).await;
    }
  });
}
```

**Key Functions**:
- `start_operator()`: Spawn operator sidecar
- `monitor_operator()`: Watch for crashes
- `find_available_port()`: Port allocation
- `shutdown_operator()`: Graceful shutdown

### bridge.rs: IPC Communication

Custom bridge for operator ↔ Tauri communication:

```rust
pub struct Bridge {
  operator_addr: String,
}

impl Bridge {
  pub fn new(port: u16) -> Self {
    Bridge {
      operator_addr: format!("127.0.0.1:{}", port),
    }
  }

  pub async fn forward_request(&self, msg: &str) -> Result<String> {
    let stream = TcpStream::connect(&self.operator_addr)
      .await
      .context("Failed to connect to operator")?;

    let (mut reader, mut writer) = stream.into_split();

    // Send request
    writer.write_all(msg.as_bytes()).await?;
    writer.write_all(b"\n").await?;

    // Read response
    let mut response = String::new();
    reader.read_to_string(&mut response).await?;

    Ok(response)
  }

  pub async fn stream_response(&self, req: Request) -> Result<impl Stream<Item = Result<Event>>> {
    // Open connection
    let stream = TcpStream::connect(&self.operator_addr).await?;

    // Send request
    // Setup channel for streaming
    // Return stream of events

    Ok(event_stream)
  }
}
```

**IPC Protocol**:
- TCP socket on :60101
- JSON request/response
- Streaming support for real-time events
- Error handling and retries

### oauth.rs: Authentication Flow

Desktop-native OAuth implementation:

```rust
pub struct OAuth {
  client_id: String,
  client_secret: String,
  redirect_uri: String,
}

impl OAuth {
  pub async fn start_flow(&self, provider: &str) -> Result<AuthToken> {
    // Get authorization URL
    let auth_url = self.get_auth_url(provider)?;

    // Open system browser
    open::that(&auth_url)?;

    // Start device code polling
    let token = self.poll_for_token(provider).await?;

    // Store in system keychain
    self.store_in_keychain(&token)?;

    Ok(token)
  }

  async fn poll_for_token(&self, provider: &str) -> Result<AuthToken> {
    let mut interval = tokio::time::interval(Duration::from_secs(1));

    loop {
      interval.tick().await;

      // Poll provider for token
      match self.check_token(provider).await {
        Ok(token) => return Ok(token),
        Err(_) => {
          // Continue polling
        }
      }
    }
  }

  fn store_in_keychain(&self, token: &AuthToken) -> Result<()> {
    // Use system keychain (via Tauri plugins)
    // macOS: Keychain
    // Windows: Credential Manager
    // Linux: Secret Service
    Ok(())
  }
}
```

**Features**:
- Browser-based authorization
- Device code flow support
- Keychain/Credential Manager storage
- Automatic token refresh
- PKCE for security

### shell.rs: Terminal Integration

PTY and shell emulation:

```rust
pub struct Shell {
  pty: PtyMaster,
  shell_cmd: String,
}

impl Shell {
  pub fn new() -> Result<Self> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
    let pty = allocate_pty()?;

    Ok(Shell {
      pty,
      shell_cmd: shell,
    })
  }

  pub fn spawn(&mut self) -> Result<()> {
    let slave = self.pty.open_slave()?;

    // Fork and exec shell
    let pid = unsafe { libc::fork() };

    if pid == 0 {
      // Child process
      // Set controlling terminal
      // Execute shell
    } else {
      // Parent process
      // Monitor child
    }

    Ok(())
  }

  pub fn write(&mut self, data: &[u8]) -> Result<()> {
    self.pty.write(data)?;
    Ok(())
  }

  pub fn read(&mut self, buf: &mut [u8]) -> Result<usize> {
    self.pty.read(buf)
  }
}
```

**Features**:
- POSIX PTY allocation
- Shell process spawning
- I/O redirection
- Signal handling
- Window resize support

### lsp.rs: Language Server Integration

Support for language servers and protocol:

```rust
pub struct LSPClient {
  process: Child,
  stdin: ChildStdin,
  stdout: BufReader<ChildStdout>,
  message_id: Arc<AtomicU64>,
}

impl LSPClient {
  pub fn spawn(command: &str, args: &[&str]) -> Result<Self> {
    let mut child = Command::new(command)
      .args(args)
      .stdin(Stdio::piped())
      .stdout(Stdio::piped())
      .stderr(Stdio::inherit())
      .spawn()?;

    let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
    let stdout = BufReader::new(child.stdout.take().ok_or("Failed to get stdout")?);

    Ok(LSPClient {
      process: child,
      stdin,
      stdout,
      message_id: Arc::new(AtomicU64::new(1)),
    })
  }

  pub async fn send_request(&mut self, method: &str, params: serde_json::Value) -> Result<serde_json::Value> {
    let id = self.message_id.fetch_add(1, std::sync::atomic::Ordering::SeqCst);

    let request = json!({
      "jsonrpc": "2.0",
      "id": id,
      "method": method,
      "params": params,
    });

    // Send request with Content-Length header
    self.send_message(&request)?;

    // Read response
    self.read_message().await
  }

  pub async fn send_notification(&mut self, method: &str, params: serde_json::Value) -> Result<()> {
    let notification = json!({
      "jsonrpc": "2.0",
      "method": method,
      "params": params,
    });

    self.send_message(&notification)
  }
}
```

**Features**:
- LSP 3.17 support
- Multiple language servers
- Code completion
- Diagnostics
- Go-to-definition
- Hover information

### menu.rs: Application Menu

System menu setup (especially macOS):

```rust
pub fn setup_menu(app: &AppHandle) -> Result<()> {
  let quit = CustomMenuItem::new("quit", "Quit Construct");
  let close = CustomMenuItem::new("close", "Close Window");
  let preferences = CustomMenuItem::new("preferences", "Preferences");

  let menu = Menu::new()
    .add_native_item(MenuItem::AppMenu(
      Menu::new()
        .add_item(preferences)
        .add_native_item(MenuItem::Separator)
        .add_item(quit),
    ))
    .add_native_item(MenuItem::EditMenu)
    .add_native_item(MenuItem::ViewMenu)
    .add_native_item(MenuItem::WindowMenu)
    .add_native_item(MenuItem::HelpMenu);

  let handle = app.handle();
  app.set_menu(menu)?;

  app.on_menu_event(move |event| {
    match event.menu_item_id() {
      "quit" => {
        handle.exit(0);
      }
      "preferences" => {
        // Open preferences window
      }
      _ => {}
    }
  });

  Ok(())
}
```

**macOS Features**:
- Native application menu
- Dock integration
- Spotlight search
- Continuity support

## Tauri Plugins

13+ plugins provide extended functionality:

### Core Plugins

**clipboard**: Copy/paste operations
```rust
#[tauri::command]
fn copy_to_clipboard(text: String) -> Result<()> {
  clipboard::copy(text)?;
  Ok(())
}
```

**dialog**: File/folder selection and messages
```rust
#[tauri::command]
async fn pick_file() -> Result<Option<PathBuf>> {
  let file = FileDialogBuilder::new()
    .pick_file()
    .await;
  Ok(file)
}
```

**fs**: File system operations
```rust
#[tauri::command]
async fn read_file(path: String) -> Result<String> {
  let contents = tauri::api::fs::read_to_string(&path).await?;
  Ok(contents)
}
```

**shell**: Execute shell commands
```rust
#[tauri::command]
async fn run_command(cmd: String, args: Vec<String>) -> Result<String> {
  let output = Command::new(&cmd)
    .args(&args)
    .output()?;
  Ok(String::from_utf8(output.stdout)?)
}
```

**process**: Process management
```rust
#[tauri::command]
fn get_processes() -> Result<Vec<ProcessInfo>> {
  let processes = sysinfo::System::new_all()
    .processes()
    .iter()
    .map(|p| ProcessInfo { ... })
    .collect();
  Ok(processes)
}
```

### Additional Plugins

- **global-shortcut**: Keyboard shortcut registration
- **log**: Application logging
- **store**: Persistent key-value storage
- **window-state**: Window position/size persistence
- **updater**: Application auto-updates
- **sql**: SQLite database access
- **deep-link**: Custom protocol handler
- **os**: OS information

## Configuration

### tauri.conf.json

Main configuration file:

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173",
    "frontendDist": "../frontend/dist"
  },
  "app": {
    "windows": [
      {
        "title": "Construct",
        "width": 1400,
        "height": 900,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "focus": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["deb", "dmg", "msi"],
    "identifier": "com.construct.app"
  }
}
```

### tauri.devmode.conf.json

Development-specific configuration:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173"
  },
  "app": {
    "windows": [
      {
        "title": "Construct (dev)",
        "width": 1400,
        "height": 900,
        "decorations": true
      }
    ]
  }
}
```

## Commands (IPC)

Rust commands exported to JavaScript frontend:

```rust
#[tauri::command]
async fn load_project(path: String) -> Result<Project> {
  // Load project from path
  let project = Project::load(&path)?;
  Ok(project)
}

#[tauri::command]
async fn save_file(path: String, content: String) -> Result<()> {
  tokio::fs::write(&path, content).await?;
  Ok(())
}

#[tauri::command]
fn get_platform() -> String {
  if cfg!(target_os = "macos") {
    "macos".to_string()
  } else if cfg!(target_os = "windows") {
    "windows".to_string()
  } else {
    "linux".to_string()
  }
}
```

**Invocation from Frontend**:
```typescript
import { invoke } from '@tauri-apps/api/tauri'

const project = await invoke('load_project', { path: '/path/to/project' })
```

## Events

Tauri events for async communication:

```rust
// Emit from Rust
app.emit_all("operator-ready", json!({
  "port": 60100,
  "pid": 1234,
}))?;

// Emit from Rust to specific window
window.emit("file-changed", json!({
  "path": "/path/to/file",
}))?;
```

**Listening from Frontend**:
```typescript
import { listen } from '@tauri-apps/api/event'

const unlisten = await listen('operator-ready', (event) => {
  console.log('Operator ready on port', event.payload.port)
})
```

## Window Management

Multi-window support with state persistence:

```rust
pub fn create_new_window(app: &AppHandle, label: &str) -> Result<()> {
  tauri::WindowBuilder::new(app, label, Default::default())
    .title("New Window")
    .width(1200)
    .height(800)
    .build()?;

  Ok(())
}
```

**Features**:
- Multiple window support
- Per-window state
- Position/size persistence
- IPC between windows
- Parent-child relationships

## Security

### Content Security Policy

Strict CSP prevents inline script injection:

```
default-src 'self'
img-src 'self' https:
style-src 'self' 'unsafe-inline'
script-src 'self' 'unsafe-eval'
```

### Tauri Security

- Process isolation
- Webview sandbox
- Plugin validation
- Message validation
- CORS enforcement

### OAuth Security

- PKCE code challenge
- State validation
- Secure token storage (keychain)
- Automatic token refresh
- Revocation support

## Build and Distribution

### Local Development

```bash
npm run tauri dev
```

Runs with dev mode configuration, hot reload enabled.

### Production Build

```bash
npm run tauri build
```

Creates:
- macOS: `.app` bundle + `.dmg` installer
- Windows: `.msi` installer
- Linux: `.deb` package

### Code Signing

Configuration in tauri.conf.json:

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: ...",
      "providerShortTeamId": "...",
      "entitlements": "..."
    }
  }
}
```

### Auto-Updates

Tauri updater plugin checks for updates:

```rust
tauri::updater::builder(app)
  .should_install(|version, latest| {
    version < latest
  })
  .perform_install(|version, steps, cb| {
    // Install logic
  })
  .build()?
```

## Performance Considerations

- **Lazy Loading**: Components and routes loaded on demand
- **Virtual Scrolling**: For long lists
- **Web Workers**: For heavy computations
- **Memoization**: Computed properties and effects
- **Streaming**: Real-time updates via TCP
