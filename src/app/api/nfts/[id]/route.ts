import { NextRequest, NextResponse } from 'next/server';
import { isNFTSold, getSaleByNFTId } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const nftId = parseInt(id, 10);

    if (isNaN(nftId) || nftId < 1 || nftId > 2000) {
      return NextResponse.json(
        { error: 'Invalid NFT ID. Must be between 1 and 2000.' },
        { status: 400 }
      );
    }

    // Check if NFT exists
    const imagePath = path.join(process.cwd(), 'images', 'nfts', 'images', `${nftId}.png`);
    const metadataPath = path.join(process.cwd(), 'images', 'nfts', 'metadata', `${nftId}.json`);

    if (!fs.existsSync(imagePath) || !fs.existsSync(metadataPath)) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    // Load metadata
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Check if sold
    const isSold = isNFTSold(nftId);
    const sale = isSold ? getSaleByNFTId(nftId) : null;

    return NextResponse.json({
      id: nftId,
      metadata,
      isSold,
      sale
    });
  } catch (error: any) {
    console.error('Error fetching NFT:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFT', details: error.message },
      { status: 500 }
    );
  }
}
