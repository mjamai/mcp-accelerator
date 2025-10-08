#!/bin/bash

# MCP Accelerator - Release Preparation Script
# Usage: ./scripts/prepare-release.sh 1.1.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version number required${NC}"
    echo "Usage: ./scripts/prepare-release.sh <version>"
    echo "Example: ./scripts/prepare-release.sh 1.1.0"
    exit 1
fi

NEW_VERSION=$1
echo -e "${GREEN}Preparing release v${NEW_VERSION}...${NC}\n"

# Validate version format
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid version format${NC}"
    echo "Version must be in format: MAJOR.MINOR.PATCH (e.g., 1.2.3)"
    exit 1
fi

echo -e "${YELLOW}Step 1: Running tests...${NC}"
npm test || {
    echo -e "${RED}Tests failed! Fix them before releasing.${NC}"
    exit 1
}

echo -e "${GREEN}✓ Tests passed${NC}\n"

echo -e "${YELLOW}Step 2: Building all packages...${NC}"
npm run build || {
    echo -e "${RED}Build failed! Fix compilation errors before releasing.${NC}"
    exit 1
}

echo -e "${GREEN}✓ Build successful${NC}\n"

echo -e "${YELLOW}Step 3: Updating version numbers...${NC}"

# Update root package.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"${NEW_VERSION}\"/" package.json && rm package.json.bak

# Update all package.json files in packages/
for pkg in packages/*/package.json; do
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"${NEW_VERSION}\"/" "$pkg" && rm "${pkg}.bak"
done

echo -e "${GREEN}✓ Version numbers updated${NC}\n"

echo -e "${YELLOW}Step 4: Checking for uncommitted changes...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}You have uncommitted changes:${NC}"
    git status -s
    echo ""
fi

echo -e "${GREEN}✓ Release preparation complete!${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review and update CHANGELOG.md"
echo "2. Commit changes:"
echo -e "   ${GREEN}git add .${NC}"
echo -e "   ${GREEN}git commit -m \"chore: bump version to ${NEW_VERSION}\"${NC}"
echo "3. Create and push tag:"
echo -e "   ${GREEN}git tag -a v${NEW_VERSION} -m \"Release version ${NEW_VERSION}\"${NC}"
echo -e "   ${GREEN}git push origin main && git push origin v${NEW_VERSION}${NC}"
echo "4. Create GitHub Release using .github/RELEASE_TEMPLATE.md"
echo "5. Publish to npm (if ready):"
echo -e "   ${GREEN}cd packages/core && npm publish --access public${NC}"
echo ""
echo -e "${GREEN}Happy releasing! 🚀${NC}"
