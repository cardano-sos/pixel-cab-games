import { NextRequest, NextResponse } from 'next/server';
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

    // Check if NFT image exists
    const imagePath = path.join(process.cwd(), 'images', 'nfts', 'images', `${nftId}.png`);

    if (!fs.existsSync(imagePath)) {
      return NextResponse.json(
        { error: 'NFT image not found' },
        { status: 404 }
      );
    }

    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving NFT image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image', details: error.message },
      { status: 500 }
    );
  }
}
