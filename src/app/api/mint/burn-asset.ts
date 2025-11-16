// pages/api/burn-lucky-ducker.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createBlockchainProvider, createWallet } from '@/actions/meshServer';
import { Transaction, ForgeScript } from '@meshsdk/core';
import type { Asset } from '@meshsdk/core';

interface BurnAssetResponse {
  success: boolean;
  message: string;
  txHash?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BurnAssetResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  const burnAsset = req.body.burnAsset;
  console.log('burnAsset:', burnAsset);
  try {
    const blockchainProvider = await createBlockchainProvider()
    const mintWallet = await createWallet(blockchainProvider)
    const mintWalletAddress = await mintWallet.getChangeAddress()
    const forgingScript = ForgeScript.withOneSignature(mintWalletAddress);

    const tx = new Transaction({ initiator: mintWallet });

    // Prepare the asset for burning
    const policyId = '590b043d573cc89985024ed111d1858b820b72b87b6ee33463fa51bb';

    // burn asset#1
    const asset1: Asset = {
      unit: `${policyId}${burnAsset}`,
      quantity: '1',
    };
    tx.burnAsset(forgingScript, asset1);

    const unsignedTx = await tx.build();
    const signedTx = await mintWallet.signTx(unsignedTx);
    const txHash = await mintWallet.submitTx(signedTx);

    res.status(200).json({ success: true, message: 'Asset burned successfully', txHash });

  } catch (error) {
    console.error('Error burning asset:', error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: `Failed to burn asset: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: 'An unknown error occurred while burning the asset' });
    }
  }
}
