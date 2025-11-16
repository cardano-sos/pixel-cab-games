import { NextResponse } from 'next/server';
import { MeshWallet, BlockfrostProvider } from '@meshsdk/core';

/**
 * Get the minting wallet address
 */
export async function GET() {
  try {
    const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;
    const blockfrostKey = process.env.BLOCKFROST_PROJECT_ID;

    if (!mnemonic || !blockfrostKey) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    const blockchainProvider = new BlockfrostProvider(blockfrostKey);

    const mintingWallet = new MeshWallet({
      networkId: blockfrostKey.startsWith('mainnet') ? 1 : 0,
      fetcher: blockchainProvider,
      submitter: blockchainProvider,
      key: {
        type: 'mnemonic',
        words: mnemonic.trim().split(/\s+/)
      }
    });

    const address = await mintingWallet.getChangeAddress();

    return NextResponse.json({
      address,
      network: blockfrostKey.startsWith('mainnet') ? 'mainnet' : 'preprod'
    });

  } catch (error: any) {
    console.error('Error getting minting address:', error);
    return NextResponse.json(
      { error: 'Failed to get minting address', details: error.message },
      { status: 500 }
    );
  }
}
