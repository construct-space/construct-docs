# Versioning and Releases

This guide explains Construct's versioning strategy, how releases are managed, and the tools and processes involved.

## Versioning Convention

Construct follows **Semantic Versioning (SemVer)** with the format: `MAJOR.MINOR.PATCH`

### Version Components

- **MAJOR:** Breaking changes to API or functionality (e.g., 2.0.0)
- **MINOR:** New features or capabilities, backward compatible (e.g., 1.1.0)
- **PATCH:** Bug fixes and patches, backward compatible (e.g., 1.0.1)

### Examples

- `1.0.0` — Initial release
- `1.1.0` — Added new space, backward compatible
- `1.1.1` — Bug fix in existing space
- `2.0.0` — Major breaking changes (rare)

## Version Sources of Truth

Git tags on `construct-space/releases` are the authoritative source of version information.

**Tag format:** `v{MAJOR}.{MINOR}.{PATCH}`

**Examples:**
- `v1.0.0`
- `v1.1.5`
- `v2.0.0`

### Checking Versions

```bash
# See all release tags
git tag -l "v*"

# Show current version
git describe --tags --abbrev=0

# Show full version info
git describe --tags
```

## Files That Track Version

Version must be updated consistently across **all** of these files:

### 1. operator/main.go

```go
const Version = "1.0.0"
```

### 2. frontend/package.json

```json
{
  "name": "construct-frontend",
  "version": "1.0.0",
  "description": "...",
  ...
}
```

### 3. desktop/Cargo.toml

```toml
[package]
name = "construct"
version = "1.0.0"
...
```

### 4. desktop/tauri.conf.json

```json
{
  "build": {
    "beforeBuildCommand": "",
    "devUrl": "http://localhost:60200",
    "frontendDist": "../frontend/dist"
  },
  "app": {
    "version": "1.0.0",
    ...
  }
}
```

### 5. package.json (root)

```json
{
  "name": "construct-app",
  "version": "1.0.0",
  ...
}
```

## Operator Version = Construct Version

**Critical rule:** The operator version always matches the overall Construct version. This ensures the frontend and operator are compatible.

If the operator version is `1.2.3`, the Construct release is `v1.2.3`.

## Release Process

### Overview

```
1. Prepare changes (feature branches)
2. Create pull request and review
3. Merge to main
4. Update all version numbers
5. Create git tag
6. Build and sign binaries
7. Create release on GitHub
```

### Step 1: Prepare Changes

Develop features or fixes on a feature branch:

```bash
git checkout -b feature/add-new-space
# Make changes...
git add .
git commit -m "Add new space"
```

### Step 2: Review and Merge

Create a pull request, get review, and merge to `main`:

```bash
git push origin feature/add-new-space
# Create PR on GitHub
# After review is approved:
git checkout main
git pull origin main
git merge --no-ff feature/add-new-space
git push origin main
```

### Step 3: Update Versions

Use the `scripts/update-versions.sh` script:

```bash
./scripts/update-versions.sh 1.1.0
```

This script:
1. Updates version in all 5 files (above)
2. Creates a commit with message: "Bump version to 1.1.0"
3. Confirms all files are updated

**Never manually edit versions.** The script ensures consistency.

```bash
# Verify the script worked
git diff HEAD~1
```

### Step 4: Create Git Tag

```bash
# Create annotated tag (preferred)
git tag -a v1.1.0 -m "Release version 1.1.0"

# Or use the release script
./scripts/release.sh 1.1.0
```

Tags must be in format `v{MAJOR}.{MINOR}.{PATCH}`.

### Step 5: Build Binaries

Build production binaries for all platforms:

```bash
bun run build
```

Or for specific platforms:

```bash
bun run build:mac-universal    # Intel + ARM
bun run build:win
bun run build:linux
```

### Step 6: Sign Binaries

**macOS:**

```bash
# Requires Apple Developer certificate
codesign -s "Developer ID Application" construct.app

# Notarize with Apple
xcrun notarytool submit construct.dmg --keychain-profile "notarize-profile"
```

**Windows:**

```bash
# Requires code signing certificate
signtool sign /f cert.pfx /p password construct.exe
```

Signing is configured in:
- `desktop/tauri.conf.json` (Tauri settings)
- `scripts/release.sh` (signing commands)

### Step 7: Push Tag and Create Release

```bash
git push origin v1.1.0
```

On GitHub, create a release:
1. Go to Releases → Draft new release
2. Select the tag `v1.1.0`
3. Add release notes
4. Upload binaries (`.dmg`, `.exe`, `.tar.gz`)
5. Publish

Or use GitHub CLI:

```bash
gh release create v1.1.0 \
  --title "Version 1.1.0" \
  --notes "$(cat CHANGELOG.md | head -20)" \
  construct-macos.dmg \
  construct-windows.exe \
  construct-linux.tar.gz
```

