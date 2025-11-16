"use client";

import { useState } from "react";

export default function GetAssetUnitPage() {
  const [txHash, setTxHash] = useState("");
  const [assetUnits, setAssetUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getAssetUnits = async () => {
    try {
      setLoading(true);
      setError("");
      setAssetUnits([]);

      const response = await fetch(`/api/nft/metadata/${txHash}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch metadata');
      }

      const data = await response.json();
      const metadata = data.metadata;

      const units: string[] = [];

      // Extract policyId and asset names from metadata
      const policyIds = Object.keys(metadata);

      for (const policyId of policyIds) {
        const assets = metadata[policyId];
        const assetNames = Object.keys(assets);

        for (const assetName of assetNames) {
          // Convert asset name to hex
          const assetNameHex = Buffer.from(assetName, 'utf8').toString('hex');
          const fullUnit = `${policyId}${assetNameHex}`;
          units.push(fullUnit);
        }
      }

      if (units.length === 0) {
        throw new Error('No NFTs found in this transaction');
      }

      setAssetUnits(units);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Failed to get asset units');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (unit: string) => {
    navigator.clipboard.writeText(unit);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Get Asset Unit for Burning</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium mb-2">
            Transaction Hash
          </label>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Enter your minting transaction hash..."
            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
          />

          <button
            onClick={getAssetUnits}
            disabled={loading || !txHash}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold transition-colors"
          >
            {loading ? 'Getting Asset Unit...' : 'Get Asset Unit'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {assetUnits.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Asset Units Found:</h2>
            {assetUnits.map((unit, idx) => (
              <div key={idx} className="mb-4 p-4 bg-gray-700 rounded border border-gray-600">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 overflow-auto">
                    <p className="text-xs text-gray-400 mb-1">Asset Unit #{idx + 1}:</p>
                    <code className="text-sm text-green-400 break-all font-mono">
                      {unit}
                    </code>
                    <div className="mt-2 text-xs text-gray-400">
                      <p>Policy ID: <span className="text-blue-400">{unit.substring(0, 56)}</span></p>
                      <p>Asset Name (hex): <span className="text-purple-400">{unit.substring(56)}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(unit)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm whitespace-nowrap"
                  >
                    📋 Copy
                  </button>
                </div>
                <a
                  href={`/burn?unit=${encodeURIComponent(unit)}`}
                  className="mt-3 inline-block px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                >
                  🔥 Go to Burn Page
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Quick Access:</h3>
          <p className="text-sm text-gray-300 mb-2">Your transaction hashes:</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setTxHash('8827b357bc3090fd2a313867ec00261dbeaa4670418f0cc7bf3e3da09e3c568a');
                setError('');
                setAssetUnits([]);
              }}
              className="block w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs font-mono"
            >
              8827b357bc3090fd2a313867ec00261dbeaa4670418f0cc7bf3e3da09e3c568a
            </button>
            <button
              onClick={() => {
                setTxHash('611e5ebc7d97db04bb55327b1ac997af01132c5bc322b7e38a9404163ce3862b');
                setError('');
                setAssetUnits([]);
              }}
              className="block w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs font-mono"
            >
              611e5ebc7d97db04bb55327b1ac997af01132c5bc322b7e38a9404163ce3862b
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
