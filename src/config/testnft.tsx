// src/data/testnft.tsx

export interface NFTConfig {
  // NFT Details
  name: string;
  description: string;
  image: string;
  policyId: string;

  // Minting Settings
  costPerNft: number;
  maxSupply: number;
  maxPerWallet: number;

  // Wallet Settings
  profitWallet: {
    address: string;
  };

  // Royalties
  royalties: {
    percentage: number;
    address: string;
  };

  // Collection Metadata
  collection: {
    name: string;
    family: string;
  };
}

export const nftConfig: NFTConfig = {
  // NFT Details
  name: "Abstract Geometric Art",
  description: "A unique geometric abstract art piece featuring dynamic shapes and patterns",
  image: "/nft/art001.svg",
  policyId: "YOUR_POLICY_ID_HERE", // Replace with your actual policy ID

  // Minting Settings
  costPerNft: 50, // Cost in ADA
  maxSupply: 100, // Maximum number of NFTs that can be minted
  maxPerWallet: 3, // Maximum number of NFTs per wallet

  // Wallet Settings
  profitWallet: {
    address: "addr1qy...." // Replace with actual wallet address
  },

  // Royalties
  royalties: {
    percentage: 2.5, // 2.5% royalty
    address: "addr1qy...." // Replace with royalty wallet address
  },

  // Collection Metadata
  collection: {
    name: "Abstract Geometry Series",
    family: "Series 1"
  }
};

// Function to convert SVG to base64
export const getBase64Image = async (): Promise<string> => {
  try {
    const response = await fetch(nftConfig.image);
    const svgText = await response.text();
    // Use btoa for browser compatibility instead of Buffer
    const base64 = btoa(svgText);
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error('Error converting SVG to base64:', error);
    return '';
  }
};
