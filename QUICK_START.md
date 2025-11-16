# Quick Start Guide - NFT Minting with Base64 Images

## You've Already Done ✅

1. ✅ Added images to `images/nfts/images/` (2000 PNGs)
2. ✅ Added metadata to `images/nfts/metadata/` (2000 JSONs)
3. ✅ Updated `.envrc` with `PROFIT_WALLET`

## What You Need to Do Now

### Step 1: Set Environment Variables

Edit your `.envrc` file and add:

```bash
# Your wallet address (you already added this!)
NEXT_PUBLIC_PROFIT_WALLET=addr1_your_actual_wallet_address

# Your Cardano Policy ID (need to create)
POLICY_ID=your_56_character_policy_id
```

**Important**: Use `NEXT_PUBLIC_` prefix!

### Step 2: Generate Policy ID (Automatic!)

Your policy ID can be automatically generated from your mnemonic:

```bash
npm run generate-policy
```

This will output:
```
📋 Add this to your .envrc file:

POLICY_ID=abc123def456...
```

Copy that line to your `.envrc` file. Done!

See `GENERATE_POLICY.md` for detailed instructions and alternative methods.

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 4: Test the Application

1. Visit `http://localhost:3000`
2. Connect your Cardano wallet
3. Go to mint page
4. Check that warning banner is gone (if configured correctly)
5. Try minting on **testnet first**!

## How Base64 Images Work

Your images are automatically embedded in the NFT metadata:

1. User selects NFT #348
2. System reads `images/nfts/images/348.png`
3. Converts to base64 automatically
4. Embeds in on-chain metadata
5. No IPFS upload needed!

**Benefits:**
- ✅ Permanent on-chain storage
- ✅ No IPFS account required
- ✅ No broken image links
- ✅ Truly decentralized

See `BASE64_IMAGES.md` for details.

## Testing Checklist

- [ ] Set `NEXT_PUBLIC_PROFIT_WALLET` in `.envrc`
- [ ] Set `POLICY_ID` in `.envrc`
- [ ] Restart dev server
- [ ] Connect testnet wallet
- [ ] Warning banner disappears
- [ ] Browse NFTs works
- [ ] Random NFT works
- [ ] Try minting on testnet
- [ ] Check NFT in wallet
- [ ] Verify on testnet explorer

## Common Issues

### Warning Banner Still Showing
**Problem**: "Configuration Required" still appears

**Solution**:
- Check `.envrc` has `NEXT_PUBLIC_` prefix (not just `PROFIT_WALLET`)
- Restart dev server after changing `.envrc` (run `direnv allow`)
- Verify no typos in variable names

### Invalid Hex String Error
**Problem**: Error when clicking mint

**Solution**:
- Policy ID must be 56 hex characters
- Wallet address must start with `addr1` (mainnet) or `addr_test1` (testnet)
- Check for extra spaces in `.envrc`

### Images Not Loading
**Problem**: NFT images don't show

**Solution**:
- Check symlink exists: `ls -la public/images`
- Verify images exist: `ls images/nfts/images/ | wc -l` (should show 2000)
- Images should be PNG format

## Your Current Status

Based on what you've told me:

✅ Images folder created with 2000 NFTs
✅ Metadata folder with matching JSON files
✅ `.envrc` has `PROFIT_WALLET` configured
✅ `.envrc` has `MINTTING_WALLET_OUTPUT_MNEMONIC` (can generate policy!)
⏳ Need to add `NEXT_PUBLIC_` prefix to variables
⏳ Need to generate and add `POLICY_ID` (automatic via API!)

## Next Steps

1. **Update `.envrc`** with `NEXT_PUBLIC_` prefix:
   ```bash
   # Change this:
   PROFIT_WALLET=addr1...

   # To this:
   NEXT_PUBLIC_PROFIT_WALLET=addr1...
   ```

2. **Add Policy ID**:
   ```bash
   POLICY_ID=your_policy_id_here
   ```

3. **Restart server**:
   ```bash
   npm run dev
   ```

4. **Test on testnet first!**

## Resources

- `ENV_SETUP.md` - Detailed environment variable guide
- `BASE64_IMAGES.md` - How base64 embedding works
- `NFT_SETUP.md` - Complete setup guide
- `TESTING_GUIDE.md` - Testing instructions

## Support

If you run into issues:
1. Check the error message in browser console
2. Verify `.envrc` variable names (must have `NEXT_PUBLIC_` prefix for client-side vars)
3. Make sure to run `direnv allow` after `.envrc` changes
4. Test on Cardano testnet before mainnet

You're almost ready to mint! 🚀
