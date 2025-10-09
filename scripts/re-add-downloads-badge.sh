#!/bin/bash
# Script to re-add the npm downloads badge once stats are indexed
# Run this in 24-48 hours after package publication

echo "Checking npm download stats..."

# Check if stats are available
STATS=$(curl -s "https://api.npmjs.org/downloads/point/last-week/@mcp-accelerator/core" | jq -r '.downloads // empty')

if [ -n "$STATS" ]; then
    echo "✅ Download stats available: $STATS downloads this week"
    echo "📝 You can now re-add the downloads badge to README.md:"
    echo ""
    echo '[![npm downloads](https://img.shields.io/npm/dm/@mcp-accelerator/core.svg)](https://www.npmjs.com/package/@mcp-accelerator/core)'
    echo ""
    echo "Add it after the npm version badge on line 3"
else
    echo "⏳ Download stats not yet indexed. Try again in a few hours."
fi
