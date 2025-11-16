"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ServerBurnPage() {
  const router = useRouter();
  const [assetUnit, setAssetUnit] = useState("");
  const [mintingAddress, setMintingAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  // Get minting wallet address on load
  useEffect(() => {
    fetch('/api/config/minting-address')
      .then(res => res.json())
      .then(data => {
        setMintingAddress(data.address);
        setLoadingAddress(false);
      })
      .catch(err => {
        setError('Failed to load minting address');
        setLoadingAddress(false);
      });
  }, []);

  const handleBurn = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setTxHash("");

      const response = await fetch('/api/burn/server-burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetUnit })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to burn NFT');
      }

      setTxHash(data.txHash);
      setSuccess(`NFT burned successfully! Transaction: ${data.txHash}`);

    } catch (err: any) {
      console.error("Burn error:", err);
      setError(err.message || "Failed to burn NFT");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-500 mb-2">🔥 Server Burn NFT</h1>
          <p className="text-gray-400">Send NFT to minting wallet, then burn it server-side</p>
        </div>

        {/* Step 1: Send NFT to Minting Wallet */}
        <div className="bg-gray-800 rounded-lg p-6 border border-yellow-600 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">1️⃣</span>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Send NFT to Minting Wallet</h2>
              <p className="text-gray-300 text-sm mb-4">
                First, you need to send the NFT to the minting wallet address:
              </p>

              {loadingAddress ? (
                <div className="bg-gray-700 p-3 rounded animate-pulse">
                  Loading address...
                </div>
              ) : (
                <div className="bg-gray-700 p-3 rounded">
                  <p className="text-xs text-gray-400 mb-1">Minting Wallet Address:</p>
                  <code className="text-sm text-green-400 break-all font-mono">
                    {mintingAddress || 'Error loading address'}
                  </code>
                  {mintingAddress && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(mintingAddress);
                        alert('Address copied!');
                      }}
                      className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                    >
                      📋 Copy Address
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 bg-yellow-900/20 border border-yellow-600 rounded p-3">
                <p className="text-yellow-300 text-sm">
                  ⚠️ <strong>Important:</strong> Send the NFT from your Eternl wallet to the address above.
                  Wait for the transaction to confirm before proceeding to step 2.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Trigger Server Burn */}
        <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">2️⃣</span>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Trigger Server Burn</h2>
              <p className="text-gray-300 text-sm mb-4">
                After the NFT arrives at the minting wallet, enter the asset unit below:
              </p>
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
            <p className="text-xs text-gray-400 mt-1">
              Get this from: <a href="/get-asset-unit" className="text-blue-400 hover:underline">/get-asset-unit</a>
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-600 rounded p-4">
              <p className="text-red-200 whitespace-pre-wrap">{error}</p>
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
            disabled={loading || !assetUnit || loadingAddress}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded font-semibold transition-colors"
          >
            {loading ? 'Burning...' : '🔥 Burn NFT (Server-Side)'}
          </button>
        </div>

        <div className="mt-6 bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <h3 className="font-semibold mb-2">How This Works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
            <li>You send the NFT to the minting wallet address</li>
            <li>The minting wallet (server-side) burns the NFT</li>
            <li>The burn requires a signature from the minting wallet&apos;s policy key</li>
            <li>Only the minting wallet can provide this signature</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
