#!/bin/bash
# Convert .envrc to .env format for Vercel import
# Usage: ./scripts/envrc-to-env.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Converting .envrc to .env for Vercel${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check if .envrc exists
if [ ! -f .envrc ]; then
    echo -e "${RED}Error: .envrc file not found${NC}"
    exit 1
fi

# Output file
OUTPUT_FILE=".env.vercel"

# Clear/create output file
> "$OUTPUT_FILE"

# Add header comment
cat > "$OUTPUT_FILE" << 'EOF'
# Environment variables for Vercel
# Generated from .envrc
#
# IMPORTANT: Update these for production:
# - DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback
# - CARDANO_NETWORK=mainnet (if deploying to mainnet)
#
# Mark these as SENSITIVE in Vercel:
# - MINTTING_WALLET_OUTPUT_MNEMONIC
# - BLOCKFROST_PROJECT_ID
# - JWT_SECRET
# - DISCORD_CLIENT_SECRET
# - SUPABASE_SERVICE_ROLE_KEY
# - SUPABASE_JWT_SECRET
# - POSTGRES_PASSWORD

EOF

count=0

# Parse .envrc and convert to .env format
while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue

    # Match export VAR='value' or export VAR="value" or export VAR=value
    if [[ "$line" =~ ^export[[:space:]]+([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
        var_name="${BASH_REMATCH[1]}"
        var_value="${BASH_REMATCH[2]}"

        # Skip empty or placeholder values
        [ -z "$var_value" ] && continue
        [[ "$var_value" =~ ^your.*here$ ]] && continue
        [[ "$var_value" =~ ^YOUR.*HERE$ ]] && continue

        # Keep quotes as-is for .env format
        # Write to output file without 'export'
        echo "$var_name=$var_value" >> "$OUTPUT_FILE"

        count=$((count + 1))
    fi
done < .envrc

echo -e "${GREEN}✅ Conversion complete!${NC}"
echo ""
echo -e "${BLUE}Output file:${NC} $OUTPUT_FILE"
echo -e "${BLUE}Variables:${NC}   $count"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables"
echo "2. Click 'Add New' → 'Add .env File'"
echo "3. Copy and paste the contents of '$OUTPUT_FILE'"
echo "4. Select environments: Production, Preview, Development"
echo "5. Click 'Import'"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "• Update DISCORD_REDIRECT_URI for your production domain"
echo "• Update CARDANO_NETWORK if deploying to mainnet"
echo "• Verify sensitive variables are marked correctly"
echo ""
echo -e "${BLUE}To view the file:${NC}"
echo "cat $OUTPUT_FILE"
echo ""
