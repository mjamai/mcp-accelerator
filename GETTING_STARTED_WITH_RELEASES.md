# Getting Started with Releases

Quick guide to create your first release of MCP Accelerator.

## 🎯 Your First Release: v1.0.0

### Step 1: Pre-Release Checklist ✅

Make sure everything is ready:

```bash
# Run all checks
npm test
npm run build
npm run lint

# Verify examples work
cd examples/basic-stdio && node index.ts
```

### Step 2: Use the Release Script 🚀

```bash
# Run the automated preparation script
./scripts/prepare-release.sh 1.0.0
```

This will:
- ✅ Run tests
- ✅ Build all packages
- ✅ Update version numbers in all `package.json` files

### Step 3: Update CHANGELOG.md 📝

Open `CHANGELOG.md` and move items from `[Unreleased]` to the new version:

```markdown
## [1.0.0] - 2025-01-08

### Added
- Initial release with modular architecture
- Core package with server and types
- 4 independent transport packages
- Full TypeScript support
- Examples and documentation
```

### Step 4: Commit and Tag 🏷️

```bash
# Commit version changes
git add .
git commit -m "chore: release v1.0.0"

# Create annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0

First stable release of MCP Accelerator with modular architecture"

# Push everything
git push origin main
git push origin v1.0.0
```

### Step 5: Create GitHub Release 🎉

1. Go to: https://github.com/mohamedjamai/mcp-accelerator/releases/new

2. Select tag: `v1.0.0`

3. Release title: `v1.0.0 - First Stable Release`

4. Copy content from `.github/RELEASE_TEMPLATE.md` and customize

5. ✅ Check "Set as the latest release"

6. Click "Publish release"

### Step 6: Publish to npm (Optional) 📦

Only if you want to make it publicly available:

```bash
# Login to npm (one time)
npm login

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

### Step 7: Announce! 📢

Share your release:

- Twitter/X
- LinkedIn
- Reddit (r/typescript, r/node)
- Dev.to blog post
- Hacker News (Show HN)

## 🎊 Congratulations!

Your first release is live! Here's what you've accomplished:

- ✅ Professional versioning
- ✅ Complete changelog
- ✅ GitHub release with notes
- ✅ (Optional) npm packages published
- ✅ Community announcement

## 📈 After Release

### Monitor

- GitHub issues and discussions
- npm download stats
- GitHub stars
- Community feedback

### Next Steps

1. **Respond to Issues**: Aim for <24h response time
2. **Plan v1.1.0**: Based on feedback
3. **Write Blog Posts**: Share your experience
4. **Engage Community**: Twitter, discussions, etc.

### Release Schedule

Suggested cadence:

- **Patch (1.0.x)**: As needed for bug fixes
- **Minor (1.x.0)**: Monthly or when features ready
- **Major (x.0.0)**: Quarterly or for breaking changes

## 🐛 Hotfix Example

If you need to release an urgent bug fix:

```bash
# From main branch
./scripts/prepare-release.sh 1.0.1

# Update CHANGELOG with bug fix
# Commit and tag
git commit -am "fix: critical bug in HTTP transport"
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main && git push origin v1.0.1

# Create GitHub release and publish to npm
```

## 📚 Resources

- [CHANGELOG.md](CHANGELOG.md) - Version history
- [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - Detailed release process
- [CREDIBILITY_CHECKLIST.md](CREDIBILITY_CHECKLIST.md) - Build trust

## 💡 Pro Tips

1. **Test Before Release**: Always run full test suite
2. **Write Good Notes**: Users appreciate detailed release notes
3. **Semantic Versioning**: Follow strictly for predictability
4. **Communicate**: Announce breaking changes early
5. **Listen**: User feedback is goldGitHub

## ❓ FAQ

**Q: When should I release v1.0.0?**  
A: When your API is stable and you're confident in the core functionality.

**Q: Can I unpublish a release?**  
A: GitHub releases can be deleted. npm packages can only be unpublished within 72 hours. Be careful!

**Q: Should I create pre-releases?**  
A: Yes! Use `1.0.0-beta.1` for testing with early adopters.

**Q: How do I handle breaking changes?**  
A: Bump major version (2.0.0) and provide migration guide.

---

**Ready to release?** Let's do this! 🚀

```bash
./scripts/prepare-release.sh 1.0.0
```
