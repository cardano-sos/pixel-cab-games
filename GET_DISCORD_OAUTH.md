# How to Get Discord OAuth Credentials

## Step 1: Go to Discord Developer Portal

1. Navigate to https://discord.com/developers/applications
2. Select your application (or create a new one)

## Step 2: Get Your Client ID

1. On the **General Information** page
2. You'll see **Application ID** (this is your Client ID)
3. Click **Copy** to copy it

**Save this for later:** This is your `DISCORD_CLIENT_ID`

## Step 3: Get Your Client Secret

1. Still on the **General Information** page
2. Look for **Client Secret**
3. Click **Reset Secret** (if you've never created one, it will say "Add Secret")
4. Confirm the action
5. Click **Copy** to copy the secret (you'll only see it once!)

**Save this for later:** This is your `DISCORD_CLIENT_SECRET`

## Step 4: Add OAuth Redirect URL

1. Click **OAuth2** in the left sidebar
2. Scroll to **Redirects**
3. Click **Add Redirect**
4. Add these URLs:

   **For Development:**
   ```
   http://localhost:3000/api/auth/discord/callback
   ```

   **For Production (when you deploy):**
   ```
   https://yourdomain.com/api/auth/discord/callback
   ```

5. Click **Save Changes**

## Step 5: Note Your Credentials

You should now have:

```bash
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=abc123def456ghi789
```

## What's Next?

Once you have these credentials:

1. Add them to your `.envrc` file
2. I'll implement the OAuth login flow
3. Users will be able to login with their Discord accounts
4. Only your Discord user ID will have admin access

---

**Ready?** Once you have the Client ID and Client Secret, let me know and I'll implement the OAuth flow!
