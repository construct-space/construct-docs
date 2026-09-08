# Contributing Workflow

This guide explains the branching strategy, development workflow, and release process for Construct projects.

## Branch Strategy

Construct uses a modified Git Flow branching strategy with the following branches:

### Protected Branches

| Branch | Purpose | Protection |
|--------|---------|-----------|
| `main` | Production release | No direct pushes, requires PR + review |
| `beta` | Pre-release / Release Candidate | No direct pushes, requires PR + review |
| `dev` | Integration branch | No direct pushes, requires PR + review |

### Feature/Fix Branches

| Pattern | Purpose | Base |
|---------|---------|------|
| `feat/*` | New features | `dev` |
| `fix/*` | Bug fixes | `dev` |
| `chore/*` | Maintenance, docs, CI/CD | `dev` |
| `refactor/*` | Code refactoring | `dev` |

All work originates from and targets `dev` except for hotfixes to `main`.

## Development Workflow

### 1. Start a Feature

```bash
# Update dev branch with latest
git checkout dev
git pull origin dev

# Create a feature branch
git checkout -b feat/my-feature

# Or for a bug fix
git checkout -b fix/issue-description
```

**Branch naming conventions:**
- Use lowercase letters and hyphens
- Be descriptive: `feat/agent-spawning` not `feat/changes`
- Reference issues when applicable: `fix/issue-123-auth-bug`

### 2. Develop

Work normally in your feature branch:

```bash
# Make changes
git add .
git commit -m "feat(agent): add spawning capability"

# Push to remote
git push origin feat/my-feature
```

Follow [commit conventions](./commits.md) for clear history.

### 3. Create Pull Request

Push your branch and create a PR targeting `dev`:

```bash
# If not already pushed
git push origin feat/my-feature
```

Then create a PR on GitHub:
- **Base**: `dev`
- **Compare**: `feat/my-feature`
- **Title**: Follow [commit message style](./commits.md)
- **Description**: Explain what and why, not just what you changed

**PR Requirements:**
- [ ] Changes are working locally
- [ ] Tests added/updated
- [ ] Code is linted and formatted
- [ ] Documentation is updated
- [ ] Commit messages follow conventions

### 4. Code Review

Your PR requires:
- At least one approval from a maintainer
- All CI checks passing (tests, lint, build)
- No conflicts with `dev`

Address review feedback by pushing additional commits. Do not force-push on the PR branch (allows reviewers to see iteration).

### 5. Merge

Once approved, the PR is merged using **Squash and Merge**:

```bash
# GitHub UI handles this, but equivalent to:
git checkout dev
git pull origin dev
git merge --squash feat/my-feature
git commit -m "feat(agent): add spawning capability"
git push origin dev
```

Squash merging keeps `dev` history clean with one commit per feature.

### 6. Delete Branch

After merge, the feature branch is automatically deleted on GitHub. Clean up locally:

```bash
git checkout dev
git branch -d feat/my-feature
```

## Release Flow

### dev → beta (Release Candidate)

When `dev` is stable and ready for pre-release testing:

```bash
# Ensure dev is up to date
git checkout dev
git pull origin dev

# Create release branch (or directly if using GitHub UI)
git checkout -b release/v1.2.0

# Update version numbers (package.json, etc.)
# Update CHANGELOG

# Create PR from release/ to beta
```

**What happens:**
1. Create PR from `dev` to `beta`
2. CI runs comprehensive test suite
3. Automated version bump and changelog generation
4. Merge to `beta` triggers beta releases

### beta → main (Production Release)

When beta is validated and ready for production:

```bash
# Create PR from beta to main
# GitHub Actions automatically:
# - Bumps version
# - Creates git tag v1.2.0
# - Generates release notes
# - Creates GitHub release
```

**What happens:**
1. Create PR from `beta` to `main`
2. Final review and approval
3. Merge triggers:
   - Version bump
   - Git tag creation
   - GitHub release publication
   - Package publishing (npm, docker registry, etc.)

### Hotfixes (main)

For critical production bugs:

```bash
# Start from main
git checkout main
git pull origin main

# Create hotfix branch
git checkout -b fix/critical-issue

# Make fix and commit
git commit -m "fix(operator): critical memory leak"

# Create PR to main
# After merge:
# - Tag released immediately
# - Also cherry-pick fix to beta and dev
```

