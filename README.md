# Pixel Cab Games - NFT Minting Platform

A Next.js application for minting NFTs on the Cardano blockchain using the Mesh SDK.

## Features

- **Wallet Connection**: Connect Cardano wallets (Nami, Eternl, Flint, etc.)
- **NFT Minting**: Mint custom NFTs with configurable metadata
- **Session Management**: Persistent wallet sessions with JWT authentication
- **Responsive Design**: Mobile-friendly interface with custom theme
- **Transaction Handling**: Complete transaction lifecycle (prepare → sign → submit)

## Tech Stack

- **Framework**: Next.js 15.3.3 with React 19
- **Blockchain**: Cardano via Mesh SDK (@meshsdk/core, @meshsdk/react)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom theme
- **Authentication**: JWT for session management

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Cardano wallet (Nami, Eternl, Flint, etc.)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pixel-cab-games
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

**Option A: Using direnv (Recommended)**
```bash
cp .envrc.example .envrc
# Edit .envrc with your values
direnv allow
```

**Option B: Using .env file**
```bash
cp .envrc.example .env
# Edit .env with your values
```

See [ENVRC_SETUP.md](./ENVRC_SETUP.md) for direnv setup or [ENV_SETUP.md](./ENV_SETUP.md) for .env setup.

4. Configure your environment variables:
```env
BLOCKFROST_PROJECT_ID=your_blockfrost_project_id
MINTTING_WALLET_OUTPUT_MNEMONIC=your_wallet_mnemonic
JWT_SECRET=your-secure-secret-key-here
NEXT_PUBLIC_PROFIT_WALLET=your_wallet_address
POLICY_ID=your_policy_id  # Optional - auto-generates if not set
```

5. Update NFT configuration in `src/data/testnft.tsx`:
   - Set your policy ID
   - Configure wallet addresses
   - Set pricing and supply limits

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
npm run build
npm start
```

## Configuration

### NFT Settings (`src/config/nft.ts`)

Configure your NFT collection parameters:

- **Policy ID**: Your Cardano policy ID (replace `YOUR_POLICY_ID_HERE`)
- **Cost**: 50 ADA per NFT
- **Supply**: 2000 unique NFTs
- **IPFS Hash**: Upload images to IPFS and update hash
- **Profit Wallet**: Address to receive minting payments (replace `addr1qy....`)

**Important**: Before deploying, update these placeholder values in `src/config/nft.ts`

### NFT Collection Structure

The application uses a collection of 2000 unique NFTs:
- Images: `images/nfts/images/1.png` through `2000.png`
- Metadata: `images/nfts/metadata/1.json` through `2000.json`
- Each NFT is tracked to prevent duplicate minting

See [NFT_SETUP.md](./NFT_SETUP.md) for detailed setup instructions.

### Theme (`src/config/theme.ts`)

Customize colors and styling:
- Primary: #000000 (Black)
- Secondary: #04d9ff (Cyan Blue)
- Accent: #ff6ec7 (Pink)
- Highlight: #a3f1ff (Light Blue)

## Project Structure

```
pixel-cab-games/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── mint/         # Minting page
│   │   ├── _components/  # Shared components
│   │   └── layout.tsx    # Root layout
│   ├── config/           # Theme configuration
│   ├── data/             # NFT configuration
│   ├── providers/        # React context providers
│   └── actions/          # Server actions
├── public/               # Static assets
└── package.json
```

## Usage

1. **Connect Wallet**: Click on your preferred Cardano wallet
2. **View Mint Page**: After connection, you'll be redirected to the mint page
3. **Browse or Random**: Choose to browse available NFTs or get a random one
4. **View Details**: See the NFT image and attributes (Background, Body, Head, Eyes, Mouth, Clothing)
5. **Mint**: Click the mint button and sign the transaction in your wallet
6. **Confirm**: Wait for transaction confirmation

### NFT Features

- **Random Selection**: Get a random available NFT
- **Browse Mode**: View and select from available NFTs
- **Availability Tracker**: See how many NFTs remain (X / 2000)
- **Duplicate Prevention**: Each NFT can only be minted once
- **Metadata Matching**: Each NFT image matches its on-chain metadata

## Security Notes

- Never commit your `.env` or `.envrc` files
- Keep your mnemonic phrase secure
- Use environment variables for sensitive data
- Test thoroughly on testnet before mainnet deployment

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run clean` - Clean build artifacts and dependencies

## License

Private

## Support

For issues or questions, please open an issue in the repository.
