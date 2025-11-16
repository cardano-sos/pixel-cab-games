# Deploying to Vercel

## Quick Start

### Option 1: Simple List (Copy-Paste to Dashboard)

```bash
./scripts/list-env-vars.sh
```

This outputs all your environment variables in a clean format. Copy and paste them into Vercel's dashboard:

1. Go to https://vercel.com/dashboard
2. Select your project → **Settings** → **Environment Variables**
3. For each variable, click **Add**
4. Paste the key name and value
5. Select environments: **Production**, **Preview**, **Development**
6. Check **Sensitive** for secrets (see list below)

### Option 2: Automated with Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Run the export script
./scripts/export-to-vercel.sh
```

This will:
- Prompt you to choose manual or automatic mode
- If automatic: add all variables directly to Vercel (requires login)
- If manual: generate commands you can copy-paste

## Environment Variables to Mark as Sensitive

When adding these to Vercel, check the **Sensitive** box:

- ✅ `MINTTING_WALLET_OUTPUT_MNEMONIC`
- ✅ `BLOCKFROST_PROJECT_ID`
- ✅ `JWT_SECRET`
- ✅ `DISCORD_CLIENT_SECRET`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_JWT_SECRET`
- ✅ `POSTGRES_PASSWORD`

## Important: Update for Production

Before deploying, update these values for production:

### 1. Discord Redirect URI
```bash
DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback
```

**Also update in Discord Developer Portal:**
1. Go to https://discord.com/developers/applications
2. Select your app → **OAuth2** → **Redirects**
3. Add: `https://yourdomain.com/api/auth/discord/callback`
4. Save Changes

### 2. Cardano Network (Optional)
```bash
# For mainnet deployment
CARDANO_NETWORK=mainnet

# For testnet (preprod)
CARDANO_NETWORK=preprod
```

### 3. JWT Secret (IMPORTANT!)
```bash
# Generate a strong random secret for production
JWT_SECRET=your-production-secret-here
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Link Your Project (First Time)
```bash
vercel link
```

### 4. Add Environment Variables
```bash
# Option A: Use the script
./scripts/export-to-vercel.sh

# Option B: Add manually via dashboard
# Go to Vercel Dashboard → Settings → Environment Variables
```

### 5. Deploy
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Verifying Deployment

After deployment, verify:

1. **Discord OAuth works:**
   - Visit `https://yourdomain.com/admin`
   - Click "Login with Discord"
   - Should redirect to Discord and back

2. **Database connection works:**
   - Visit `https://yourdomain.com/api/db/test`
   - Should return success message

3. **Admin stats work:**
   - Login to admin dashboard
   - Should show stats and network indicator

## Troubleshooting

### "redirect_uri_mismatch"
- You forgot to add the production redirect URI in Discord Developer Portal
- Go to Discord → OAuth2 → Redirects → Add production URL

### "Missing environment variables"
- Check Vercel Dashboard → Settings → Environment Variables
- Make sure all variables are set for Production, Preview, and Development

### "Database connection failed"
- Verify Supabase environment variables are correct
- Check `SUPABASE_SERVICE_ROLE_KEY` is set and sensitive

### "Invalid session/JWT error"
- Make sure `JWT_SECRET` is set in production
- Use a different secret than development

## Manual Environment Variable Setup

If you prefer to add variables manually, here's the complete list:

### Blockfrost (Cardano API)
```
BLOCKFROST_PROJECT_ID=your_project_id (Sensitive)
```

### Minting Wallet
```
MINTTING_WALLET_OUTPUT_MNEMONIC=your 24 word mnemonic (Sensitive)
NEXT_PUBLIC_PROFIT_WALLET=addr_...
POLICY_ID=your_policy_id
```

### Network
```
CARDANO_NETWORK=preprod (or mainnet)
DISABLE_AUTO_MIGRATIONS=true
```

### JWT
```
JWT_SECRET=your-strong-secret (Sensitive)
```

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (Sensitive)
```

### Discord OAuth
```
DISCORD_CLIENT_ID=1199173674167713802
DISCORD_CLIENT_SECRET=your_client_secret (Sensitive)
DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback
DISCORD_ADMIN_USER_IDS=306257518051590146
```

## Security Checklist

Before deploying to production:

- [ ] All sensitive variables marked as "Sensitive" in Vercel
- [ ] JWT_SECRET is strong and different from development
- [ ] Discord redirect URI updated for production domain
- [ ] Discord redirect URI added in Discord Developer Portal
- [ ] Mnemonic phrase is kept secure and never exposed
- [ ] SUPABASE_SERVICE_ROLE_KEY is marked sensitive
- [ ] Test OAuth login works on production URL
- [ ] Test admin dashboard access works
- [ ] Verify RLS policies are enabled in Supabase

## Post-Deployment

After successful deployment:

1. Visit your production URL
2. Test the minting flow
3. Test admin login with Discord
4. Verify database writes are working
5. Check that only your Discord ID has admin access

## Support

If you encounter issues:
- Check Vercel deployment logs
- Check browser console for errors
- Verify all environment variables are set
- Test each API endpoint individually
