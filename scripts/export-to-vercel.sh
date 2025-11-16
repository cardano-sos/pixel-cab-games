#!/bin/bash
# Script to export environment variables from .envrc to Vercel
# Usage: ./scripts/export-to-vercel.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Export .envrc to Vercel${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .envrc exists
if [ ! -f .envrc ]; then
    echo -e "${YELLOW}Error: .envrc file not found${NC}"
    exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Warning: Vercel CLI not found. Install with: npm i -g vercel${NC}"
    echo -e "${YELLOW}Generating manual commands instead...${NC}"
    echo ""
    USE_CLI=false
else
    echo -e "${GREEN}Vercel CLI found!${NC}"
    echo ""
    echo "Choose an option:"
    echo "1) Generate 'vercel env add' commands (copy/paste)"
    echo "2) Automatically add to Vercel project (requires login)"
    echo ""
    read -p "Enter choice (1 or 2): " choice

    if [ "$choice" = "2" ]; then
        USE_CLI=true
    else
        USE_CLI=false
    fi
fi

echo ""
echo -e "${BLUE}Processing .envrc...${NC}"
echo ""

# Environment to deploy to
ENV_TARGET="production,preview,development"

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

# Parse .envrc and extract variables
count=0
declare -a commands

while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue

    # Match export VAR='value' or export VAR="value" or export VAR=value
    if [[ "$line" =~ ^export[[:space:]]+([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
        var_name="${BASH_REMATCH[1]}"
        var_value="${BASH_REMATCH[2]}"

        # Remove surrounding quotes if present
        var_value="${var_value#\'}"
        var_value="${var_value%\'}"
        var_value="${var_value#\"}"
        var_value="${var_value%\"}"

        # Skip empty values
        [ -z "$var_value" ] && continue

        # Skip placeholder values
        [[ "$var_value" =~ ^your.*here$ ]] && continue
        [[ "$var_value" =~ ^YOUR.*HERE$ ]] && continue

        count=$((count + 1))

        if [ "$USE_CLI" = true ]; then
            # Execute vercel env add command
            if is_secret "$var_name"; then
                echo -e "${YELLOW}Adding secret: $var_name${NC}"
                echo "$var_value" | vercel env add "$var_name" production preview development --sensitive
            else
                echo -e "${GREEN}Adding: $var_name${NC}"
                echo "$var_value" | vercel env add "$var_name" production preview development
            fi
        else
            # Generate command for manual execution
            if is_secret "$var_name"; then
                commands+=("echo '$var_value' | vercel env add $var_name production preview development --sensitive")
            else
                commands+=("echo '$var_value' | vercel env add $var_name production preview development")
            fi
        fi
    fi
done < .envrc

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Total variables processed: ${BLUE}$count${NC}"
echo ""

if [ "$USE_CLI" = true ]; then
    echo -e "${GREEN}✅ All variables added to Vercel!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Go to your Vercel project settings"
    echo "2. Navigate to Environment Variables"
    echo "3. Verify all variables are set correctly"
    echo "4. Redeploy your project"
else
    echo -e "${YELLOW}Copy and paste these commands to add variables to Vercel:${NC}"
    echo ""
    echo "# First, login to Vercel CLI:"
    echo "vercel login"
    echo ""
    echo "# Then run these commands:"
    for cmd in "${commands[@]}"; do
        echo "$cmd"
    done
    echo ""
    echo -e "${BLUE}Or manually add them via Vercel Dashboard:${NC}"
    echo "https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
fi

echo ""
echo -e "${YELLOW}Important Notes:${NC}"
echo "- Update DISCORD_REDIRECT_URI for production URL"
echo "- Verify all secrets are marked as sensitive"
echo "- Redeploy after adding variables"
echo ""
