import { NextResponse } from 'next/server';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import * as bip39 from 'bip39';
import { serializeNativeScript, NativeScript } from '@meshsdk/core';

/**
 * Get the serialized minting script for burning NFTs
 * This must match the script used during minting
 */
export async function GET() {
  try {
    const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;

    if (!mnemonic) {
      return NextResponse.json(
        { error: 'Minting wallet not configured' },
        { status: 500 }
      );
    }

    // Derive the same key hash used for minting
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

    // Create the same native script used for minting
    const nativeScript: NativeScript = {
      type: 'all',
      scripts: [
        {
          type: 'sig',
          keyHash: keyHashHex
        }
      ]
    };

    // Serialize to CBOR
    const { scriptCbor } = serializeNativeScript(nativeScript);

    if (!scriptCbor) {
      return NextResponse.json(
        { error: 'Failed to serialize script' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      scriptCbor,
      keyHash: keyHashHex
    });

  } catch (error: any) {
    console.error('Error generating burn script:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate burn script',
        details: error.message
      },
      { status: 500 }
    );
  }
}
