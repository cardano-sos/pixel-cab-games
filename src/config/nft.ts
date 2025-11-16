// NFT Minting Configuration
export const NFT_CONFIG = {
  // Total supply
  TOTAL_SUPPLY: 2000,

  // Cost per NFT in ADA
  COST_PER_NFT: 50,

  // Cardano Policy ID
  // AUTO-GENERATED from MINTTING_WALLET_OUTPUT_MNEMONIC if not set
  // You can manually override by setting POLICY_ID in .env
  // The same mnemonic always produces the same policy ID
  // Note: This is a server-side env var - use /api/config/policy to fetch it client-side
  POLICY_ID: "AUTO_GENERATED",

  // Profit wallet address - Set via environment variable or replace here
  PROFIT_WALLET: process.env.NEXT_PUBLIC_PROFIT_WALLET || "addr1qy....",

  // Use base64 embedded images (no IPFS needed)
  // Images are chunked into 64-byte pieces to comply with Cardano metadata limits
  USE_BASE64_IMAGES: true,

  // Collection information
  COLLECTION: {
    name: "Arcadian PFP Collection",
    family: "Pixel Cab Games",
    description: "A unique collection of 2000 Arcadian PFP NFTs on the Cardano blockchain"
  }
} as const;
