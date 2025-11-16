#!/bin/bash
# Simple Policy ID Generator using cardano-cli
# This is the most reliable method

set -e

echo "🔐 Generating Cardano Policy ID"
echo "================================"
echo ""

# Check if cardano-cli is installed
if ! command -v cardano-cli &> /dev/null; then
    echo "❌ cardano-cli is not installed"
    echo ""
    echo "Install it with:"
    echo "  - Docker: docker run -it cardanosolutions/cardano-node cardano-cli"
    echo "  - Nix: https://developers.cardano.org/docs/get-started/installing-cardano-node"
    echo "  - Pre-built: https://github.com/input-output-hk/cardano-node/releases"
    echo ""
    exit 1
fi

# Create temporary directory
TMP_DIR=$(mktemp -d)
echo "📁 Working directory: $TMP_DIR"

cd "$TMP_DIR"

# Generate policy keys
echo ""
echo "🔑 Generating policy keys..."
cardano-cli address key-gen \
    --verification-key-file policy.vkey \
    --signing-key-file policy.skey

echo "✓ Keys generated"

# Get key hash
echo ""
echo "🔍 Getting key hash..."
KEYHASH=$(cardano-cli address key-hash --payment-verification-key-file policy.vkey)
echo "✓ Key hash: $KEYHASH"

# Create policy script
echo ""
echo "📜 Creating policy script..."
cat > policy.script <<EOF
{
  "type": "sig",
  "keyHash": "$KEYHASH"
}
EOF

echo "✓ Policy script created"

# Generate policy ID
echo ""
echo "🎯 Generating policy ID..."
POLICY_ID=$(cardano-cli transaction policyid --script-file policy.script)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Policy ID Generated Successfully!"
echo ""
echo "📋 Add this to your .env file:"
echo ""
echo "POLICY_ID=$POLICY_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Policy files saved to: $TMP_DIR"
echo "   - policy.vkey (verification key)"
echo "   - policy.skey (signing key)"
echo "   - policy.script (policy script)"
echo ""
echo "⚠️  IMPORTANT: Keep policy.skey secure - you need it to mint!"
echo ""
echo "💡 Next Steps:"
echo "   1. Copy the POLICY_ID line to your .env file"
echo "   2. Copy policy files to a secure location"
echo "   3. Restart your development server"
echo ""

# Keep directory for user to access files
echo "Files will remain in: $TMP_DIR"
echo "(Delete manually when you've backed them up)"
echo ""
