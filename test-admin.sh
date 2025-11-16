#!/bin/bash
# Test script for Discord bot token authentication

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Discord Admin Endpoint Test"
echo "========================================="
echo ""

# Check if DISCORD_BOT_TOKEN is set
if [ -z "$DISCORD_BOT_TOKEN" ]; then
    echo -e "${RED}ERROR: DISCORD_BOT_TOKEN is not set${NC}"
    echo "Please run: direnv allow"
    echo "Or set the environment variable manually"
    exit 1
fi

echo -e "${YELLOW}Testing /api/admin/stats endpoint...${NC}"
echo ""

# Test the endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/admin/stats \
  -H "Authorization: Bot $DISCORD_BOT_TOKEN")

# Split response and status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Authentication successful!${NC}"
    echo ""
    echo "Response:"
    echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
else
    echo -e "${RED}❌ Authentication failed!${NC}"
    echo ""
    echo "Response:"
    echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure you reset your Discord bot token"
    echo "2. Update DISCORD_BOT_TOKEN in .envrc"
    echo "3. Run: direnv allow"
    echo "4. Restart your dev server"
fi

echo ""
echo "========================================="
