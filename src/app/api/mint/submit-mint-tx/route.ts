import { NextRequest, NextResponse } from 'next/server';
import { BlockfrostProvider, MeshWallet } from '@meshsdk/core';
import { markNFTAsSold } from '@/lib/db';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';

// Simple in-memory mutex to prevent concurrent minting
let mintingLock = false;

/**
 * Acquire minting lock
 */
async function acquireMintLock(maxWaitTime = 300000): Promise<boolean> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const attemptAcquire = () => {
      if (!mintingLock) {
        mintingLock = true;
        console.log('🔒 Minting lock acquired');
        resolve(true);
      } else if (Date.now() - startTime > maxWaitTime) {
        console.log('⏱️ Minting lock timeout - forcing acquisition');
        mintingLock = true;
        resolve(true);
      } else {
        console.log('⏳ Waiting for minting lock...');
        setTimeout(attemptAcquire, 1000);
      }
    };

    attemptAcquire();
  });
}

/**
 * Release minting lock
 */
function releaseMintLock() {
  mintingLock = false;
  console.log('🔓 Minting lock released');
}

/**
 * Submit co-signed minting transaction
 * Takes user's witness set, adds minting wallet signature, and submits
 */
export async function POST(request: NextRequest) {
  const lockAcquired = await acquireMintLock();

  if (!lockAcquired) {
    return NextResponse.json(
      { error: 'Failed to acquire minting lock. Please try again.' },
      { status: 503 }
    );
  }

  try {
    const { unsignedTx, userSignedTx, userAddress, nftData } = await request.json();

    // Validate inputs
    if (!unsignedTx || !userSignedTx || !userAddress || !nftData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check environment variables
    const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;
    const blockfrostKey = process.env.BLOCKFROST_PROJECT_ID;

    if (!mnemonic || !blockfrostKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
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

    console.log('🔐 Co-signing transaction with minting wallet...');

    // Parse user's signed transaction
    const userSignedTxParsed = CardanoWasm.Transaction.from_bytes(
      Buffer.from(userSignedTx, 'hex')
    );

    const txBody = userSignedTxParsed.body();
    const auxData = userSignedTxParsed.auxiliary_data();
    const userWitnesses = userSignedTxParsed.witness_set();

    console.log('✍️ Signing with minting wallet...');

    // Sign with minting wallet - it will sign the transaction body
    // We need to sign the RAW unsigned tx to get proper minting signatures
    const mintingSignedTxHex = await mintingWallet.signTx(unsignedTx, false); // FULL sign

    const mintingSignedTx = CardanoWasm.Transaction.from_bytes(
      Buffer.from(mintingSignedTxHex, 'hex')
    );
    const mintingWitnesses = mintingSignedTx.witness_set();

    console.log('🔗 Combining witness sets...');

    // Create new combined witness set
    const combinedWitnessSet = CardanoWasm.TransactionWitnessSet.new();

    // Combine vkeys from both witness sets
    const allVkeys = CardanoWasm.Vkeywitnesses.new();

    const userVkeys = userWitnesses.vkeys();
    if (userVkeys) {
      console.log(`User provided ${userVkeys.len()} signature(s)`);
      for (let i = 0; i < userVkeys.len(); i++) {
        allVkeys.add(userVkeys.get(i));
      }
    }

    const mintingVkeys = mintingWitnesses.vkeys();
    if (mintingVkeys) {
      console.log(`Minting wallet provided ${mintingVkeys.len()} signature(s)`);
      for (let i = 0; i < mintingVkeys.len(); i++) {
        allVkeys.add(mintingVkeys.get(i));
      }
    }

    combinedWitnessSet.set_vkeys(allVkeys);

    // Add native scripts from minting witnesses (the minting policy)
    const nativeScripts = mintingWitnesses.native_scripts();
    if (nativeScripts) {
      console.log(`Adding ${nativeScripts.len()} native script(s)`);
      combinedWitnessSet.set_native_scripts(nativeScripts);
    }

    // Build final transaction with combined witnesses
    const finalTx = CardanoWasm.Transaction.new(
      txBody,
      combinedWitnessSet,
      auxData
    );

    const finalTxHex = Buffer.from(finalTx.to_bytes()).toString('hex');

    console.log('📤 Submitting transaction...');

    // Submit via blockfrost
    const txHash = await blockchainProvider.submitTx(finalTxHex);

    console.log(`✅ NFT minted! TX: ${txHash}`);

    // Mark NFT as sold
    markNFTAsSold(nftData.id, userAddress, txHash);

    return NextResponse.json({
      success: true,
      txHash,
      mintedNFT: {
        ...nftData,
        txHash
      },
      message: 'Successfully minted NFT'
    });

  } catch (error: any) {
    console.error('❌ Error submitting minting transaction:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Failed to submit minting transaction',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    releaseMintLock();
  }
}
