import { NextRequest, NextResponse } from 'next/server';
import { getAvailableNFTIds, getRandomAvailableNFTId } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'all', 'random', or 'count'
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const availableIds = await getAvailableNFTIds();

    if (mode === 'count') {
      return NextResponse.json({
        count: availableIds.length,
        total: 2000
      });
    }

    if (mode === 'random') {
      const randomId = await getRandomAvailableNFTId();
      if (!randomId) {
        return NextResponse.json(
          { error: 'No NFTs available' },
          { status: 404 }
        );
      }

      // Load metadata for the random NFT
      const metadataPath = path.join(process.cwd(), 'images', 'nfts', 'metadata', `${randomId}.json`);
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      return NextResponse.json({
        id: randomId,
        metadata
      });
    }

    // Return limited list of available IDs with metadata
    const limitedIds = availableIds.slice(0, limit);
    const nfts = limitedIds.map(id => {
      const metadataPath = path.join(process.cwd(), 'images', 'nfts', 'metadata', `${id}.json`);
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      return {
        id,
        metadata
      };
    });

    return NextResponse.json({
      nfts,
      totalAvailable: availableIds.length,
      showing: nfts.length
    });
  } catch (error: any) {
    console.error('Error fetching available NFTs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available NFTs', details: error.message },
      { status: 500 }
    );
  }
}