## Version Channels

After the gold release, software is distributed through channels:

| Channel | Purpose | Stability |
|---------|---------|-----------|
| **stable** | Production release | High (thoroughly tested) |
| **beta** | Pre-release testing | Medium (ready for early adopters) |
| **dev** | Development builds | Low (experimental features) |

### Channel Management

Versions are assigned to channels via Tauri's updater:

**Configuration in desktop/tauri.conf.json:**

```json
{
  "updater": {
    "active": true,
    "dialog": true,
    "pubkey": "...",
    "endpoints": [
      "https://releases.construct.dev/latest.json?channel=stable",
      "https://releases.construct.dev/latest.json?channel=beta"
    ]
  }
}
```

### User Opt-in

Users can choose their channel:
1. Settings → Updates
2. Select channel (stable, beta, dev)
3. Check for updates

## Tauri Updater

Construct uses Tauri's built-in updater for automatic updates:

### Endpoint Format

```
https://releases.construct.dev/latest.json?channel=stable
```

Returns:

```json
{
  "version": "1.1.0",
  "notes": "New features...",
  "pub_date": "2024-03-15T12:00:00Z",
  "platforms": {
    "darwin": {
      "signature": "...",
      "url": "https://releases.construct.dev/construct-1.1.0.dmg"
    },
    "win32": {
      "signature": "...",
      "url": "https://releases.construct.dev/construct-1.1.0.exe"
    }
  }
}
```

### Generating Signatures

Signatures prevent tampering with releases:

```bash
# Generate signature for binary
tauri signer sign construct-1.1.0.dmg --secret-key private.key
```

## Release Checklist

Before releasing, verify:

- [ ] All tests pass: `bun run test && bun run operator:test`
- [ ] Linting passes: `bun run lint`
- [ ] Type checking passes: `bun run typecheck`
- [ ] CHANGELOG.md updated with release notes
- [ ] All changes merged to `main` and reviewed
- [ ] Version numbers match across all 5 files
- [ ] Git tag created in correct format (`v1.1.0`)
- [ ] Binaries built and tested on all platforms
- [ ] Binaries signed (macOS) and notarized if required
- [ ] Release published on GitHub with notes and artifacts

## Rules and Constraints

### Never Skip Versions

You cannot jump versions. Release sequence must be:

```
1.0.0 → 1.0.1 → 1.1.0 → 1.1.1 → 2.0.0
```

NOT:

```
1.0.0 → 1.2.0  ✗ (skips 1.0.1)
1.0.0 → 2.0.0  ✗ (skips 1.x)
```

### Never Manually Edit Versions

Always use the `update-versions.sh` script:

```bash
./scripts/update-versions.sh 1.1.0  ✓
# vs.
vi operator/main.go  ✗
```

### Tags Are Immutable

Once a tag is created, never:
- Delete the tag
- Move the tag to a different commit
- Modify the tagged commit

If a mistake is made, create a new version (`v1.1.1`) instead of reusing.

### Synchronized Releases

All three components (operator, frontend, desktop) must release together with the same version. No independent versioning.

## Rollback

If a critical bug is found in a release:

1. **Patch immediately:** Fix on a branch and release `v1.1.1` (patch version)
2. **Alert users:** Update the release notes to indicate the issue
3. **Update stable channel:** Point users to the patch version
4. **Post-mortem:** Review what went wrong (see CONTRIBUTING.md)

## Development Version

During development between releases, the version in code is typically:

```
{NEXT_PLANNED_VERSION}-dev
```

For example, if working on 1.1.0:

```
1.1.0-dev
```

This makes it clear the version is not yet released.

## Changelog Management

Maintain a `CHANGELOG.md` with release notes:

```markdown
# Changelog

## [1.1.0] - 2024-03-15

### Added
- New Book Review space
- Structured output support for agents
- Multi-provider LLM selection

### Fixed
- Agent iteration loop termination bug
- Memory leak in terminal space

### Changed
- Default model changed to Claude 3.5 Sonnet

## [1.0.0] - 2024-03-01

### Added
- Initial release
- 10 built-in spaces
- Agent orchestration engine
```

Update the changelog with each release:

```bash
# Add new section at top
vi CHANGELOG.md

# Commit with version bump
git commit -am "Bump version to 1.1.0"
git tag -a v1.1.0
```

## Automated Versioning (Future)

Future improvements may include:
- Automatic version bumping from commit messages (conventional commits)
- Automated changelog generation
- CI/CD release automation

For now, manual process ensures careful review.

## Next Steps

- See [Release Script](/guide/dev-commands#bun-run-release) for the automated release command
- Check CHANGELOG.md for recent release notes
- Read build documentation for platform-specific release processes
