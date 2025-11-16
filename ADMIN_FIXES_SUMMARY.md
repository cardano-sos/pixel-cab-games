# Admin Endpoint Fixes Summary

## Issues Fixed

### 1. ✅ Authentication Not Working
**Problem:** You could hit the admin endpoint without logging in.

**Root Cause:** The Discord auth was trying to verify user IDs from bot tokens, which doesn't work. Bot tokens authenticate as the bot, not as a specific user.

**Solution:** Switched to simple bot token verification. The endpoint now checks if the provided token matches your `DISCORD_BOT_TOKEN` in `.envrc`.

**Files Changed:**
- `src/app/api/admin/stats/route.ts` - Now uses `requireBotToken()` instead of `requireDiscordAuth()`

### 2. ✅ Recent Sales Not Showing
**Problem:** Sales data wasn't being displayed properly.

**Root Cause:** The response was using `sales` but the data structure expected `recentSales`.

**Solution:**
- Fixed to properly map and display recent sales
- Limited to 10 most recent sales
- Properly formats all sale fields (nftId, walletAddress, txHash, soldAt)

### 3. ✅ Network Indicator Added
**Problem:** No way to tell which database table (preprod/mainnet) the data is coming from.

**Solution:** Added `network` field to the response that shows "PREPROD" or "MAINNET".

**Files Changed:**
- `src/app/api/admin/stats/route.ts` - Imports `getCurrentNetwork()` and includes it in response

## New Response Format

```json
{
  "network": "PREPROD",
  "totalSupply": 2000,
  "sold": 0,
  "available": 2000,
  "recentSales": [
    {
      "nftId": 1,
      "walletAddress": "addr_test1...",
      "txHash": "abc123...",
      "soldAt": "1/15/2025, 3:45:00 PM"
    }
  ]
}
```

## How to Use

### 1. Reset Your Discord Bot Token (REQUIRED)
Your token was exposed and must be regenerated:
1. Go to https://discord.com/developers/applications
2. Select your bot → "Bot" → "Reset Token"
3. Copy the new token

### 2. Update `.envrc`
```bash
export DISCORD_BOT_TOKEN='YOUR_NEW_TOKEN_HERE'
```

You can remove the `DISCORD_ADMIN_USER_IDS` line - it's not needed anymore.

### 3. Reload Environment
```bash
direnv allow
```

### 4. Test It
```bash
# Using the test script
./test-admin.sh

# Or manually
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bot YOUR_NEW_TOKEN"
```

## Security Model

**Simple and Secure:**
- Anyone with the bot token = admin access
- Bot token is in `.envrc` (gitignored, never committed)
- Only you have the bot token
- No complex user ID matching needed

## Files Updated

### Core Functionality
- ✅ `src/app/api/admin/stats/route.ts` - Fixed auth and response format

### Documentation
- ✅ `DISCORD_AUTH.md` - Updated to reflect bot token approach
- ✅ `DISCORD_SETUP_TODO.md` - Simplified setup steps
- ✅ `.envrc.example` - Removed user ID requirement

### Testing
- ✅ `test-admin.sh` - New test script for easy verification

## Testing Checklist

- [ ] Reset Discord bot token
- [ ] Update `DISCORD_BOT_TOKEN` in `.envrc`
- [ ] Run `direnv allow`
- [ ] Start dev server (`npm run dev`)
- [ ] Run `./test-admin.sh`
- [ ] Verify you see network indicator
- [ ] Verify auth fails without token
- [ ] Verify auth succeeds with correct token

## Next Steps

1. **Reset your token NOW** (it was exposed)
2. Update `.envrc` with new token
3. Test the endpoint
4. Verify authentication is working
5. Check that sales data appears when you have sales

See `DISCORD_SETUP_TODO.md` for detailed step-by-step instructions.
