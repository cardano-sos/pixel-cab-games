import { NextRequest, NextResponse } from 'next/server';
import { BlockfrostProvider } from '@meshsdk/core';
import { MeshTxBuilder } from '@meshsdk/core';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import * as bip39 from 'bip39';
import { serializeNativeScript, NativeScript } from '@meshsdk/core';

/**
 * Server-side API to create an unsigned burn transaction
 * Client will sign and submit it
 */
export async function POST(request: NextRequest) {
  try {
    const { assetUnit, userAddress } = await request.json();

    if (!assetUnit || !userAddress) {
      return NextResponse.json(
        { error: 'Missing assetUnit or userAddress' },
        { status: 400 }
      );
    }

    // Get server-side Blockfrost key
    const blockfrostKey = process.env.BLOCKFROST_PROJECT_ID;
    if (!blockfrostKey) {
      return NextResponse.json(
        { error: 'Blockfrost not configured' },
        { status: 500 }
      );
    }

    const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;
    if (!mnemonic) {
      return NextResponse.json(
        { error: 'Minting wallet not configured' },
        { status: 500 }
      );
    }

    // Derive the key hash (same as minting)
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

    const paymentKey = accountKey.derive(0).derive(0);
    const paymentPubKey = paymentKey.to_public();
    const paymentKeyHash = paymentPubKey.to_raw_key().hash();
    const keyHashHex = Buffer.from(paymentKeyHash.to_bytes()).toString('hex');

    // Create native script
    const nativeScript: NativeScript = {
      type: 'all',
      scripts: [
        {
          type: 'sig',
          keyHash: keyHashHex
        }
      ]
    };

    const { scriptCbor } = serializeNativeScript(nativeScript);
    if (!scriptCbor) {
      return NextResponse.json(
        { error: 'Failed to serialize script' },
        { status: 500 }
      );
    }

    // Extract policyId and assetName from full unit
    const policyId = assetUnit.substring(0, 56);
    const assetNameHex = assetUnit.substring(56);

    // Return the data needed for client to build transaction
    return NextResponse.json({
      success: true,
      scriptCbor,
      policyId,
      assetNameHex,
      network: blockfrostKey.startsWith('mainnet') ? 'mainnet' : 'preprod'
    });

  } catch (error: any) {
    console.error('Error creating burn transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to create burn transaction',
        details: error.message
      },
      { status: 500 }
    );
  }
}
