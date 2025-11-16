# NFT Minting System Setup Guide

This document explains how the NFT minting system works and how to configure it.

## Overview

The application uses a local JSON-based database to track which NFTs have been sold, ensuring each NFT is only minted once.

## File Structure

```
pixel-cab-games/
├── images/
│   └── nfts/
│       ├── images/         # 2000 NFT PNG images (1.png - 2000.png)
│       └── metadata/       # 2000 JSON metadata files (1.json - 2000.json)
├── public/
│   └── images/            # Symlink to images folder
├── data/
│   └── nft-sales.json     # Local database tracking sold NFTs
└── src/
    ├── lib/
    │   └── db.ts          # Database utilities
    ├── config/
    │   └── nft.ts         # NFT configuration
    └── app/
        └── api/
            └── nfts/      # API routes for NFT operations
```

## How It Works

### 1. NFT Selection
- Users can browse available NFTs or get a random one
- Each NFT has a unique ID (1-2000)
- Each NFT has matching image and metadata files

### 2. Metadata Matching
- `images/nfts/images/{id}.png` - The NFT image
- `images/nfts/metadata/{id}.json` - The NFT metadata
- Metadata includes:
  - id: NFT number
  - name: NFT name (e.g., "Arcadian PFP #348")
  - attributes: Array of traits (Background, Body, Head, Eyes, Mouth, Clothing)

### 3. Sales Tracking
- When an NFT is minted, it's marked as sold in `data/nft-sales.json`
- The database stores:
  - nftId: Which NFT was sold
  - walletAddress: Buyer's wallet address
  - txHash: Transaction hash
  - soldAt: Timestamp
- Once sold, an NFT won't appear in available listings

### 4. Minting Process
1. User connects wallet
2. User selects or gets random NFT
3. User clicks "Mint NFT"
4. Transaction is built with correct metadata
5. User signs transaction in wallet
6. Transaction is submitted to blockchain
7. NFT is marked as sold in local database

## Configuration

### 1. NFT Settings (`src/config/nft.ts`)

Update these values before deploying:

```typescript
export const NFT_CONFIG = {
  COST_PER_NFT: 50,                    // Price in ADA
  POLICY_ID: "YOUR_POLICY_ID_HERE",    // Your Cardano policy ID
  PROFIT_WALLET: "addr1qy....",        // Your wallet address
  IPFS_HASH: "YOUR_IPFS_HASH",        // IPFS hash after uploading images
  // ... other settings
};
```

### 2. Upload Images to IPFS

Before minting:
1. Upload all images to IPFS (maintaining the same ID numbering)
2. Update `IPFS_HASH` in `src/config/nft.ts`
3. Verify IPFS links work: `ipfs://YOUR_HASH/1.png`

### 3. Create Cardano Policy

Generate a policy ID for your NFT collection:
```bash
# Use cardano-cli or a minting service to create a policy
# Update POLICY_ID in src/config/nft.ts
```

## API Routes

### GET /api/nfts/available
Get available (unsold) NFTs

**Query Parameters:**
- `mode=random` - Get one random NFT
- `mode=count` - Get count of available NFTs
- `mode=all&limit=20` - Get list of available NFTs (default limit: 10)

**Example Response (random):**
```json
{
  "id": 348,
  "metadata": {
    "id": 348,
    "name": "Arcadian PFP #348",
    "attributes": [...]
  },
  "imagePath": "/images/nfts/images/348.png"
}
```

### GET /api/nfts/[id]
Get specific NFT by ID

**Example Response:**
```json
{
  "id": 348,
  "metadata": {...},
  "imagePath": "/images/nfts/images/348.png",
  "isSold": false,
  "sale": null
}
```

### POST /api/nfts/mark-sold
Mark an NFT as sold

**Request Body:**
```json
{
  "nftId": 348,
  "walletAddress": "addr1...",
  "txHash": "abc123..."
}
```

## Database Schema

The `data/nft-sales.json` file structure:

```json
{
  "sales": [
    {
      "nftId": 348,
      "walletAddress": "addr1qy...",
      "txHash": "abc123...",
      "soldAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

## Important Notes

### Security
- The local database is simple and suitable for development/small deployments
- For production, consider using a proper database (PostgreSQL, MongoDB, etc.)
- The database file is excluded from git (in .gitignore)
- Never commit the `data/` folder with real sales data

### Backup
- Regularly backup `data/nft-sales.json`
- Keep transaction hashes for verification
- Consider implementing database replication for production

### Verification
After minting, verify:
1. Transaction appears on blockchain explorer
2. NFT appears in buyer's wallet
3. NFT is marked as sold in database
4. NFT no longer appears in available listings

## Troubleshooting

### Images Not Loading
- Check symlink: `ls -la public/images`
- Verify images exist: `ls images/nfts/images/ | wc -l` (should be 2000)
- Check Next.js is serving static files correctly

### NFT Already Sold Error
- Check `data/nft-sales.json` for the NFT ID
- If error is incorrect, manually edit the JSON file
- Consider adding admin tools for database management

### Metadata Mismatch
- Verify image and metadata files have matching IDs
- Check JSON format is valid: `cat images/nfts/metadata/1.json | jq`
- Ensure all metadata files exist

## Future Enhancements

Consider implementing:
- Admin dashboard to view sales
- Database backup automation
- Email notifications on sale
- Rarity filtering
- Price tiers based on rarity
- Whitelist/presale functionality
- Real-time inventory updates
- Transaction verification
