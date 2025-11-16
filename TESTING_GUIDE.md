# Testing Guide - NFT Minting Application

## Current Status

✅ NFT images and metadata are loaded correctly
✅ Browse and random selection working
✅ Database tracking system in place
✅ Admin dashboard functional

⚠️ **Minting is disabled** until you configure the production values

## Error Explanation

The error `Invalid string: "expected hex string"` occurs because the placeholder values in `src/config/nft.ts` are not valid Cardano addresses/policy IDs:

- `YOUR_POLICY_ID_HERE` - Not a valid hex string
- `addr1qy....` - Incomplete Cardano address
- `YOUR_IPFS_HASH` - Not a valid IPFS hash

## Testing Without Real Configuration

Since you likely don't have your policy ID or IPFS hash yet, here's how to test the interface functionality:

### 1. Test Browsing (Works Now)
- ✅ View random NFTs
- ✅ Browse NFT gallery
- ✅ See metadata attributes
- ✅ Check availability counter
- ✅ Admin dashboard

### 2. Test With Mock Values (For Development)

If you want to test the mint flow without real blockchain interaction, you can temporarily use test values:

**Edit `src/config/nft.ts`:**

```typescript
export const NFT_CONFIG = {
  COST_PER_NFT: 50,

  // Test Policy ID (64 hex characters)
  POLICY_ID: "0000000000000000000000000000000000000000000000000000000000000000",

  // Test Cardano address (valid format)
  PROFIT_WALLET: "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp",

  // Test IPFS hash
  IPFS_HASH: "QmTest123456789",

  COLLECTION: {
    name: "Arcadian PFP Collection",
    family: "Pixel Cab Games",
    description: "A unique collection of 2000 Arcadian PFP NFTs on the Cardano blockchain"
  }
} as const;
```

**⚠️ Important Notes:**
- These are TEST values only
- They won't actually mint to the blockchain
- The transaction will likely fail at submission
- But you can test the UI flow
- **Remove before production!**

### 3. For Real Minting

You need to:

#### Step 1: Upload Images to IPFS
```bash
# Use a service like:
# - Pinata (https://pinata.cloud)
# - NFT.Storage (https://nft.storage)
# - Web3.Storage (https://web3.storage)

# Upload all images from images/nfts/images/
# Maintain the same numbering (1.png, 2.png, etc.)
# Get the IPFS hash
```

#### Step 2: Create Cardano Policy
```bash
# Using cardano-cli or a minting service
# Generate policy script
# Get policy ID (56-character hex string)
```

#### Step 3: Update Configuration
```typescript
export const NFT_CONFIG = {
  COST_PER_NFT: 50,
  POLICY_ID: "your_actual_policy_id_here",  // 56 chars hex
  PROFIT_WALLET: "addr1...",                // Your wallet
  IPFS_HASH: "QmYourActualIPFSHash",       // From step 1
  // ...
};
```

#### Step 4: Test on Cardano Testnet
- Use testnet wallet
- Use testnet addresses
- Verify minting works
- Check metadata on testnet explorer

#### Step 5: Deploy to Mainnet
- Update to mainnet addresses
- Test with small batch first
- Monitor transactions
- Verify NFTs appear correctly

## What You Can Test Now

### Without Configuration:
1. **Home Page** - Wallet connection
2. **Browse NFTs** - View all 2000 NFTs and metadata
3. **Random Selection** - Get random NFTs
4. **UI/UX** - Test all buttons and navigation
5. **Admin Dashboard** - View stats (0 sales initially)

### With Mock Configuration:
1. All of the above, plus:
2. **Mint Button** - Click through the flow
3. **Error Handling** - See how errors are displayed
4. **Transaction Building** - Test preparation steps

### With Real Configuration:
1. All of the above, plus:
2. **Actual Minting** - Mint real NFTs
3. **Blockchain Submission** - Submit to Cardano
4. **Sales Tracking** - Record sales in database
5. **Duplicate Prevention** - Test sold NFTs don't show again

## Current Features Working:

✅ **NFT Gallery**
- Random NFT selection
- Browse mode with 20 NFTs
- Full metadata display
- Image rendering

✅ **User Interface**
- Responsive design
- Loading states
- Error messages
- Status updates
- Configuration warnings

✅ **Database System**
- Track available NFTs (2000 / 2000)
- Record sales
- Prevent duplicates
- Admin dashboard

✅ **Safety Features**
- Configuration validation
- Clear error messages
- Disabled mint button when not configured
- Warning banner on mint page

## Recommended Testing Flow

1. **First**, test all UI features (working now):
   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Connect wallet
   # Browse NFTs
   # View admin dashboard
   ```

2. **Next**, set up IPFS and policy ID

3. **Then**, use test values on Cardano testnet

4. **Finally**, deploy to mainnet with real values

## Need Help?

- UI/UX issues - Everything should work now
- Configuration questions - See `NFT_SETUP.md`
- Cardano setup - See Cardano documentation
- IPFS upload - See IPFS documentation

The error you saw is **expected** and **correct** - it's preventing you from attempting to mint with invalid placeholder values. Once you configure real values, minting will work!
