import { NextRequest, NextResponse } from 'next/server';
import { BlockfrostProvider, MeshTxBuilder, resolveNativeScriptHash, NativeScript, serializeNativeScript } from '@meshsdk/core';
import { getRandomAvailableNFTIds, reserveNFT } from '@/lib/db';
import { mintQueue } from '@/lib/mintQueue';
import * as fs from 'fs';
import * as path from 'path';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import * as bip39 from 'bip39';

/**
 * Build unsigned minting transaction
 * User provides UTxOs, server builds tx with minting and change to profit wallet
 */
export async function POST(request: NextRequest) {
  try {
    const { userAddress, userUtxos, queueId } = await request.json();

    // Validate inputs
    if (!userAddress || !userUtxos || !queueId) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, userUtxos, queueId' },
        { status: 400 }
      );
    }

    // Check if user is allowed to mint (must be first in queue)
    if (!await mintQueue.canMint(queueId)) {
      const status = await mintQueue.getQueueStatus(queueId);
      return NextResponse.json(
        {
          error: 'Not your turn',
          message: status
            ? `You are #${status.position} in queue. Please wait...`
            : 'Invalid queue ID. Please rejoin the queue.',
          queuePosition: status?.position || 0
        },
        { status: 403 }
      );
    }

    // Check environment variables
    const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;
    const blockfrostKey = process.env.BLOCKFROST_PROJECT_ID;
    const profitWallet = process.env.NEXT_PUBLIC_PROFIT_WALLET;

    if (!mnemonic || !blockfrostKey || !profitWallet) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Try to reserve an available NFT
    // Get several candidates in case first ones are reserved by concurrent requests
    const candidateNFTIds = await getRandomAvailableNFTIds(5);

    if (candidateNFTIds.length < 1) {
      return NextResponse.json(
        { error: 'No Collectibles available' },
        { status: 400 }
      );
    }

    // Try to reserve each candidate until successful
    let nftId: number | null = null;
    for (const candidateId of candidateNFTIds) {
      const reserved = await reserveNFT(candidateId, userAddress);
      if (reserved) {
        nftId = candidateId;
        console.log(`✅ Reserved NFT ${nftId} for ${userAddress}`);
        break;
      }
    }

    // If all candidates failed, no Collectibles available
    if (nftId === null) {
      await mintQueue.failMint(queueId, 'No Collectibles available');
      return NextResponse.json(
        { error: 'No Collectibles available - all were just reserved by other users. Please try again.' },
        { status: 409 } // 409 Conflict
      );
    }

    // Mark queue entry as "minting"
    await mintQueue.startMinting(queueId, nftId);

    // Load metadata and image
    const metadataPath = path.join(process.cwd(), 'images', 'nfts', 'metadata', `${nftId}.json`);
    const imagePath = path.join(process.cwd(), 'images', 'nfts', 'images', `${nftId}.png`);

    if (!fs.existsSync(metadataPath) || !fs.existsSync(imagePath)) {
      throw new Error(`NFT ${nftId} not found`);
    }

    const nftMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Generate key hash for policy
    function harden(num: number): number {
      return 0x80000000 + num;
    }

    const entropy = bip39.mnemonicToEntropy(mnemonic);
    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy, 'hex'),
      Buffer.from('')
    );

    const accountKey = rootKey
      .derive(harden(1852))
      .derive(harden(1815))
      .derive(harden(0));

    const paymentKey = accountKey
      .derive(0)
      .derive(0);

    const paymentPubKey = paymentKey.to_public();
    const paymentKeyHash = paymentPubKey.to_raw_key().hash();
    const keyHashHex = Buffer.from(paymentKeyHash.to_bytes()).toString('hex');

    // Create native script for minting
    const nativeScript: NativeScript = {
      type: 'all',
      scripts: [
        {
          type: 'sig',
          keyHash: keyHashHex
        }
      ]
    };

    // Calculate policy ID
    const policyId = resolveNativeScriptHash(nativeScript);

    // Serialize native script to CBOR hex
    const { scriptCbor } = serializeNativeScript(nativeScript);

    if (!scriptCbor) {
      return NextResponse.json(
        { error: 'Failed to serialize minting script' },
        { status: 500 }
      );
    }

    // Asset name in hex
    const assetNameHex = Buffer.from(nftMetadata.name, 'utf8').toString('hex');

    // Chunk the base64 image for CIP-25
    // Each chunk must be ≤ 64 bytes. The first chunk includes the prefix.
    const prefix = 'data:image/png;base64,';
    const firstChunkSize = 64 - prefix.length; // 64 - 22 = 42 chars for first chunk
    const chunkSize = 64;

    const imageChunksWithPrefix: string[] = [];

    // First chunk with prefix (total 64 chars)
    if (base64Image.length > 0) {
      imageChunksWithPrefix.push(prefix + base64Image.substring(0, firstChunkSize));

      // Remaining chunks (64 chars each)
      for (let j = firstChunkSize; j < base64Image.length; j += chunkSize) {
        imageChunksWithPrefix.push(base64Image.substring(j, j + chunkSize));
      }
    }

    // Prepare asset metadata (CIP-25)
    const assetMetadata: any = {
      name: nftMetadata.name,
      image: imageChunksWithPrefix,
      mediaType: 'image/png',
      files: [
        {
          name: nftMetadata.name,
          mediaType: 'image/png',
          src: imageChunksWithPrefix
        }
      ]
    };

    // Add description if it exists in metadata
    // Cardano metadata has a 64-byte limit for string values
    if (nftMetadata.description) {
      let description = nftMetadata.description;

      // Truncate to 64 bytes if needed
      if (description.length > 64) {
        description = description.substring(0, 61) + '...'; // 61 + 3 = 64 bytes
        console.log(`⚠️ Description truncated to 64 bytes: "${description}"`);
      }

      assetMetadata.description = description;
      console.log(`📝 Added description to metadata: ${description}`);
    }

    // Add attributes to metadata
    // Also validate 64-byte limit for attribute values
    nftMetadata.attributes.forEach((attr: any) => {
      let value = String(attr.value);

      // Truncate attribute values to 64 bytes if needed
      if (value.length > 64) {
        value = value.substring(0, 61) + '...';
        console.log(`⚠️ Attribute "${attr.trait_type}" value truncated to 64 bytes`);
      }

      assetMetadata[attr.trait_type] = value;
    });

    // Prepare metadata for minting
    const metadata = {
      [policyId]: {
        [nftMetadata.name]: assetMetadata
      }
    };

    // Initialize blockchain provider
    const blockchainProvider = new BlockfrostProvider(blockfrostKey);

    // Build transaction using user's UTxOs
    const txBuilder = new MeshTxBuilder({
      fetcher: blockchainProvider,
      verbose: false
    });

    console.log(`🔨 Building transaction with user UTxOs (count: ${userUtxos.length})`);
    console.log(`💰 Change address (profit wallet): ${profitWallet}`);

    // Sort UTxOs by lovelace amount (largest first) to minimize number of inputs needed
    const sortedUtxos = userUtxos.sort((a: any, b: any) => {
      const aLovelace = parseInt(a.output.amount.find((amt: any) => amt.unit === 'lovelace')?.quantity || '0');
      const bLovelace = parseInt(b.output.amount.find((amt: any) => amt.unit === 'lovelace')?.quantity || '0');
      return bLovelace - aLovelace;
    });

    // Calculate total available lovelace
    const totalLovelace = sortedUtxos.reduce((sum: number, utxo: any) => {
      const lovelaceAmount = parseInt(utxo.output.amount.find((amt: any) => amt.unit === 'lovelace')?.quantity || '0');
      return sum + lovelaceAmount;
    }, 0);

    console.log(`💰 Total ADA available: ${totalLovelace / 1000000} ADA`);
    console.log(`💰 Largest UTxO: ${parseInt(sortedUtxos[0].output.amount.find((amt: any) => amt.unit === 'lovelace')?.quantity || '0') / 1000000} ADA`);

    // Check if we have enough funds (50 ADA + estimate 2 ADA for fees)
    if (totalLovelace < 52000000) {
      return NextResponse.json(
        { error: `Insufficient funds. Total available: ${totalLovelace / 1000000} ADA. Need at least 52 ADA to cover 50 ADA + fees.` },
        { status: 400 }
      );
    }

    // Log metadata structure for debugging
    // console.log('📝 Metadata structure:', JSON.stringify(metadata, null, 2));
    console.log('📏 Metadata size (approx):', JSON.stringify(metadata).length, 'characters');

    // Use up to 3 largest UTxOs to ensure we have enough for payment + fees + min ADA
    // 50 ADA + ~2 ADA (NFT min ADA) + ~1 ADA (fees) = ~53 ADA needed
    const utxosToUse = sortedUtxos.slice(0, Math.min(3, sortedUtxos.length));
    const utxosTotal = utxosToUse.reduce((sum: number, utxo: any) => {
      const lovelaceAmount = parseInt(utxo.output.amount.find((amt: any) => amt.unit === 'lovelace')?.quantity || '0');
      return sum + lovelaceAmount;
    }, 0);
    console.log(`🎯 Using ${utxosToUse.length} UTxO(s) with ${utxosTotal / 1000000} ADA total`);

    const unsignedTx = await txBuilder
      .mint('1', policyId, assetNameHex)
      .mintingScript(scriptCbor)
      .metadataValue('721', metadata)
      .txOut(profitWallet, [{ unit: 'lovelace', quantity: '50000000' }]) // Exactly 50 ADA to profit wallet
      .txOut(userAddress, [{ unit: `${policyId}${assetNameHex}`, quantity: '1' }]) // Minted NFT to user
      .changeAddress(userAddress) // All change (excess ADA + tokens/NFTs from consumed UTxOs) goes back to user
      .selectUtxosFrom(utxosToUse) // Use up to 3 largest UTxOs
      .complete();

    console.log('✅ Unsigned transaction built successfully');

    // Return transaction and NFT data
    return NextResponse.json({
      success: true,
      unsignedTx,
      nftData: {
        id: nftId,
        name: nftMetadata.name,
        imageData: base64Image,
        assetName: nftMetadata.name
      }
    });

  } catch (error: any) {
    console.error('❌ Error building minting transaction:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Failed to build minting transaction',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
