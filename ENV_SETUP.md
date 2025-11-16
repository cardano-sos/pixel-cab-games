# Environment Variables Setup

## Overview

Your NFT minting application uses environment variables for configuration. Images are embedded as **base64** directly in the NFT metadata (no IPFS required).

## Required Environment Variables

Create or update your `.env` file with these variables:

```bash
# Blockfrost API (for Cardano blockchain access)
BLOCKFROST_PROJECT_ID=your_blockfrost_project_id

# Minting Wallet (server-side minting if needed)
MINTTING_WALLET_OUTPUT_MNEMONIC=your_wallet_mnemonic_phrase

# JWT Secret (for session management)
JWT_SECRET=your-secure-secret-key-here

# REQUIRED: Your Profit Wallet Address
NEXT_PUBLIC_PROFIT_WALLET=addr1_your_actual_wallet_address

# REQUIRED: Your Cardano Policy ID
POLICY_ID=your_actual_policy_id_here
```

## Important Notes

### 1. NEXT_PUBLIC_ Prefix
Variables with `NEXT_PUBLIC_` prefix are accessible in the browser (client-side).
- `NEXT_PUBLIC_PROFIT_WALLET` - Your wallet receives minting payments
- `POLICY_ID` - Your NFT collection policy ID

### 2. Security
- **NEVER** commit your `.env` file to git (it's already in `.gitignore`)
- Keep your mnemonic phrase secure
- Use different values for testnet and mainnet

### 3. Base64 Images
- Images are automatically converted to base64 during minting
- No IPFS upload needed
- Images are embedded directly in the NFT metadata
- This keeps everything on-chain and permanent

## Getting Your Values

### PROFIT_WALLET
1. Create or use existing Cardano wallet
2. Get your receiving address (starts with `addr1`)
3. For **testnet**: Use testnet address (starts with `addr_test1`)
4. Add to `.env`: `NEXT_PUBLIC_PROFIT_WALLET=addr1qy...`

### POLICY_ID
You need to create a minting policy. Options:

#### Option 1: Using cardano-cli
```bash
# Generate policy keys
cardano-cli address key-gen \
  --verification-key-file policy.vkey \
  --signing-key-file policy.skey

# Create policy script
echo "{
  \"type\": \"all\",
  \"scripts\": [
    {
      \"type\": \"sig\",
      \"keyHash\": \"$(cardano-cli address key-hash --payment-verification-key-file policy.vkey)\"
    }
  ]
}" > policy.script

# Generate policy ID
cardano-cli transaction policyid --script-file policy.script
```

#### Option 2: Using a Minting Service
Services like:
- NMKR (https://www.nmkr.io)
- CardanoPress (https://cardanopress.io)
- Plutus Scripts

Add the policy ID to `.env`:
```bash
POLICY_ID=your_56_character_policy_id
```

## Example .env File

```bash
# API Keys
BLOCKFROST_PROJECT_ID=mainnetABC123456789
JWT_SECRET=my-super-secret-jwt-key-change-this

# Cardano Configuration
NEXT_PUBLIC_PROFIT_WALLET=addr1qy2jt0qpqz4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4
POLICY_ID=0123456789abcdef0123456789abcdef0123456789abcdef01234567

# Optional: Minting Wallet (if using server-side minting)
MINTTING_WALLET_OUTPUT_MNEMONIC=word1 word2 word3 ... word24
```

## Testing on Testnet

Before going to mainnet, test on **Cardano Testnet**:

1. Update `.env` with testnet values:
```bash
BLOCKFROST_PROJECT_ID=testnetABC123456789
NEXT_PUBLIC_PROFIT_WALLET=addr_test1qy...  # Testnet address
POLICY_ID=your_testnet_policy_id
```

2. Get testnet ADA from faucet:
   - https://docs.cardano.org/cardano-testnet/tools/faucet

3. Test minting with testnet wallet

4. Verify on testnet explorer:
   - https://testnet.cardanoscan.io

## Verification

After setting up your `.env`:

1. Restart the dev server:
```bash
npm run dev
```

2. Visit `http://localhost:3000/mint`

3. Check the warning banner:
   - If configured correctly, no warning appears
   - If missing values, you'll see what needs to be set

4. Try minting (on testnet first!)

## Troubleshooting

### "Configuration Required" warning still showing
- Make sure variable names start with `NEXT_PUBLIC_`
- Restart the dev server after changing `.env`
- Check for typos in variable names

### "Invalid hex string" error
- Policy ID should be 56 characters (hex)
- Wallet address should start with `addr1` (mainnet) or `addr_test1` (testnet)
- No extra spaces or quotes in `.env` file

### Images not embedding
- Images are automatically converted to base64
- Check that `images/nfts/images/` contains your PNG files
- Verify symlink exists: `ls -la public/images`

## Next Steps

1. Set up `.env` with your values
2. Test on Cardano testnet
3. Verify NFT appears in wallet
4. Check metadata on blockchain explorer
5. Once verified, update to mainnet values
6. Start minting!

## Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] Different values for testnet/mainnet
- [ ] Mnemonic phrase stored securely
- [ ] Tested on testnet before mainnet
- [ ] Wallet addresses verified
- [ ] Policy ID verified
