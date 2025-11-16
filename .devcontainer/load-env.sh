#!/bin/bash
# Load environment variables from .envrc for use in dev container

if [ -f .envrc ]; then
  echo "Loading environment variables from .envrc..."
  set -a  # automatically export all variables
  source .envrc
  set +a  # stop automatically exporting
  echo "✓ Environment variables loaded"
  echo "  - MINTTING_WALLET_OUTPUT_MNEMONIC: $([ -n "$MINTTING_WALLET_OUTPUT_MNEMONIC" ] && echo "Set" || echo "Not set")"
  echo "  - NEXT_PUBLIC_PROFIT_WALLET: $([ -n "$NEXT_PUBLIC_PROFIT_WALLET" ] && echo "Set" || echo "Not set")"
  echo "  - POLICY_ID: $([ -n "$POLICY_ID" ] && echo "Set" || echo "Not set")"
  echo "  - JWT_SECRET: $([ -n "$JWT_SECRET" ] && echo "Set" || echo "Not set")"
  echo "  - BLOCKFROST_PROJECT_ID: $([ -n "$BLOCKFROST_PROJECT_ID" ] && echo "Set" || echo "Not set")"
else
  echo "⚠️  .envrc file not found"
  echo "   Copy .envrc.example to .envrc and configure your environment variables"
fi
