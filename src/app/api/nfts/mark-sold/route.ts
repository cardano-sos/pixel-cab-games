import { NextRequest, NextResponse } from 'next/server';
import { markNFTAsSold, isNFTSold } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nftId, walletAddress, txHash } = body;

    // Validation
    if (!nftId || !walletAddress || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: nftId, walletAddress, txHash' },
        { status: 400 }
      );
    }

    const id = parseInt(nftId, 10);

    if (isNaN(id) || id < 1 || id > 2000) {
      return NextResponse.json(
        { error: 'Invalid NFT ID. Must be between 1 and 2000.' },
        { status: 400 }
      );
    }

    // Check if already sold
    if (isNFTSold(id)) {
      return NextResponse.json(
        { error: `NFT ${id} is already sold` },
        { status: 409 }
      );
    }

    // Mark as sold
    markNFTAsSold(id, walletAddress, txHash);

    return NextResponse.json({
      success: true,
      message: `NFT ${id} marked as sold`,
      nftId: id,
      walletAddress,
      txHash
    });
  } catch (error: any) {
    console.error('Error marking NFT as sold:', error);
    return NextResponse.json(
      { error: 'Failed to mark NFT as sold', details: error.message },
      { status: 500 }
    );
  }
}
