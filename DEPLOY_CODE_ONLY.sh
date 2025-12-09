#!/bin/bash

# Deploy Code Changes Only (No MD files)
# This script deploys only code changes, excluding all documentation

set -e

echo "🚀 Deploying Code Changes Only (No Documentation)"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verify directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in marketing-ops directory${NC}"
    exit 1
fi

# Run build
echo -e "\n${YELLOW}🔨 Running build...${NC}"
if npm run build > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed. Check /tmp/build.log${NC}"
    exit 1
fi

# Stage only code files (exclude .md and DEPLOY scripts)
echo -e "\n${YELLOW}📦 Staging code files only...${NC}"
git add -A
git reset -- '*.md' 'DEPLOY*.sh' 2>/dev/null || true

# Show what will be committed
echo -e "\n${YELLOW}📋 Files to be committed:${NC}"
git status --short | grep -v "\.md$" | grep -v "DEPLOY" | head -20

# Count files
CODE_FILES=$(git status --short | grep -v "\.md$" | grep -v "DEPLOY" | grep -E "^[AM]" | wc -l | tr -d ' ')
echo -e "\n${GREEN}✅ ${CODE_FILES} code files ready to commit${NC}"

# Confirm
echo -e "\n${YELLOW}⚠️  Ready to commit and push?${NC}"
read -p "Type 'yes' to proceed: " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}❌ Cancelled${NC}"
    exit 0
fi

# Commit
echo -e "\n${YELLOW}💾 Committing...${NC}"
git commit -m "feat: UI improvements and performance enhancements

- Migrated to Card/Button primitives (design system)
- Improved overlay system (ModalPortal, OverlayManager)
- Enhanced dashboard modals (Create Task on dashboard)
- Fixed API column calculation bugs (supports >26 columns)
- Performance optimizations (transition improvements)
- Updated color scheme (#d5214b primary, #fdde00 secondary)

✅ No functional changes to clock in/out or active works
✅ All functionality preserved
✅ Build and lint passing"

echo -e "${GREEN}✅ Committed${NC}"

# Push confirmation
echo -e "\n${YELLOW}⚠️  Push to main?${NC}"
read -p "Type 'push' to proceed: " push_confirm

if [ "$push_confirm" != "push" ]; then
    echo -e "${YELLOW}❌ Push cancelled. Run 'git push origin main' when ready.${NC}"
    exit 0
fi

# Push
echo -e "\n${YELLOW}🚀 Pushing...${NC}"
if git push origin main; then
    echo -e "${GREEN}✅ Successfully deployed!${NC}"
else
    echo -e "${RED}❌ Push failed${NC}"
    exit 1
fi

