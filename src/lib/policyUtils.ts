// Server-side policy generation utilities
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import * as bip39 from 'bip39';

function harden(num: number): number {
  return 0x80000000 + num;
}

/**
 * Generate policy ID from mnemonic (server-side only)
 * Same mnemonic always produces same policy ID
 */
export function generatePolicyIdFromMnemonic(mnemonic: string): string {
  try {
    // Convert mnemonic to entropy
    const entropy = bip39.mnemonicToEntropy(mnemonic);

    // Create root key from entropy
    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy, 'hex'),
      Buffer.from('') // empty password
    );

    // Derive payment key (m/1852'/1815'/0'/0/0)
    const accountKey = rootKey
      .derive(harden(1852)) // purpose
      .derive(harden(1815)) // coin_type (ADA)
      .derive(harden(0));   // account

    const paymentKey = accountKey
      .derive(0) // external chain
      .derive(0); // address index

    // Get public key hash
    const paymentPubKey = paymentKey.to_public();
    const paymentKeyHash = paymentPubKey.to_raw_key().hash();

    // Create simple native script (signature required)
    const nativeScript = CardanoWasm.NativeScript.new_script_pubkey(
      CardanoWasm.ScriptPubkey.new(paymentKeyHash)
    );

    // Calculate policy ID
    const policyId = Buffer.from(nativeScript.hash().to_bytes()).toString('hex');

    return policyId;
  } catch (error) {
    console.error('Error generating policy ID:', error);
    throw new Error('Failed to generate policy ID from mnemonic');
  }
}

/**
 * Get policy ID - auto-generates from mnemonic or uses manual override
 */
export function getPolicyId(): string {
  // Check for manual override first
  if (process.env.POLICY_ID) {
    return process.env.POLICY_ID;
  }

  // Auto-generate from mnemonic
  const mnemonic = process.env.MINTTING_WALLET_OUTPUT_MNEMONIC;

  if (!mnemonic) {
    return 'YOUR_POLICY_ID_HERE'; // Fallback
  }

  return generatePolicyIdFromMnemonic(mnemonic);
}
