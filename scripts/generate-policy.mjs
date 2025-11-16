#!/usr/bin/env node
/**
 * Generate Cardano Policy ID from Mnemonic
 * Run with: node scripts/generate-policy.mjs
 */

import { AppWallet, resolveScriptHash } from '@meshsdk/core';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function generatePolicy() {
  try {
    console.log('\n🔐 Generating Cardano Policy ID from Mnemonic...\n');

    const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;

    if (!mnemonic) {
      console.error('❌ Error: MINTTING_WALLET_OUTPUT_MNEMONIC not found in .env file');
      process.exit(1);
    }

    const words = mnemonic.trim().split(/\s+/);

    if (words.length !== 24) {
      console.error(`❌ Error: Expected 24 words, got ${words.length}`);
      console.error('   Make sure your mnemonic is a valid 24-word phrase');
      process.exit(1);
    }

    console.log('✓ Mnemonic loaded (24 words)');

    // Create wallet from mnemonic
    const wallet = new AppWallet({
      networkId: 1, // 1 = mainnet, 0 = testnet
      key: {
        type: 'mnemonic',
        words: words
      }
    });

    console.log('✓ Wallet created');

    // Get wallet addresses
    const paymentAddress = await wallet.getPaymentAddress();
    const unusedAddress = await wallet.getUnusedAddresses();
    const changeAddress = await wallet.getChangeAddress();

    console.log('\n📍 Wallet Addresses:');
    console.log(`   Payment:  ${paymentAddress}`);
    console.log(`   Change:   ${changeAddress}`);

    // Get signing keys
    const signingKeys = await wallet.getSigningKeys();
    const paymentKey = signingKeys.payment;

    if (!paymentKey) {
      console.error('❌ Error: Could not get payment signing key');
      process.exit(1);
    }

    console.log('\n✓ Payment key obtained');

    // Create simple native script (signature required)
    const policyScript = {
      type: 'sig',
      keyHash: paymentKey.hash().to_hex()
    };

    console.log('\n📜 Policy Script:');
    console.log(JSON.stringify(policyScript, null, 2));

    // Generate policy ID
    const policyId = resolveScriptHash(policyScript);

    console.log('\n✅ Policy ID Generated Successfully!\n');
    console.log('━'.repeat(60));
    console.log('\n📋 Add this to your .env file:\n');
    console.log(`POLICY_ID=${policyId}`);
    console.log('\n' + '━'.repeat(60));
    console.log('\n💡 Next Steps:');
    console.log('   1. Copy the line above to your .env file');
    console.log('   2. Make sure you also have:');
    console.log('      NEXT_PUBLIC_PROFIT_WALLET=your_wallet_address');
    console.log('   3. Restart your development server');
    console.log('   4. Visit http://localhost:3000/mint to test\n');

    return {
      policyId,
      policyScript,
      paymentAddress
    };

  } catch (error) {
    console.error('\n❌ Error generating policy:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify your mnemonic has exactly 24 words');
    console.error('   - Check for extra spaces or line breaks');
    console.error('   - Make sure each word is a valid BIP39 word');
    console.error('   - Try running: npm install @meshsdk/core@latest\n');
    process.exit(1);
  }
}

// Run the generator
generatePolicy().catch(console.error);
