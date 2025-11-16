// Generate Cardano Policy ID from mnemonic
import { AppWallet, ForgeScript } from '@meshsdk/core';
import { resolvePaymentKeyHash } from '@meshsdk/core';

/**
 * Generate a policy ID from a mnemonic phrase
 * This creates a simple signature-based policy
 */
export function generatePolicyFromMnemonic(mnemonic: string): {
  policyId: string;
  policyScript: ForgeScript;
} {
  try {
    // Create wallet from mnemonic
    const wallet = new AppWallet({
      networkId: 1, // 1 = mainnet, 0 = testnet
      key: {
        type: 'mnemonic',
        words: mnemonic.trim().split(' ')
      }
    });

    // Get the payment credential (key hash)
    const addresses = wallet.getPaymentAddress();

    // Create a simple policy script that requires wallet signature
    // This is a "sig" type policy - requires signature from this wallet to mint
    const policyScript: ForgeScript = {
      type: 'all',
      scripts: [
        {
          type: 'sig',
          keyHash: resolvePaymentKeyHash(addresses)
        }
      ]
    };

    // Generate policy ID from the script
    const policyId = resolvePaymentKeyHash(JSON.stringify(policyScript));

    return {
      policyId,
      policyScript
    };
  } catch (error) {
    console.error('Error generating policy:', error);
    throw new Error('Failed to generate policy from mnemonic');
  }
}

/**
 * Generate policy ID for testnet
 */
export function generateTestnetPolicyFromMnemonic(mnemonic: string): {
  policyId: string;
  policyScript: ForgeScript;
} {
  try {
    const wallet = new AppWallet({
      networkId: 0, // Testnet
      key: {
        type: 'mnemonic',
        words: mnemonic.trim().split(' ')
      }
    });

    const addresses = wallet.getPaymentAddress();

    const policyScript: ForgeScript = {
      type: 'all',
      scripts: [
        {
          type: 'sig',
          keyHash: resolvePaymentKeyHash(addresses)
        }
      ]
    };

    const policyId = resolvePaymentKeyHash(JSON.stringify(policyScript));

    return {
      policyId,
      policyScript
    };
  } catch (error) {
    console.error('Error generating testnet policy:', error);
    throw new Error('Failed to generate testnet policy from mnemonic');
  }
}
