# Using .envrc with direnv

This project supports using `.envrc` with [direnv](https://direnv.net/) for environment variable management.

## What is direnv?

direnv is a shell extension that loads and unloads environment variables depending on the current directory. When you `cd` into a directory with a `.envrc` file, the variables are automatically exported.

## Setup

### 1. Install direnv

**macOS:**
```bash
brew install direnv
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install direnv

# Fedora
sudo dnf install direnv
```

**Add to your shell:**

For bash, add to `~/.bashrc`:
```bash
eval "$(direnv hook bash)"
```

For zsh, add to `~/.zshrc`:
```bash
eval "$(direnv hook zsh)"
```

Reload your shell:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

### 2. Create .envrc file

Copy the example:
```bash
cp .envrc.example .envrc
```

Edit `.envrc` with your values:
```bash
# Minting wallet mnemonic (24 words)
export MINTTING_WALLET_OUTPUT_MNEMONIC="word1 word2 word3 ... word24"

# Your profit wallet address
export NEXT_PUBLIC_PROFIT_WALLET=addr1_your_wallet_address

# JWT secret
export JWT_SECRET=your-secret-key

# Optional: Blockfrost project ID (for mainnet/testnet)
export BLOCKFROST_PROJECT_ID=your_blockfrost_id

# Optional: Policy ID (auto-generated if not set)
# export POLICY_ID=your_policy_id
```

### 3. Allow direnv

```bash
direnv allow
```

You'll see:
```
direnv: loading .envrc
direnv: export +BLOCKFROST_PROJECT_ID +JWT_SECRET +MINTTING_WALLET_OUTPUT_MNEMONIC +NEXT_PUBLIC_PROFIT_WALLET
```

## Verify Environment Variables

Check that variables are exported:

```bash
echo $NEXT_PUBLIC_PROFIT_WALLET
echo $MINTTING_WALLET_OUTPUT_MNEMONIC
```

## Auto-Generated Policy ID

The policy ID is automatically generated from your `MINTTING_WALLET_OUTPUT_MNEMONIC`.

To see what it will be:
```bash
npm run generate-policy
```

This will show you the policy ID. You can optionally export it:
```bash
# Add to .envrc if you want to override auto-generation
export POLICY_ID=f22674fb80c6bcfee57b6127c7bd4211c06a73bd61dedc16d00e85f6
```

But it's **not required** - the app will generate it automatically!

## Running the App

With direnv, environment variables are automatically available:

```bash
# Just start the dev server
npm run dev
```

All variables are already in the environment - no need for `.env` files!

## Benefits of direnv

✅ **Automatic loading**: Variables load when you `cd` into directory
✅ **Automatic unloading**: Variables unload when you leave
✅ **Per-project**: Different projects can have different values
✅ **Shell-agnostic**: Works with bash, zsh, fish, etc.
✅ **No dotenv needed**: Variables are real environment variables

## Troubleshooting

### Variables not loading

Make sure you ran:
```bash
direnv allow
```

### Variables not in Next.js

For browser-accessible variables, use `NEXT_PUBLIC_` prefix:
```bash
export NEXT_PUBLIC_PROFIT_WALLET=addr1...
export POLICY_ID=abc123...
```

### Check if direnv is working

```bash
# Should show environment variables
direnv status

# Should show your variables
env | grep NEXT_PUBLIC
```

### Reload .envrc

After editing `.envrc`:
```bash
direnv allow
```

Or just `cd` out and back into the directory.

## Security

- `.envrc` is in `.gitignore` - never commit it
- Keep your mnemonic secure
- Use different values for testnet/mainnet

## Example .envrc

```bash
# Pixel Cab Games NFT Minting - Environment Variables

# Minting Wallet (REQUIRED)
export MINTTING_WALLET_OUTPUT_MNEMONIC="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24"

# Profit Wallet (REQUIRED - where you receive payments)
export NEXT_PUBLIC_PROFIT_WALLET=addr1qy2jt0qpqz4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z4z

# JWT Secret (REQUIRED - for session management)
export JWT_SECRET=change-this-to-a-secure-random-string

# Blockfrost (OPTIONAL - needed for actual minting)
# Get free API key at https://blockfrost.io
export BLOCKFROST_PROJECT_ID=mainnetABC123456789

# Policy ID (OPTIONAL - auto-generated if not set)
# Uncomment to override auto-generation
# export POLICY_ID=f22674fb80c6bcfee57b6127c7bd4211c06a73bd61dedc16d00e85f6

# Done! Run: direnv allow
```

## Migration from .env

If you have a `.env` file:

1. Copy values to `.envrc`
2. Add `export` before each variable
3. Run `direnv allow`
4. Delete `.env` (optional)

Example:
```bash
# .env
NEXT_PUBLIC_PROFIT_WALLET=addr1...

# becomes .envrc
export NEXT_PUBLIC_PROFIT_WALLET=addr1...
```

## Dev Container Usage

If you're using a dev container (VS Code Remote Containers), see [.devcontainer/README.md](.devcontainer/README.md) for specific instructions.

**Quick setup for dev containers:**

1. Create and configure `.envrc` on your **host machine**
2. Source it before starting the container: `source .envrc`
3. Rebuild/restart the dev container
4. Use `npm run dev:env` to start the server with environment loaded

The dev container is configured to automatically pass environment variables from your host.

## Next Steps

1. Create `.envrc` from `.envrc.example`
2. Update with your values
3. Run `direnv allow` (or `source .envrc` for dev containers)
4. Start dev server: `npm run dev` (or `npm run dev:env` in dev containers)
5. Policy ID will auto-generate from your mnemonic! 🎉
