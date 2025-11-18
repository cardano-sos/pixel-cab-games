import { NextRequest, NextResponse } from 'next/server';
import { BlockfrostProvider, MeshWallet } from '@meshsdk/core';
import { convertReservationToSale, cancelReservation } from '@/lib/db';
import { mintQueue } from '@/lib/mintQueue';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';

/**
 * Wait for transaction confirmation on blockchain
 * Polls Blockfrost for 30 seconds to verify transaction
 */
async function waitForConfirmation(
  txHash: string,
  blockchainProvider: BlockfrostProvider,
  maxWaitSeconds = 30
): Promise<boolean> {
  console.log(`⏳ Waiting up to ${maxWaitSeconds}s for transaction confirmation...`);
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Try to fetch transaction details
      const txDetails = await blockchainProvider.fetchTxInfo(txHash);

      if (txDetails) {
        console.log(`✅ Transaction confirmed on blockchain: ${txHash}`);
        return true;
      }
    } catch (error) {
      // Transaction not yet on blockchain, keep waiting
    }

    // Wait 3 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log(`⚠️ Transaction not confirmed after ${maxWaitSeconds}s (may still succeed later)`);
  return false;
}

/**
 * Verify transaction has settled on blockchain (additional 30s verification)
 * This runs AFTER initial confirmation to ensure transaction is truly settled
 * before releasing the queue for the next person
 */
async function verifyTransactionSettled(
  txHash: string,
  blockchainProvider: BlockfrostProvider
): Promise<boolean> {
  console.log(`🔍 Verifying transaction settlement for 30s: ${txHash}`);
  const startTime = Date.now();
  const maxWaitMs = 30 * 1000; // 30 seconds
  let confirmations = 0;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const txDetails = await blockchainProvider.fetchTxInfo(txHash);

      if (txDetails) {
        confirmations++;
        console.log(`✓ Verification check ${confirmations}/10 passed`);

        // If we've confirmed it 10 times over 30 seconds, it's definitely settled
        if (confirmations >= 10) {
          console.log(`✅ Transaction fully settled after ${confirmations} confirmations`);
          return true;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Verification check failed, transaction may have been rolled back`);
      return false; // Transaction disappeared, don't release queue
    }

    // Wait 3 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // After 30s, if we got at least 5 confirmations, consider it settled
  console.log(`✅ Transaction verified with ${confirmations} confirmations over 30s`);
  return confirmations >= 5;
}

/**
 * Submit co-signed minting transaction
 * Takes user's witness set, adds minting wallet signature, and submits
 */
export async function POST(request: NextRequest) {
  // Parse request body once and save for error handler
  let nftData: any = null;
  let queueId: string | null = null;

  try {
    const { unsignedTx, userSignedTx, userAddress, nftData: parsedNftData, queueId: parsedQueueId } = await request.json();
    nftData = parsedNftData;
    queueId = parsedQueueId;

    // Validate inputs
    if (!unsignedTx || !userSignedTx || !userAddress || !nftData || !queueId) {
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

    console.log(`✅ Transaction submitted! TX: ${txHash}`);

    // Mark as confirming in queue (blocks next person until confirmation completes)
    await mintQueue.startConfirming(queueId, txHash);

    // Convert reservation to sale
    await convertReservationToSale(nftData.id, txHash);

    // Wait for blockchain confirmation (BLOCKS queue until complete)
    // This ensures ONLY ONE person mints at a time
    // Increased to 90 seconds to ensure transaction is actually confirmed
    const confirmed = await waitForConfirmation(txHash, blockchainProvider, 90);

    if (confirmed) {
      console.log(`✅ NFT minted and confirmed! TX: ${txHash}`);

      // ADDITIONAL VERIFICATION: Wait 30 more seconds to verify transaction has fully settled
      // This prevents releasing the queue if the transaction gets rolled back
      console.log(`🔍 Running additional 30s verification before releasing queue...`);
      const settled = await verifyTransactionSettled(txHash, blockchainProvider);

      if (settled) {
        console.log(`✅ Transaction fully settled and verified! Releasing queue...`);
        // Only release queue if transaction is ACTUALLY confirmed AND settled on blockchain
        await mintQueue.completeMint(queueId);

        // Return after full verification completes - NOW next person can start!
        return NextResponse.json({
          success: true,
          txHash,
          confirmed: true,
          settled: true,
          mintedNFT: {
            ...nftData,
            txHash
          },
          message: 'Successfully minted, confirmed, and verified Collectible!'
        });
      } else {
        // Transaction confirmed but didn't settle properly (possible rollback)
        console.log(`❌ Transaction confirmed but failed settlement verification. TX: ${txHash}`);

        // Cancel the sale since transaction may have been rolled back
        await cancelReservation(nftData.id);

        // Fail the mint in queue
        await mintQueue.failMint(queueId, 'Transaction settlement verification failed');

        return NextResponse.json(
          {
            error: 'Transaction settlement failed',
            details: 'Transaction was confirmed but failed settlement verification. It may have been rolled back.',
            txHash,
            message: 'Transaction confirmed but settlement verification failed. Please check blockchain explorer.'
          },
          { status: 500 }
        );
      }
    } else {
      // Transaction not confirmed within timeout - fail the mint
      console.log(`❌ Transaction not confirmed after 90s. TX: ${txHash}`);

      // Cancel the sale since we can't confirm it succeeded
      await cancelReservation(nftData.id);

      // Fail the mint in queue (releases next person but marks this as failed)
      await mintQueue.failMint(queueId, 'Transaction confirmation timeout - please check transaction status');

      return NextResponse.json(
        {
          error: 'Transaction confirmation timeout',
          details: 'Transaction was submitted but not confirmed on blockchain within 90 seconds. Please check the transaction status on Cardano explorer.',
          txHash,
          message: 'Transaction submitted but not confirmed. Please verify on blockchain explorer.'
        },
        { status: 408 }
      );
    }

  } catch (error: any) {
    console.error('❌ Error submitting minting transaction:', error);
    console.error('Error stack:', error.stack);

    // Cancel reservation if minting failed
    if (nftData?.id) {
      try {
        await cancelReservation(nftData.id);
        console.log(`🚫 Canceled reservation for NFT ${nftData.id} due to error`);
      } catch (cancelError) {
        console.error('Failed to cancel reservation:', cancelError);
      }
    }

    // Mark mint as failed in queue (releases next person)
    if (queueId) {
      await mintQueue.failMint(queueId, error.message || 'Transaction failed');
    }

    return NextResponse.json(
      {
        error: 'Failed to submit minting transaction',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
