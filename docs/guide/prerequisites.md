# Prerequisites

Before you can build and run Construct, you'll need to install several tools and dependencies. This guide walks you through each one with platform-specific instructions.

## Required Tools

### Node.js 20+

**Why:** JavaScript runtime for frontend build tools and scripts.

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node@20

# Or using nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
```

**Windows:**
```bash
# Using Chocolatey
choco install nodejs --version=20.0.0

# Or download from nodejs.org
# https://nodejs.org/en/download/
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify:**
```bash
node --version  # Should be v20.x.x or higher
```

### Bun (Package Manager)

**Why:** Fast JavaScript package manager and runtime used for building Construct.

**macOS & Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows:**
```bash
# Using Powershell
powershell -c "$(curl -fsSL https://bun.sh/install.ps1)"

# Or using Scoop
scoop install bun
```

**Verify:**
```bash
bun --version  # Should be 1.x.x or higher
```

### Rust & Cargo

**Why:** Required for building the native Tauri 2 desktop shell.

**All Platforms:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**macOS:**
```bash
# Using Homebrew
brew install rust
```

**Windows:**
- Download from https://www.rust-lang.org/tools/install
- Or use `scoop install rustup`

**Verify:**
```bash
rustc --version  # Should be stable (e.g., rustc 1.75.0)
cargo --version  # Should be 1.75.0 or higher
```

### Go 1.23+

**Why:** Programming language for the Operator backend (AI engine).

**macOS:**
```bash
# Using Homebrew
brew install go@1.23

# If you have an older version
brew upgrade go
```

**Windows:**
```bash
# Using Chocolatey
choco install golang --version=1.23.0

# Or download from golang.org
# https://golang.org/dl/
```

**Linux (Ubuntu/Debian):**
```bash
# Remove any existing Go installation
sudo rm -rf /usr/local/go

# Download and install
wget https://go.dev/dl/go1.23.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH=$PATH:/usr/local/go/bin
```

**Verify:**
```bash
go version  # Should be go version go1.23 or higher
```

### Tauri CLI 2.x

**Why:** Build tool for compiling the native Tauri 2 application.

**All Platforms:**
```bash
# Install via bun (preferred)
bun install --global @tauri-apps/cli@2

# Or via npm if you prefer
npm install --global @tauri-apps/cli@2
```

**Verify:**
```bash
tauri --version  # Should be 2.x.x or higher
```

## Recommended Tools

### Visual Studio Code

**Why:** Excellent editor with Vue, Go, and Rust support via extensions.

**Download:** https://code.visualstudio.com/

**Recommended Extensions:**
- **Volar** (Maintainer: johnsoncodehk) — Vue 3 support
- **Go** (Maintainer: golang) — Go language support
- **rust-analyzer** (Maintainer: Rust) — Rust language support
- **Prettier** — Code formatter
- **ESLint** — JavaScript linting
- **Thunder Client** or **REST Client** — API testing

### GitHub CLI

**Why:** Streamlined git workflow, useful for managing issues and PRs.

**macOS:**
```bash
brew install gh
```

**Windows:**
```bash
choco install gh
# Or download from https://github.com/cli/cli/releases
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install gh

# Fedora
sudo dnf install gh
```

**Verify:**
```bash
gh --version
```

## Platform-Specific Notes

### macOS (Primary Platform)

Construct is primarily developed on macOS. All features are fully tested on Intel and Apple Silicon.

**Additional Requirements:**
- **Xcode Command Line Tools** (may be prompted to install)
  ```bash
  xcode-select --install
  ```
- **macOS 11.0+** recommended

**Apple Silicon (M1/M2/M3):**
- All tools above support native Apple Silicon
- Ensure you're using native (not Rosetta) versions of Rust and Go
- Verify with `uname -m` (should show `arm64`, not `x86_64`)

### Windows 10/11

Construct is fully supported on Windows 10/11.

**Additional Requirements:**
- **Visual Studio Build Tools 2022** or **Visual Studio Community 2022**
  - Download from https://visualstudio.microsoft.com/downloads/
  - Include "Desktop development with C++" workload
- **.NET Framework 4.8+** (usually pre-installed)
- **WebView2 Runtime** (recommended, but can install on-demand)
  - Download from https://developer.microsoft.com/en-us/microsoft-edge/webview2/

**Path Issues:**
- Ensure `rustc`, `cargo`, `go`, `node`, and `bun` are all in your `PATH`
- Restart terminal/IDE after installing tools

### Linux (Ubuntu 20.04+, Fedora 35+)

Construct runs on Linux but is less actively tested than macOS.

**Additional Requirements:**
- **Development headers:**
  ```bash
  # Ubuntu/Debian
  sudo apt install build-essential libssl-dev pkg-config

  # Fedora
  sudo dnf install gcc gcc-c++ make openssl-devel pkg-config
  ```

- **GTK 3 development files** (for Tauri):
  ```bash
  # Ubuntu/Debian
  sudo apt install libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev

  # Fedora
  sudo dnf install gtk3-devel webkit2gtk4.0-devel libappindicator-gtk3-devel
  ```

## Verification Checklist

After installing all tools, run this checklist to ensure everything is ready:

```bash
# Check Node.js (should be 20.x or higher)
node --version

# Check Bun (should be 1.x or higher)
bun --version

# Check Rust (should be stable)
rustc --version
cargo --version

# Check Go (should be 1.23 or higher)
go version

# Check Tauri CLI (should be 2.x or higher)
tauri --version

# Optional: Check git
git --version

# Optional: Check GitHub CLI
gh --version
```

If all commands return version numbers, you're ready to proceed!

## Troubleshooting

### "Command not found" errors

**Solution:** Ensure the tool is in your `PATH`. Try installing again, and restart your terminal.

**macOS/Linux:**
```bash
# Add to ~/.bashrc, ~/.zshrc, or shell config
export PATH="/usr/local/bin:$PATH"
```

### Rust installation fails

**Solution:** Make sure you have Xcode Command Line Tools (macOS) or Visual Studio Build Tools (Windows).

```bash
# macOS
xcode-select --install

# Windows: Run Visual Studio Community installer and add C++ tools
```

### Go version mismatch

**Solution:** If you have multiple Go versions, explicitly set the PATH:

```bash
# macOS (Homebrew)
export PATH="/usr/local/opt/go@1.23/bin:$PATH"

# Then verify
go version
```

### Bun installation on Windows fails

**Solution:** Try using Scoop instead:

```powershell
scoop install bun
```

Or use npm as a fallback:

```bash
npm install --global @tauri-apps/cli@2
```

### Tauri build fails on Linux

**Solution:** Ensure all GTK development headers are installed:

```bash
# Ubuntu/Debian
sudo apt install libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev

# Fedora
sudo dnf install gtk3-devel webkit2gtk4.0-devel libappindicator-gtk3-devel
```

## Next Steps

Once all prerequisites are installed, proceed to [Getting Started](/guide/getting-started) to clone the repository and launch the development environment.
