# Release Guide

Guide for creating and publishing releases of MCP Accelerator.

## 📋 Pre-Release Checklist

Before creating a release, ensure:

- [ ] All tests pass (`npm test`)
- [ ] All packages build successfully (`npm run build`)
- [ ] Documentation is up-to-date
- [ ] CHANGELOG.md is updated
- [ ] Version numbers are consistent across all packages
- [ ] Examples work correctly
- [ ] No linter errors (`npm run lint`)

## 🔢 Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes (backward compatible)

### Examples

```
1.0.0 → 1.0.1  # Bug fix
1.0.0 → 1.1.0  # New transport added
1.0.0 → 2.0.0  # Breaking API change
```

## 🚀 Release Process

### 1. Update Version Numbers

Update version in all `package.json` files:

```bash
# Root package
sed -i '' 's/"version": "1.0.0"/"version": "1.1.0"/' package.json

# All packages
sed -i '' 's/"version": "1.0.0"/"version": "1.1.0"/' packages/*/package.json
```

Or manually:
- `/package.json`
- `/packages/core/package.json`
- `/packages/transport-stdio/package.json`
- `/packages/transport-http/package.json`
- `/packages/transport-websocket/package.json`
- `/packages/transport-sse/package.json`

### 2. Update CHANGELOG.md

Move changes from `[Unreleased]` to a new version section:

```markdown
## [1.1.0] - 2025-01-15

### Added
- New awesome feature

### Fixed
- Bug fix description

### Changed
- Improvement description
```

### 3. Commit Version Changes

```bash
git add .
git commit -m "chore: bump version to 1.1.0"
```

### 4. Create Git Tag

```bash
git tag -a v1.1.0 -m "Release version 1.1.0"
```

### 5. Push to GitHub

```bash
git push origin main
git push origin v1.1.0
```

### 6. Create GitHub Release

Go to: https://github.com/mohamedjamai/mcp-accelerator/releases/new

**Release Title**: `v1.1.0 - [Brief Description]`

**Description Template**:
```markdown
## 🎉 What's New in v1.1.0

Brief overview of the release.

### ✨ New Features
- Feature 1
- Feature 2

### 🐛 Bug Fixes
- Fix 1
- Fix 2

### 📚 Documentation
- Improved examples
- Updated guides

### 📦 Installation

\`\`\`bash
npm install @mcp-accelerator/core@1.1.0 zod
npm install @mcp-accelerator/transport-stdio@1.1.0
\`\`\`

### 🔗 Links
- [Changelog](https://github.com/mohamedjamai/mcp-accelerator/blob/main/CHANGELOG.md)
- [Documentation](https://github.com/mohamedjamai/mcp-accelerator#readme)

**Full Changelog**: https://github.com/mohamedjamai/mcp-accelerator/compare/v1.0.0...v1.1.0
```

### 7. Publish to npm

⚠️ **Only if you want to publish publicly**

```bash
# Login to npm (first time only)
npm login

# Build all packages
npm run build

# Publish each package
cd packages/core
npm publish --access public

cd ../transport-stdio
npm publish --access public

cd ../transport-http
npm publish --access public

cd ../transport-websocket
npm publish --access public

cd ../transport-sse
npm publish --access public
```

### 8. Announce the Release

- Update README badges (if applicable)
- Tweet/Post on social media
- Notify in relevant communities

## 📊 Release Cadence

Suggested release schedule:

- **Patch releases**: As needed (bug fixes)
- **Minor releases**: Monthly or when features are ready
- **Major releases**: Quarterly or when breaking changes are necessary

## 🏷️ Pre-release Versions

For testing before official release:

```bash
# Alpha
1.1.0-alpha.1

# Beta
1.1.0-beta.1

# Release Candidate
1.1.0-rc.1
```

Publish with tag:
```bash
npm publish --tag beta
```

## 📝 Release Notes Best Practices

### Good Release Note
```markdown
## [1.1.0] - 2025-01-15

### Added
- **WebSocket reconnection**: Automatic reconnection with exponential backoff (#42)
- **Metrics plugin**: Built-in metrics collection and reporting (#45)

### Fixed
- **STDIO transport**: Fixed memory leak on long-running processes (#38)
- **HTTP transport**: Proper error handling for invalid JSON (#40)

### Changed
- **Performance**: Reduced bundle size by 15% through better tree-shaking (#43)
```

### What to Include
- ✅ User-facing changes
- ✅ Breaking changes (with migration guide)
- ✅ New features
- ✅ Bug fixes
- ✅ Performance improvements
- ✅ Links to issues/PRs

### What NOT to Include
- ❌ Internal refactoring
- ❌ Code style changes
- ❌ Development dependencies updates
- ❌ Too technical details

## 🎯 First Release (v1.0.0)

For your first official release:

1. **Finalize API**: Ensure API is stable
2. **Complete documentation**: All features documented
3. **Add examples**: Real-world usage examples
4. **Test thoroughly**: All transports tested
5. **Write great README**: Clear, comprehensive
6. **Add badges**: Build status, npm version, etc.

## 🔄 Hotfix Process

For urgent bug fixes:

```bash
# Create hotfix branch from tag
git checkout -b hotfix/1.0.1 v1.0.0

# Fix the bug
# ... make changes ...

# Update version to 1.0.1
# Update CHANGELOG

# Commit and tag
git commit -m "fix: critical bug fix"
git tag -a v1.0.1 -m "Hotfix version 1.0.1"

# Merge back to main
git checkout main
git merge hotfix/1.0.1

# Push
git push origin main
git push origin v1.0.1

# Publish
npm publish
```

## 🛡️ Release Checklist Template

Copy this for each release:

```markdown
## Release v1.X.X Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Build successful
- [ ] Linter clean
- [ ] Examples tested
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers updated

### Release
- [ ] Version committed
- [ ] Git tag created
- [ ] Pushed to GitHub
- [ ] GitHub Release created
- [ ] npm packages published

### Post-Release
- [ ] Release announced
- [ ] README badges updated
- [ ] Community notified
```

## 📚 Resources

- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [npm Publishing Guide](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)

---

**Happy Releasing! 🚀**
