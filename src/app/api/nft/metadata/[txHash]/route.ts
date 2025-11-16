import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side API to fetch NFT metadata from a transaction
 * Keeps Blockfrost API key secure on the server
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  try {
    const { txHash } = await params;

    // Validate transaction hash format
    if (!txHash || txHash.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    // Get Blockfrost API key from server environment (NOT exposed to client)
    const blockfrostKey = process.env.BLOCKFROST_PROJECT_ID;

    if (!blockfrostKey) {
      return NextResponse.json(
        { error: 'Blockfrost API not configured on server' },
        { status: 500 }
      );
    }

    // Determine network from API key
    const baseUrl = blockfrostKey.startsWith('mainnet')
      ? 'https://cardano-mainnet.blockfrost.io/api/v0'
      : blockfrostKey.startsWith('preprod')
      ? 'https://cardano-preprod.blockfrost.io/api/v0'
      : 'https://cardano-preview.blockfrost.io/api/v0';

    // Fetch metadata directly from Blockfrost API
    const response = await fetch(`${baseUrl}/txs/${txHash}/metadata`, {
      headers: {
        'project_id': blockfrostKey
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        );
      }
      throw new Error(`Blockfrost API error: ${response.statusText}`);
    }

    const txMetadata = await response.json();

    // Extract NFT metadata (label 721 = CIP-25 NFT standard)
    const nftMetadata = txMetadata.find((m: any) => m.label === "721");

    if (!nftMetadata) {
      return NextResponse.json(
        { error: 'No NFT metadata found in transaction' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      metadata: nftMetadata.json_metadata,
      raw: txMetadata
    });

  } catch (error: any) {
    console.error('Error fetching NFT metadata:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch NFT metadata',
        details: error.message
      },
      { status: 500 }
    );
  }
}
