import { NextRequest, NextResponse } from 'next/server';
import { BlockfrostProvider, MeshWallet, resolveNativeScriptHash, NativeScript, serializeNativeScript } from '@meshsdk/core';
import { MeshTxBuilder } from '@meshsdk/core';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import * as bip39 from 'bip39';

/**
 * Server-side burn - burns NFT from the minting wallet
 * User must first send the NFT to the minting wallet
 */
export async function POST(request: NextRequest) {
  try {
    const { assetUnit } = await request.json();

    if (!assetUnit) {
      return NextResponse.json(
        { error: 'Missing assetUnit' },
        { status: 400 }
      );
    }

    const blockfrostKey = process.env.BLOCKFROST_PROJECT_ID;
    const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;

    if (!blockfrostKey || !mnemonic) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    // Initialize blockchain provider
    const blockchainProvider = new BlockfrostProvider(blockfrostKey);

    // Create minting wallet
    const mintingWallet = new MeshWallet({
      networkId: blockfrostKey.startsWith('mainnet') ? 1 : 0,
      fetcher: blockchainProvider,
      submitter: blockchainProvider,
      key: {
        type: 'mnemonic',
        words: mnemonic.trim().split(/\s+/)
      }
    });

    // Check if minting wallet has the NFT
    const walletAssets = await mintingWallet.getAssets();
    const hasNFT = walletAssets.some((asset: any) => asset.unit === assetUnit);

    if (!hasNFT) {
      const mintingAddress = await mintingWallet.getChangeAddress();
      return NextResponse.json(
        {
          error: 'NFT not found in minting wallet',
          message: `Please send the NFT to the minting wallet first: ${mintingAddress}`,
          mintingAddress
        },
        { status: 400 }
      );
    }

    // Generate the key hash (same as minting)
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

    // Extract policyId and assetName
    const policyId = assetUnit.substring(0, 56);
    const assetNameHex = assetUnit.substring(56);

    // Build burn transaction
    const walletUtxos = await mintingWallet.getUtxos();
    const changeAddress = await mintingWallet.getChangeAddress();

    const txBuilder = new MeshTxBuilder({
      fetcher: blockchainProvider,
      verbose: false
    });

    const unsignedTx = await txBuilder
      .mint('-1', policyId, assetNameHex) // -1 = burn
      .mintingScript(scriptCbor)
      .changeAddress(changeAddress)
      .selectUtxosFrom(walletUtxos)
      .complete();

    // Sign and submit with minting wallet
    const signedTx = await mintingWallet.signTx(unsignedTx);
    const txHash = await mintingWallet.submitTx(signedTx);

    return NextResponse.json({
      success: true,
      txHash,
      message: 'NFT burned successfully',
      assetUnit
    });

  } catch (error: any) {
    console.error('Error burning NFT:', error);
    return NextResponse.json(
      {
        error: 'Failed to burn NFT',
        details: error.message
      },
      { status: 500 }
    );
  }
}
