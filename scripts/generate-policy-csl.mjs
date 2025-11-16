#!/usr/bin/env node
/**
 * Generate Cardano Policy ID using Cardano Serialization Library
 * This works WITHOUT needing cardano-cli or a node
 * Run with: npm run generate-policy
 *
 * Note: Reads from environment variables (works with .env, .envrc, or exported vars)
 */

import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import * as bip39 from 'bip39';

function harden(num) {
  return 0x80000000 + num;
}

async function generatePolicy() {
  try {
    console.log('\n🔐 Generating Cardano Policy ID from Mnemonic...\n');
    console.log('━'.repeat(60));

    const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;

    if (!mnemonic) {
      console.error('\n❌ Error: MINTTING_WALLET_OUTPUT_MNEMONIC not found in .env file');
      console.error('\nMake sure your .env file contains:');
      console.error('MINTTING_WALLET_OUTPUT_MNEMONIC=word1 word2 ... word24\n');
      process.exit(1);
    }

    const words = mnemonic.trim().split(/\s+/);

    if (words.length !== 24 && words.length !== 15 && words.length !== 12) {
      console.error(`\n❌ Error: Expected 12, 15, or 24 words, got ${words.length}`);
      console.error('Make sure your mnemonic is valid\n');
      process.exit(1);
    }

    console.log(`✓ Mnemonic loaded (${words.length} words)`);

    // Convert mnemonic to entropy
    const entropy = bip39.mnemonicToEntropy(mnemonic);
    console.log('✓ Entropy derived');

    // Create root key from entropy
    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy, 'hex'),
      Buffer.from('') // empty password
    );
    console.log('✓ Root key generated');

    // Derive payment key (m/1852'/1815'/0'/0/0)
    const accountKey = rootKey
      .derive(harden(1852)) // purpose
      .derive(harden(1815)) // coin_type (ADA)
      .derive(harden(0));   // account

    const paymentKey = accountKey
      .derive(0) // external chain
      .derive(0); // address index

    console.log('✓ Payment key derived');

    // Get public key hash
    const paymentPubKey = paymentKey.to_public();
    const paymentKeyHash = paymentPubKey.to_raw_key().hash();

    console.log('✓ Key hash computed');

    // Create simple native script (signature required)
    const nativeScript = CardanoWasm.NativeScript.new_script_pubkey(
      CardanoWasm.ScriptPubkey.new(paymentKeyHash)
    );

    // Calculate policy ID
    const policyId = Buffer.from(nativeScript.hash().to_bytes()).toString('hex');

    console.log('✓ Policy ID generated\n');
    console.log('━'.repeat(60));

    const keyHashHex = Buffer.from(paymentKeyHash.to_bytes()).toString('hex');

    console.log('\n📜 Policy Information:');
    console.log(`   Policy ID: ${policyId}`);
    console.log(`   Key Hash: ${keyHashHex}`);
    console.log(`   Script Type: Native Script (Signature)`);

    console.log('\n' + '━'.repeat(60));
    console.log('\n✅ SUCCESS! Add this to your .env file:\n');
    console.log(`POLICY_ID=${policyId}`);
    console.log('\n' + '━'.repeat(60));

    console.log('\n💡 Next Steps:');
    console.log('   1. Export POLICY_ID to your environment:');
    console.log('      export POLICY_ID=' + policyId);
    console.log('      (or add to your .envrc file)');
    console.log('   2. Make sure you also have NEXT_PUBLIC_PROFIT_WALLET exported');
    console.log('   3. Restart your development server: npm run dev');
    console.log('   4. Visit http://localhost:3000/mint to test');
    console.log('   5. Test on TESTNET first before mainnet!\n');

    console.log('📝 Note: This policy requires YOUR signature to mint NFTs');
    console.log('   Only you (with this mnemonic) can mint with this policy.\n');

    return {
      policyId,
      keyHash: keyHashHex
    };

  } catch (error) {
    console.error('\n❌ Error generating policy:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify your mnemonic has 12, 15, or 24 valid words');
    console.error('   - Check for extra spaces or line breaks in .env');
    console.error('   - Make sure words are valid BIP39 mnemonic words');
    console.error('   - Try: npm install @emurgo/cardano-serialization-lib-nodejs@latest\n');
    process.exit(1);
  }
}

// Run the generator
generatePolicy().catch(console.error);
