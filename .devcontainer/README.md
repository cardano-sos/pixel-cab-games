# Dev Container Environment Setup

This project uses a dev container for consistent development environments. To ensure environment variables are properly loaded in the container, follow these steps:

## Quick Start

### 1. Ensure .envrc exists on your host machine

```bash
# On your host machine (outside the container)
cp .envrc.example .envrc
# Edit .envrc with your actual values
```

### 2. Source .envrc on host before starting container

```bash
# On your host machine (outside the container)
source .envrc

# Verify variables are exported
echo $POLICY_ID
echo $NEXT_PUBLIC_PROFIT_WALLET
```

### 3. Rebuild/restart the dev container

The container will automatically pick up environment variables from your host via the `remoteEnv` configuration.

## How It Works

The devcontainer.json is configured to:

1. **Pass host environment variables** to the container via `remoteEnv`
2. **Source .envrc on startup** via `postStartCommand`
3. **Load environment script** that validates and displays loaded variables

## Verifying Environment Variables in Container

Once inside the dev container, verify variables are loaded:

```bash
# Inside the dev container terminal
echo $POLICY_ID
echo $NEXT_PUBLIC_PROFIT_WALLET
echo $MINTTING_WALLET_OUTPUT_MNEMONIC

# Or run the load script manually
bash .devcontainer/load-env.sh
```

## Running the Development Server

```bash
# Inside the dev container
npm run dev
```

The Next.js server should now have access to all environment variables.

## Troubleshooting

### Environment variables not loading in Next.js

**Symptom**: Warning banner shows "Configuration Required" even though variables are set

**Solution**:
1. Ensure you sourced .envrc on your host before starting the container:
   ```bash
   source .envrc
   ```

2. Rebuild the dev container to pick up new environment variables:
   - In VS Code: Command Palette → "Dev Containers: Rebuild Container"
   - Or restart the dev container

3. Verify the variables inside the container:
   ```bash
   bash .devcontainer/load-env.sh
   ```

### Variables show as empty

**Cause**: The .envrc file wasn't sourced on the host, or the container wasn't restarted after setting variables

**Solution**:
1. Exit the dev container
2. On host, run: `source .envrc`
3. Verify on host: `echo $POLICY_ID`
4. Rebuild/restart the dev container

### Next.js doesn't see NEXT_PUBLIC_* variables

**Cause**: Next.js needs environment variables present when the dev server starts

**Solution**:
1. Stop the dev server (Ctrl+C)
2. Verify variables are in environment: `echo $POLICY_ID`
3. If empty, run: `bash .devcontainer/load-env.sh`
4. Start dev server: `npm run dev`

## Alternative: Manual Loading

If automatic loading doesn't work, you can manually source before starting dev server:

```bash
# Inside dev container
source .envrc
npm run dev
```

Or create a wrapper script in package.json:

```json
{
  "scripts": {
    "dev:env": "source .envrc && npm run dev"
  }
}
```

## Security Notes

- `.envrc` is gitignored - never commit it
- The `remoteEnv` configuration only reads from host environment
- No secrets are stored in the container image
