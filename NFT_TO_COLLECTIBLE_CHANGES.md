# NFT → Collectible Terminology Changes

## Summary
Replaced all user-facing instances of "NFT" with "Collectible" throughout the application while preserving technical variable names, database fields, and API endpoints.

## Files Modified

### Frontend UI (User-Facing Text)

**`src/app/mint/page.tsx`:**
- Page title: "Mint Pixel Cab NFT" → "Mint Pixel Cab Collectible"
- Description: "Mint a randomly selected NFT" → "Mint a randomly selected Collectible"
- Configuration message: "Before you can mint NFTs" → "Before you can mint Collectibles"
- Mystery box: "Mystery NFT" → "Mystery Collectible"
- Success heading: "Your NFT!" → "Your Collectible!"
- Success messages:
  - "✅ NFT minted and confirmed" → "✅ Collectible minted and confirmed"
  - "🎉 NFT minted!" → "🎉 Collectible minted!"
- Error messages: "Failed to mint NFT" → "Failed to mint Collectible"
- Cost label: "One NFT per mint" → "One Collectible per mint"
- Queue status: "🔨 Minting your NFT..." → "🔨 Minting your Collectible..."
- Buttons:
  - "Mint NFT (X ADA)" → "Mint Collectible (X ADA)"
  - "Mint Another NFT" → "Mint Another Collectible"

**`src/app/layout.tsx`:**
- Meta title: "Pixel Cab Games - Cardano NFT Minting" → "Pixel Cab Games - Cardano Collectible Minting"
- Meta description: "Mint unique Pixel Cab Games NFTs" → "Mint unique Pixel Cab Games Collectibles"

### API Routes (User-Facing Messages)

**`src/app/api/mint/build-mint-tx/route.ts`:**
- Error messages:
  - "No NFTs available" → "No Collectibles available"
  - "No NFTs available - all were just reserved" → "No Collectibles available - all were just reserved"

**`src/app/api/mint/submit-mint-tx/route.ts`:**
- Success messages:
  - "Successfully minted and confirmed NFT!" → "Successfully minted and confirmed Collectible!"
  - "NFT minted! Confirmation may take a minute..." → "Collectible minted! Confirmation may take a minute..."

## What Was NOT Changed

### Technical Code (Preserved for Consistency)
- Variable names: `nftId`, `nftData`, `mintedNFTs`, `NFTMetadata`, `MintedNFT`, `AvailableNFT`
- Database columns: `nft_id`, `nft_sales`, etc.
- Function names: `markNFTAsSold()`, `getRandomAvailableNFTIds()`, etc.
- File names: `nft.ts`, `view-nft`, etc.
- API endpoints: `/api/nfts/`, `/api/nft/metadata/`, etc.
- Constants: `COST_PER_NFT`, `USE_BASE64_IMAGES`
- Comments and console logs (internal documentation)

### Why Keep Technical Names?
1. **Database Compatibility**: Changing column names would break existing data
2. **API Stability**: Changing endpoints would break integrations
3. **Code Consistency**: Variables match database fields and API responses
4. **Migration Complexity**: Would require updating all related code and docs
5. **Industry Standard**: "NFT" is still the technical blockchain term

## User Experience Impact

### Before:
```
Page Title: "Mint Pixel Cab NFT"
Button: "Mint NFT (50 ADA)"
Success: "✅ NFT minted and confirmed!"
```

### After:
```
Page Title: "Mint Pixel Cab Collectible"
Button: "Mint Collectible (50 ADA)"
Success: "✅ Collectible minted and confirmed!"
```

## Testing Checklist

- [x] Build completes successfully
- [ ] Page loads correctly
- [ ] Button text shows "Mint Collectible"
- [ ] Success message shows "Collectible minted"
- [ ] Error messages use "Collectible"
- [ ] Page title/metadata updated
- [ ] Queue status messages use "Collectible"
- [ ] No broken functionality

## Notes

The term "NFT" is still used internally in:
- Code variable names (for clarity and consistency)
- Database schema (to avoid migration)
- API endpoints (to avoid breaking changes)
- Console logs and debug messages (for developers)

This approach provides a better user experience with the "Collectible" branding while maintaining technical accuracy and avoiding disruptive code changes.
