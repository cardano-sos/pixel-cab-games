# Base64 Embedded Images - How It Works

## Overview

Instead of using IPFS, this application embeds NFT images directly as **base64** in the on-chain metadata. This means:

✅ No IPFS upload required
✅ Images stored permanently on-chain
✅ No external dependencies
✅ Complete decentralization
✅ Images can never be lost or taken down

## How It Works

### 1. Image Storage
Your NFT images are stored in:
```
images/nfts/images/
├── 1.png
├── 2.png
├── 3.png
...
└── 2000.png
```

### 2. During Minting
When a user mints an NFT:

1. **User selects NFT** (e.g., #348)
2. **Image is loaded** from `images/nfts/images/348.png`
3. **Converted to base64** via API route `/api/nfts/348/image`
4. **Metadata created** with base64 image:
   ```json
   {
     "name": "Arcadian PFP #348",
     "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
     "attributes": [...]
   }
   ```
5. **Transaction built** with embedded metadata
6. **User signs** transaction in wallet
7. **Submitted** to Cardano blockchain
8. **NFT appears** in user's wallet with image

### 3. Viewing the NFT
When viewing the NFT:
- Cardano wallets read the on-chain metadata
- Extract the base64 image data
- Decode and display the image
- No external fetch required!

## Advantages

### Permanent Storage
- Image is on the blockchain forever
- No reliance on IPFS pinning services
- No broken image links
- Truly decentralized

### Simplicity
- No IPFS account needed
- No upload step
- No pin management
- No additional costs

### Security
- Image can't be changed
- No DNS hijacking risk
- No IPFS gateway issues
- Fully trustless

## Considerations

### Transaction Size
Base64 encoding increases size by ~33%:
- Original PNG: ~50-100 KB
- Base64 encoded: ~65-130 KB
- Still within Cardano limits

### Transaction Fees
Larger metadata = higher transaction fees:
- Small NFT: ~0.5 ADA
- Medium NFT: ~1-2 ADA
- Large NFT: ~2-3 ADA

You can adjust your minting price accordingly.

### Image Size Optimization

To keep fees reasonable, optimize your images:

```bash
# Using pngquant (reduces size by 60-80%)
pngquant --quality=65-80 images/nfts/images/*.png --output images/nfts/images/

# Using optipng (lossless compression)
optipng -o7 images/nfts/images/*.png

# Using imagemagick (resize if needed)
mogrify -resize 512x512 images/nfts/images/*.png
```

Recommended image specs:
- **Size**: 512x512 or 1024x1024 pixels
- **Format**: PNG (supports transparency)
- **Optimization**: Medium compression
- **File size**: 50-100 KB per image

## Implementation

### API Route
File: `src/app/api/nfts/[id]/image/route.ts`

```typescript
// Converts NFT image to base64
export async function GET(request, { params }) {
  const nftId = parseInt(params.id);
  const imagePath = `images/nfts/images/${nftId}.png`;
  const base64Image = await imageToBase64(imagePath);
  return NextResponse.json({ id: nftId, base64: base64Image });
}
```

### Utility Function
File: `src/lib/imageUtils.ts`

```typescript
// Server-side image to base64 conversion
export async function imageToBase64(imagePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(fullPath);
  const base64 = imageBuffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}
```

### Minting Logic
File: `src/app/mint/page.tsx`

```typescript
// During minting
const imageResponse = await fetch(`/api/nfts/${selectedNFT.id}/image`);
const { base64 } = await imageResponse.json();

const assetMetadata = {
  name: selectedNFT.metadata.name,
  image: base64,  // Embedded base64 image
  // ... other metadata
};
```

## Wallet Compatibility

Most Cardano wallets support base64 images:

✅ **Fully Supported:**
- Nami
- Eternl
- Typhon
- Flint
- Yoroi (newer versions)

⚠️ **Partial Support:**
- Some wallets may show placeholder
- Image still stored on-chain
- Can be viewed on blockchain explorers

## Blockchain Explorers

View your NFTs on:
- **CardanoScan**: https://cardanoscan.io
- **Pool.pm**: https://pool.pm
- **CNFT.io**: https://cnft.io

All support displaying base64 embedded images.

## Alternative: IPFS Option

If you prefer IPFS instead, you can modify the code:

1. Upload images to IPFS
2. Get IPFS hash (e.g., `QmAbc123...`)
3. Update minting logic:
   ```typescript
   image: `ipfs://YOUR_IPFS_HASH/${nftId}.png`
   ```

But base64 is simpler and more permanent!

## FAQ

**Q: Can I mix base64 and IPFS?**
A: Yes, but it's recommended to stick with one approach per collection.

**Q: What if my images are too large?**
A: Optimize them first. Aim for <100 KB per image.

**Q: Do all wallets display base64 images?**
A: Most modern wallets do. Check wallet compatibility above.

**Q: Is this standard?**
A: Yes! It follows CIP-25 (Cardano NFT metadata standard).

**Q: Can I change the image later?**
A: No, once minted, the metadata is permanent (that's a good thing!).

## Testing

Test your NFT images before minting:

1. Select an NFT on the mint page
2. Open browser dev tools (F12)
3. Check Network tab for `/api/nfts/[id]/image` call
4. Verify base64 data is returned
5. Decode base64 to ensure image is correct

## Conclusion

Base64 embedding is:
- ✅ Simple to implement
- ✅ Permanently on-chain
- ✅ No external dependencies
- ✅ Fully decentralized
- ✅ Working out of the box

Your images will live forever on the Cardano blockchain! 🎉
