# Discord Authentication Setup

## Overview
This guide explains how to set up Discord authentication for admin endpoints.

## 🚨 Important Security Notes

1. **NEVER commit Discord tokens to git**
2. **NEVER share tokens publicly** (in chat, screenshots, etc.)
3. **Regenerate tokens immediately** if they're exposed
4. **Use environment variables** for all sensitive credentials

## Step 1: Create/Reset Discord Bot Token

### If You Already Have a Bot (Token Exposed)
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to "Bot" section
4. Click **"Reset Token"**
5. Copy the new token (you'll only see it once!)

### If Creating a New Bot
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "NFT Admin Bot")
4. Navigate to "Bot" section
5. Click "Add Bot"
6. Copy the bot token (you'll only see it once!)

## Step 2: Configure Environment Variables

Add this to your `.envrc` file (or `.env.local`):

```bash
# Discord Bot Token (keep this secret!)
export DISCORD_BOT_TOKEN=MTAyMjYyNTIyMDYwNDk5MzYwMA.Gnoluc.NEW_TOKEN_HERE
```

Replace `NEW_TOKEN_HERE` with your **new** Discord bot token.

## Step 3: Load Environment Variables

### Using direnv (Recommended)
```bash
direnv allow
```

### Using .env.local
If using `.env.local`, restart your dev server:
```bash
npm run dev
```

## Step 4: Test Authentication

### Using curl
```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bot YOUR_BOT_TOKEN"
```

### Using Postman/Insomnia
1. Create a new GET request to `http://localhost:3000/api/admin/stats`
2. Add header:
   - **Key:** `Authorization`
   - **Value:** `Bot YOUR_BOT_TOKEN`
3. Send request

### Expected Response (Success)
```json
{
  "network": "PREPROD",
  "totalSupply": 2000,
  "sold": 0,
  "available": 2000,
  "recentSales": []
}
```

### Expected Response (Unauthorized - No Header)
```json
{
  "error": "Missing authorization header"
}
```

### Expected Response (Unauthorized - Invalid Token)
```json
{
  "error": "Unauthorized: Invalid bot token"
}
```

## How to Protect Other Admin Endpoints

### Example: Protect an API route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireBotToken } from '@/lib/auth/discord';

export async function GET(request: NextRequest) {
  // Verify bot token
  const authError = requireBotToken(request);
  if (authError) {
    return authError;
  }

  // Your admin logic here
  return NextResponse.json({
    message: 'Admin access granted!'
  });
}
```

### Example: Protect POST/DELETE endpoints
```typescript
export async function POST(request: NextRequest) {
  const authError = requireBotToken(request);
  if (authError) return authError;

  // Admin can now perform sensitive operations
  const body = await request.json();
  // ... your logic
}

export async function DELETE(request: NextRequest) {
  const authError = requireBotToken(request);
  if (authError) return authError;

  // Admin can now delete things
  // ... your logic
}
```

## Security Best Practices

### ✅ DO:
- Store tokens in environment variables
- Use different tokens for dev/staging/production
- Rotate tokens periodically
- Add rate limiting to admin endpoints
- Log admin actions for audit trails
- Use HTTPS in production

### ❌ DON'T:
- Commit tokens to git
- Share tokens in chat/screenshots
- Use the same token across environments
- Expose admin endpoints without authentication
- Give admin access to untrusted users
- Use Discord user tokens (use bot tokens instead)

## Troubleshooting

### "Missing authorization header"
- Check you're sending the `Authorization` header
- Format: `Authorization: Bot YOUR_TOKEN`

### "Invalid Discord token"
- Token may be expired or invalid
- Reset token in Discord Developer Portal
- Update environment variable
- Restart dev server

### "Unauthorized: Invalid bot token"
- Your bot token doesn't match `DISCORD_BOT_TOKEN` in `.envrc`
- Make sure you reset and updated the token
- Check there are no extra quotes or spaces
- Restart dev server after updating env vars

### "Cannot read properties of undefined"
- Environment variables not loaded
- Run `direnv allow` or restart dev server
- Check `.envrc` or `.env.local` exists

## Production Deployment

### Vercel
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `DISCORD_BOT_TOKEN` (secret, sensitive)
4. Redeploy

### Other Platforms
Add environment variables through your hosting platform's dashboard or CLI.

## Current Protected Endpoints

- `GET /api/admin/stats` - View sales statistics (requires Discord auth)

## Adding More Protected Endpoints

1. Create your API route file
2. Import `requireDiscordAuth`
3. Add auth check at the start of your handler
4. Return error if auth fails
5. Continue with admin logic if auth succeeds

See `src/app/api/admin/stats/route.ts` for a complete example.

## How Authentication Works

1. You make a request with `Authorization: Bot YOUR_TOKEN` header
2. The server checks if `YOUR_TOKEN` matches `DISCORD_BOT_TOKEN` in environment
3. If it matches, you're authenticated as admin
4. If not, you get 401 Unauthorized

**Security:** Only you have the bot token, so only you can access admin endpoints.
