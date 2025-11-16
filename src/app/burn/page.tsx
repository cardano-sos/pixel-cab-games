"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { BrowserWallet } from "@meshsdk/core";
import { MeshTxBuilder } from "@meshsdk/core";
import { useRouter, useSearchParams } from "next/navigation";

export default function BurnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, walletId, address, disconnect } = useWallet();
  const [assetUnit, setAssetUnit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  // Pre-fill asset unit from URL parameter
  useEffect(() => {
    const unitParam = searchParams.get('unit');
    if (unitParam) {
      setAssetUnit(unitParam);
    }
  }, [searchParams]);

  const handleDisconnect = async () => {
    await disconnect();
    router.push('/');
  };

  const handleBurn = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setTxHash("");

      if (!walletId) {
        throw new Error("No wallet connected");
      }

      if (!assetUnit) {
        throw new Error("Please enter the asset unit (policyId + assetNameHex)");
      }

      if (!address) {
        throw new Error("Wallet address not available");
      }

      const wallet = await BrowserWallet.enable(walletId);

      // Get burn transaction data from server (keeps Blockfrost key secure)
      const response = await fetch('/api/burn/create-burn-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetUnit,
          userAddress: address
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create burn transaction');
      }

      const { scriptCbor, policyId, assetNameHex } = await response.json();

      // Get wallet UTXOs and check if we have the NFT
      const walletUtxos = await wallet.getUtxos();
      const walletAssets = await wallet.getAssets();

      console.log('Wallet assets:', walletAssets);
      console.log('Looking for:', `${policyId}${assetNameHex}`);

      // Show wallet info to user
      const lovelaceAsset = walletAssets.find((a: any) => a.unit === 'lovelace');
      const lovelaceAmount = lovelaceAsset ? parseInt(lovelaceAsset.quantity) : 0;
      console.log(`Connected Address: ${address}`);
      console.log(`ADA Balance: ${(lovelaceAmount / 1000000).toFixed(2)} ADA`);

      const hasNFT = walletAssets.some((asset: any) =>
        asset.unit === `${policyId}${assetNameHex}`
      );

      if (!hasNFT) {
        throw new Error(`NFT not found in wallet. Make sure you own this NFT: ${policyId}${assetNameHex}`);
      }

      // Check if wallet has enough ADA for fees (at least 2 ADA to be safe)
      if (lovelaceAmount < 2000000) {
        throw new Error(
          `Insufficient ADA in connected address!\n\n` +
          `Connected Address: ${address}\n` +
          `Current Balance: ${(lovelaceAmount / 1000000).toFixed(2)} ADA\n` +
          `Needed: At least 2 ADA\n\n` +
          `Solution: Send 5-10 ADA to this address from your main Eternl account, then try again.`
        );
      }

      const changeAddress = await wallet.getChangeAddress();

      // Build the burn transaction
      const txBuilder = new MeshTxBuilder({
        fetcher: wallet,
        verbose: true // Enable verbose for debugging
      });

      const unsignedTx = await txBuilder
        .mint('-1', policyId, assetNameHex) // -1 means burn
        .mintingScript(scriptCbor)
        .changeAddress(changeAddress)
        .selectUtxosFrom(walletUtxos)
        .complete();

      const signedTx = await wallet.signTx(unsignedTx);
      const burnTxHash = await wallet.submitTx(signedTx);

      setTxHash(burnTxHash);
      setSuccess(`NFT burned successfully! Transaction: ${burnTxHash}`);

    } catch (err: any) {
      console.error("Burn error:", err);
      setError(err.message || "Failed to burn NFT");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gray-800 border border-red-600 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Wallet Not Connected</h2>
            <p className="text-gray-300 mb-4">Please connect your wallet to burn NFTs.</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-red-500">🔥 Burn NFT</h1>
            <div className="text-right">
              <div className="text-sm text-gray-300">
                Connected: <span className="text-blue-400">{walletId}</span>
              </div>
              {address && (
                <div className="text-xs text-gray-400">
                  {address.slice(0, 8)}...{address.slice(-8)}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-red-500 px-3 py-1 rounded transition-colors"
          >
            Disconnect
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
          <div className="bg-red-900/20 border border-red-600 rounded p-4 mb-6">
            <p className="text-red-300 text-sm">
              ⚠️ <strong>Warning:</strong> Burning an NFT permanently destroys it. This action cannot be undone!
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">How to Find Your Asset Unit:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
              <li>Go to your NFT viewer: <a href="/view-nft" className="text-blue-400 hover:underline">/view-nft</a></li>
              <li>Enter your minting transaction hash</li>
              <li>Look in the raw metadata for the asset name</li>
              <li>Combine: <code className="bg-gray-700 px-2 py-1 rounded">policyId + assetNameHex</code></li>
            </ol>

            <div className="mt-4 bg-gray-700 p-3 rounded">
              <p className="text-xs text-gray-400 mb-1">Example:</p>
              <code className="text-xs text-green-400 break-all">
                590b043d573cc89985024ed111d1858b820b72b87b6ee33463fa51bb4172636164696172506978656c30303031
              </code>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Asset Unit (PolicyId + AssetNameHex)
            </label>
            <input
              type="text"
              value={assetUnit}
              onChange={(e) => setAssetUnit(e.target.value)}
              placeholder="Enter full asset unit..."
              className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-red-500 focus:outline-none font-mono text-sm"
            />
          </div>

          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-600 rounded p-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-900/50 border border-green-600 rounded p-4">
              <p className="text-green-200">{success}</p>
              {txHash && (
                <a
                  href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm block mt-2"
                >
                  View on CardanoScan →
                </a>
              )}
            </div>
          )}

          <button
            onClick={handleBurn}
            disabled={loading || !assetUnit}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded font-semibold transition-colors"
          >
            {loading ? 'Burning...' : '🔥 Burn NFT'}
          </button>
        </div>
      </div>
    </div>
  );
}
