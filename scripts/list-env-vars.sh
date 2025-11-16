#!/bin/bash
# Simple script to list all environment variables from .envrc
# Output can be copy-pasted into Vercel dashboard

echo "========================================="
echo "Environment Variables for Vercel"
echo "========================================="
echo ""

# Parse .envrc and output clean key=value pairs
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

        # Print in format: NAME=value
        echo "$var_name=$var_value"
    fi
done < .envrc

echo ""
echo "========================================="
echo "IMPORTANT: For Production Deployment"
echo "========================================="
echo ""
echo "Remember to update these for production:"
echo "- DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback"
echo "- CARDANO_NETWORK=mainnet (if deploying to mainnet)"
echo ""
echo "Mark these as SENSITIVE in Vercel:"
echo "- MINTTING_WALLET_OUTPUT_MNEMONIC"
echo "- BLOCKFROST_PROJECT_ID"
echo "- JWT_SECRET"
echo "- DISCORD_CLIENT_SECRET"
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo "- SUPABASE_JWT_SECRET"
echo "- POSTGRES_PASSWORD"
echo ""
