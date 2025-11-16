# ✅ Discord OAuth Authentication - Setup Complete!

## What I've Implemented

### 1. **Discord OAuth Login Flow**
- Users visit `/admin`
- If not logged in → shown "Login with Discord" button
- Redirected to Discord to login with their credentials
- After login, redirected back with session cookie
- Only your Discord ID has admin access

### 2. **Session Management**
- Uses JWT tokens stored in HTTP-only cookies
- Sessions last 7 days
- Secure in production (HTTPS)

### 3. **Protected Admin Endpoints**
- `/api/admin/stats` now requires valid session
- Shows authenticated user info
- Displays network indicator (PREPROD/MAINNET)
- Shows recent sales with proper formatting

### 4. **Admin Dashboard**
- Auto-checks authentication on load
- Shows login screen if not authenticated
- Full dashboard with logout button when authenticated
- Displays logged-in user's Discord username
- Network indicator on "Recent Sales" table

## Your Configuration

I found your OAuth credentials in `.envrc` and fixed them:

```bash
✅ DISCORD_CLIENT_ID='1199173674167713802'
✅ DISCORD_CLIENT_SECRET='vkNoYohcPVOdzq0r2D67ah_vGRYHmhVZ'
✅ DISCORD_REDIRECT_URI='http://localhost:3000/api/auth/discord/callback'
✅ DISCORD_ADMIN_USER_IDS='306257518051590146'
```

## Important: Configure Discord Developer Portal

You need to add the redirect URL in Discord:

1. Go to https://discord.com/developers/applications
2. Select your application
3. Click **OAuth2** in sidebar
4. Under **Redirects**, add:
   ```
   http://localhost:3000/api/auth/discord/callback
   ```
5. Click **Save Changes**

## Testing the Setup

### 1. Reload Environment Variables
```bash
direnv allow
```

### 2. Start Your Dev Server
```bash
npm run dev
```

### 3. Visit Admin Page
```
http://localhost:3000/admin
```

### 4. Expected Flow
1. ✅ You see "Admin Access Required" screen
2. ✅ Click "Login with Discord"
3. ✅ Discord asks you to authorize
4. ✅ After authorization, redirected to admin dashboard
5. ✅ You see your Discord username in header
6. ✅ Dashboard shows "Recent Sales (PREPROD)"
7. ✅ You can click "Logout" to clear session

## How It Works

### Authentication Flow
```
User visits /admin
  ↓
Not authenticated?
  ↓
Shows login button → Clicks "Login with Discord"
  ↓
Redirected to Discord OAuth
  ↓
User logs in with Discord
  ↓
Discord redirects to /api/auth/discord/callback
  ↓
Backend exchanges code for access token
  ↓
Backend fetches user info from Discord
  ↓
Checks if user.id === '306257518051590146'
  ↓
Yes? Create session cookie → Redirect to /admin
No? Show "Access Denied" error
```

### Security Features
- ✅ HTTP-only cookies (JavaScript can't access them)
- ✅ Secure flag in production
- ✅ 7-day expiration
- ✅ Server-side session verification
- ✅ Only your Discord ID can access admin

## Files Created/Modified

### New Files
- `src/lib/auth/session.ts` - Session management (JWT)
- `src/app/api/auth/discord/login/route.ts` - OAuth login
- `src/app/api/auth/discord/callback/route.ts` - OAuth callback
- `src/app/api/auth/discord/logout/route.ts` - Logout
- `GET_DISCORD_OAUTH.md` - OAuth setup guide

### Modified Files
- `src/app/api/admin/stats/route.ts` - Now requires session auth
- `src/app/admin/page.tsx` - Integrated OAuth login flow
- `.envrc` - Fixed OAuth credentials
- `.envrc.example` - Updated with OAuth variables

## API Endpoints

### Authentication
- `GET /api/auth/discord/login` - Redirects to Discord OAuth
- `GET /api/auth/discord/callback` - Handles OAuth response
- `GET /api/auth/discord/logout` - Clears session

### Admin (Protected)
- `GET /api/admin/stats` - Requires authentication
  - Returns 401 if not logged in
  - Returns stats with user info if authenticated

## Response Format

When authenticated, `/api/admin/stats` returns:

```json
{
  "authenticatedUser": {
    "id": "306257518051590146",
    "username": "onzyone"
  },
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

## Troubleshooting

### "Access Denied: Your Discord ID (XXX) is not authorized"
- Your Discord ID doesn't match `306257518051590146`
- Check `DISCORD_ADMIN_USER_IDS` in `.envrc`
- Run `direnv allow` to reload

### "Authentication error: redirect_uri_mismatch"
- You haven't added the redirect URL in Discord Developer Portal
- Go to OAuth2 → Redirects → Add the callback URL

### "Invalid client_id or client_secret"
- Double-check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Make sure there are no extra quotes or spaces
- Run `direnv allow` to reload

### Session not persisting
- Check cookies are enabled in browser
- JWT_SECRET must be set in `.envrc`
- Try clearing browser cookies for localhost

## Production Deployment

When deploying to production:

### 1. Update `.envrc` for Production
```bash
export DISCORD_REDIRECT_URI='https://yourdomain.com/api/auth/discord/callback'
```

### 2. Add Redirect in Discord Developer Portal
```
https://yourdomain.com/api/auth/discord/callback
```

### 3. Set Environment Variables in Hosting Platform
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_ADMIN_USER_IDS`
- `JWT_SECRET` (use a strong random value!)

## Security Checklist

- ✅ `.envrc` is gitignored
- ✅ Client Secret is never exposed to browser
- ✅ Session cookies are HTTP-only
- ✅ Sessions expire after 7 days
- ✅ Only authorized Discord ID can access admin
- ✅ HTTPS in production (cookies have secure flag)

## Next Steps

1. ✅ Run `direnv allow`
2. ✅ Add redirect URL in Discord Developer Portal
3. ✅ Start dev server: `npm run dev`
4. ✅ Visit `http://localhost:3000/admin`
5. ✅ Click "Login with Discord"
6. ✅ Verify you see your username in dashboard
7. ✅ Check "Recent Sales (PREPROD)" shows network

## Questions?

See `DISCORD_AUTH.md` for detailed documentation or `GET_DISCORD_OAUTH.md` for OAuth setup instructions.

---

**Status:** ✅ Ready to test!
