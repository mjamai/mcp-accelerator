#!/bin/bash

# Script to setup GitHub Pages for MCP Accelerator documentation
# This script helps configure GitHub Pages settings

echo " Setting up GitHub Pages for MCP Accelerator Documentation"
echo "=========================================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Get repository information
REPO_URL=$(git config --get remote.origin.url)
REPO_NAME=$(basename "$REPO_URL" .git)
REPO_OWNER=$(echo "$REPO_URL" | sed -n 's/.*github.com[:/]\([^/]*\)\/\([^/]*\)\.git.*/\1/p')

echo "Repository Information:"
echo "  - Owner: $REPO_OWNER"
echo "  - Name: $REPO_NAME"
echo "  - URL: $REPO_URL"
echo ""

echo "GitHub Pages Setup Instructions:"
echo "=================================="
echo ""
echo "1. Go to your repository settings:"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/settings/pages"
echo ""
echo "2. Configure the following settings:"
echo "   - Source: GitHub Actions"
echo "   - Branch: main"
echo "   - Folder: / (root)"
echo ""
echo "3. The documentation will be available at:"
echo "   https://$REPO_OWNER.github.io/$REPO_NAME"
echo ""
echo "4. Custom domain (optional):"
echo "   - Add your custom domain in the Pages settings"
echo "   - Update CNAME file if needed"
echo ""

echo "🔧 Manual Configuration Steps:"
echo "=============================="
echo ""
echo "1. Enable GitHub Actions in repository settings"
echo "2. Ensure the 'docs.yml' workflow has 'pages: write' permission"
echo "3. The workflow will automatically deploy on push to main"
echo ""

echo " Monitoring Deployment:"
echo "========================"
echo ""
echo "1. Check workflow status:"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo ""
echo "2. View deployment logs in the 'Deploy Documentation' workflow"
echo ""
echo "3. Once deployed, your docs will be live at:"
echo "   https://$REPO_OWNER.github.io/$REPO_NAME"
echo ""

echo "Next Steps:"
echo "=============="
echo ""
echo "1. Push this commit to trigger the first deployment"
echo "2. Wait 5-10 minutes for the initial build"
echo "3. Visit your documentation site"
echo "4. Customize the design in docs/assets/css/main.css"
echo "5. Add more content to the docs/ directory"
echo ""

echo " Setup complete! Documentation will be deployed automatically."
echo "Your docs will be available at: https://$REPO_OWNER.github.io/$REPO_NAME"