Hotfixes skip beta and go directly to main, then are back-ported to `beta` and `dev`.

## Branch Protection Rules

All protected branches have these requirements:

1. **Require pull request reviews**: 1+ approval
2. **Require status checks to pass**:
   - `test` (unit + integration tests)
   - `lint` (ESLint, go vet)
   - `build` (Vite, Go build)
   - `security` (dependency scanning)
3. **Require branches up to date**: No merge if behind origin
4. **Restrict who can merge**: Only maintainers
5. **No force pushes**: Preserve history

## Staying Updated

### Sync with dev

If your feature branch falls behind `dev`:

```bash
git fetch origin dev
git rebase origin/dev

# Or merge if you prefer to keep local commits separate
git merge origin/dev
```

Always rebase before creating/pushing a PR.

### Sync with main (Emergency)

If `main` is ahead of your branch and you need those changes:

```bash
git fetch origin main
git rebase origin/main
```

Only needed if `main` has unrelated critical fixes.

## CI/CD Pipeline

Every commit triggers automated checks:

### On Feature Branch

```
commit → lint → test → build → security check
```

If any step fails, the PR cannot be merged until fixed.

### On dev

```
commit → lint → test → build → security check → deploy to staging
```

Passing `dev` is automatically deployed to staging environment.

### On beta

```
commit → lint → test → build → security check → deploy to beta.construct.dev
```

Pre-release testing environment for beta features.

### On main

```
commit → lint → test → build → security check → deploy production + publish packages
```

Production deployment and package releases (npm, Docker, etc.).

## Collaboration Tips

### Before you start

Check if issue/feature already exists:
```bash
# Search open PRs
git log --oneline --grep="similar feature"
```

### Communicate early

Post in team chat or issue if working on something complex.

### Keep branches focused

One feature per branch. Don't mix refactoring with new features.

### Review others' code

Help review PRs from teammates. Different perspectives catch issues.

### Ask for help

Don't hesitate to ask for review feedback or context. Better to ask than get stuck.

## Common Scenarios

### "I have commits that are not ready - how do I pause development?"

Push to a branch without creating a PR. You can return to it later:

```bash
git push origin feat/incomplete-work
# Later: git checkout feat/incomplete-work
```

### "I made a mistake in my last commit"

For local commits (not yet pushed):

```bash
# Undo last commit, keep changes
git reset --soft HEAD~1

# Make fixes
git add .
git commit -m "fixed message"

# Push
git push origin feat/my-feature
```

For already-pushed commits, add a new commit (don't force push):

```bash
git commit -m "fix: address review feedback"
git push origin feat/my-feature
```

### "I accidentally pushed to main - what do I do?"

If you directly push to `main`:

1. Immediately notify maintainers in Slack/Discord
2. A maintainer will revert the commit
3. The commit won't be lost (git history preserves it)
4. Follow normal PR process next time

This is why `main` is protected!

### "I want to see what changed in a PR"

```bash
# See commits in your branch
git log main..HEAD --oneline

# See actual changes
git diff main..HEAD

# In GitHub UI, check the "Files changed" tab
```

## Emergency Procedures

### Release blocking bug found

If a bug blocks the release:

1. Create a fix PR to `dev`
2. Fast-track the review (maintainers prioritize)
3. Once merged to `dev`, merge `dev` → `beta` → `main`
4. Tag and release

### Rollback needed

If deployed code has critical issues:

1. Create hotfix branch from `main`
2. Fix the issue
3. Fast-track PR and merge to `main`
4. Create new tag
5. Deploy hotfix immediately
6. Back-port fix to `beta` and `dev`

### Complete repo corruption

Contact maintainers. Likely need to restore from backup and rebase all in-flight work.

## Best Practices

1. **Never push directly to main, beta, or dev** - Always use PRs
2. **Keep commits small** - Easier to review and revert if needed
3. **Squash before merging** - Keeps history clean
4. **Test locally first** - Run tests and lint before pushing
5. **Review your own code first** - Before requesting review
6. **Be responsive to feedback** - Turn around reviews quickly
7. **Document what and why** - Commit messages should explain reasoning
8. **Keep branches short-lived** - Merge within a few days ideally
9. **Don't rebase merged branches** - Can cause issues with GitHub
10. **Ask questions** - Better to ask than make wrong assumptions
