import type { NextApiRequest, NextApiResponse } from "next";
import { signTransaction } from '@/actions/meshSignTransaction'

interface SignTransactionResponse {
  appWalletSignedTx: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignTransactionResponse | { success: false, message: string }>
) {
  if (req.method === 'POST') {
    try {
      const { signedTx, originalMetadata } = req.body;

      // Sign the transaction with the app wallet
      const appWalletSignedTx = await signTransaction(signedTx, true);

      res.status(200).json({ appWalletSignedTx });
    } catch (error) {
      console.error('Error in sign-transaction:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while signing the transaction.'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
