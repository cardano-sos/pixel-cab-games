# Discord Bot Token Authentication - Quick Setup

## What You Need to Do Now

### Step 1: Reset Your Discord Bot Token
Your token was exposed and **MUST be regenerated**:

1. Go to https://discord.com/developers/applications
2. Select your bot application
3. Click on **"Bot"** in the left sidebar
4. Click **"Reset Token"** button
5. Click **"Yes, do it!"**
6. **Copy the new token** (you'll only see it once!)

### Step 2: Update Your `.envrc` File

Open `.envrc` and replace this line:
```bash
export DISCORD_BOT_TOKEN='YOUR_DISCORD_BOT_TOKEN_HERE'
```

With your **new** bot token:
```bash
export DISCORD_BOT_TOKEN='MTAyMjYyNTIyMDYwNDk5MzYwMA.Gnoluc.YOUR_NEW_TOKEN_HERE'
```

**Note:** You can remove the `DISCORD_ADMIN_USER_IDS` line from `.envrc` - we're using simple bot token authentication instead.

### Step 3: Reload Environment Variables

```bash
direnv allow
```

Or if using a different method, restart your dev server.

### Step 4: Test the Setup

```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bot YOUR_NEW_BOT_TOKEN"
```

**Expected Success Response:**
```json
{
  "network": "PREPROD",
  "totalSupply": 2000,
  "sold": 0,
  "available": 2000,
  "recentSales": []
}
```

**If it fails**, you'll see:
- `"Missing authorization header"` - You forgot the header
- `"Unauthorized: Invalid bot token"` - Token is wrong, not set, or not reset

## How It Works

The admin endpoint checks if the provided token matches your Discord bot token in `.envrc`. Only someone with your bot token (you) can access admin endpoints.

## Summary

⚠️ **Reset your Discord bot token NOW** (it was exposed)
⚠️ Update `.envrc` with the new token
✅ Reload environment variables (`direnv allow`)
✅ Test the endpoint with the new token

## Security

- ✅ Only you have the bot token
- ✅ Bot token is in `.envrc` (gitignored)
- ✅ Anyone without the token gets 401 Unauthorized

See `DISCORD_AUTH.md` for detailed documentation.
