import { createBlockchainProvider, createAppWallet } from '@/actions/meshServer';

export async function signTransaction(unsignedTx: string, partialSign: boolean = false ) {
  const blockchainProvider = await createBlockchainProvider()
  const wallet = await createAppWallet(blockchainProvider)

  let signedTx = null;
  try {
    signedTx = await wallet.signTx(unsignedTx, partialSign);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e)
      throw new Error(`Failed to sign transaction: ${e.message}`);
    } else {
      throw e;
    }
  }
  return signedTx
}
