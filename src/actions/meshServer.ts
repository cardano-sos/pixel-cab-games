"use server";

import { BlockfrostProvider } from "@meshsdk/core";
import { MeshWallet, AppWallet } from "@meshsdk/core";

// Utility function to create and validate blockchain provider
export const createBlockchainProvider = async () => {
  const APIKEY = process.env.BLOCKFROST_PROJECT_ID;

  if (!APIKEY) {
    throw new Error("BLOCKFROST_PROJECT_ID environment variable is not set");
  }

  return new BlockfrostProvider(APIKEY);
};


function convertWords(words: string): string[] {
  const wordArray = words.split(' ');
  const solutionArray: string[] = [];

  for (let i = 0; i < wordArray.length; i++) {
    solutionArray.push(wordArray[i]);
  }

  return solutionArray;
}


// Utility function to create wallet instance
export const createWallet = async (blockchainProvider: BlockfrostProvider) => {
  const MNEMONIC = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;

  if (!MNEMONIC) {
    throw new Error(
      "MINTTING_WALLET_OUTPUT_MNEMONIC environment variable is not set"
    );
  }

  const mnemonicWords = convertWords(MNEMONIC)

  return new MeshWallet({
    networkId: 0,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
      type: "mnemonic",
      words: mnemonicWords,
    },
  });
};

export async function createAppWallet(blockchainProvider: BlockfrostProvider) {
  const MNEMONIC = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;

  if (!MNEMONIC) {
    throw new Error(
      "MINTTING_WALLET_OUTPUT_MNEMONIC environment variable is not set"
    );
  }

  const mnemonicWords = convertWords(MNEMONIC)

  // 1 is mainnet
  // 0 is pre-prod
  const wallet = new AppWallet({
    networkId: 0,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
      type: 'mnemonic',
      words: mnemonicWords,
    },
  })
  return wallet
}

// Function to validate wallet configuration
export const validateWalletConfig = async () => {
  try {
    const blockchainProvider = await createBlockchainProvider();
    const wallet = await createWallet(blockchainProvider);

    const usedAddress = await wallet.getUsedAddress();
    const changeAddress = await wallet.getChangeAddress();

    return {
      success: true,
      data: {
        usedAddress,
        changeAddress,
        networkId: 0,
        isValid: true,
      },
    };
  } catch (error) {
    console.error("Wallet validation error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while validating the wallet",
    };
  }
};
