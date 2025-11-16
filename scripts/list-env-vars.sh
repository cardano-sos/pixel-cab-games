#!/bin/bash
# Simple script to output environment variables for Vercel web GUI
# Copy the NAME and VALUE separately into Vercel's form

set -e

# Colors
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .envrc exists
if [ ! -f .envrc ]; then
    echo -e "${RED}Error: .envrc file not found${NC}"
    exit 1
fi

# Secret variables that should be marked as sensitive
SECRETS=(
    "MINTTING_WALLET_OUTPUT_MNEMONIC"
    "BLOCKFROST_PROJECT_ID"
    "JWT_SECRET"
    "DISCORD_CLIENT_SECRET"
    "SUPABASE_SERVICE_ROLE_KEY"
    "SUPABASE_JWT_SECRET"
    "POSTGRES_PASSWORD"
)

# Function to check if variable is a secret
is_secret() {
    local var_name=$1
    for secret in "${SECRETS[@]}"; do
        if [ "$var_name" = "$secret" ]; then
            return 0
        fi
    done
    return 1
}

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Environment Variables for Vercel${NC}"
echo -e "${BLUE}Copy each NAME and VALUE into Vercel${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

count=0

# Parse .envrc and output clean pairs
while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue

    # Match export VAR='value' or export VAR="value" or export VAR=value
    if [[ "$line" =~ ^export[[:space:]]+([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
        var_name="${BASH_REMATCH[1]}"
        var_value="${BASH_REMATCH[2]}"

        # Remove surrounding quotes
        var_value="${var_value#\'}"
        var_value="${var_value%\'}"
        var_value="${var_value#\"}"
        var_value="${var_value%\"}"

        # Skip empty or placeholder values
        [ -z "$var_value" ] && continue
        [[ "$var_value" =~ ^your.*here$ ]] && continue
        [[ "$var_value" =~ ^YOUR.*HERE$ ]] && continue

        count=$((count + 1))

        # Print with color coding for secrets
        if is_secret "$var_name"; then
            echo -e "${YELLOW}[$count] 🔒 SENSITIVE${NC}"
            echo -e "${GREEN}NAME:${NC}  $var_name"
            echo -e "${GREEN}VALUE:${NC} $var_value"
        else
            echo -e "${BLUE}[$count]${NC}"
            echo -e "${GREEN}NAME:${NC}  $var_name"
            echo -e "${GREEN}VALUE:${NC} $var_value"
        fi
        echo ""
    fi
done < .envrc

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Total: $count variables${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT FOR PRODUCTION:${NC}"
echo ""
echo "Update these values for production:"
echo "  • DISCORD_REDIRECT_URI → https://yourdomain.com/api/auth/discord/callback"
echo "  • CARDANO_NETWORK → mainnet (if deploying to mainnet)"
echo ""
echo -e "${YELLOW}In Vercel, check 'Sensitive' for:${NC}"
for secret in "${SECRETS[@]}"; do
    echo "  • $secret"
done
echo ""
