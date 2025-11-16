"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Tab = 'dashboard' | 'view-nft' | 'burn' | 'tools';

export default function AdminPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard state
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // View NFT state
  const [txHash, setTxHash] = useState("");
  const [nftMetadata, setNftMetadata] = useState<any>(null);
  const [nftImage, setNftImage] = useState("");
  const [loadingNFT, setLoadingNFT] = useState(false);
  const [nftError, setNftError] = useState("");

  // Burn state
  const [assetUnit, setAssetUnit] = useState("");
  const [mintingAddress, setMintingAddress] = useState("");
  const [burnLoading, setBurnLoading] = useState(false);
  const [burnError, setBurnError] = useState("");
  const [burnSuccess, setBurnSuccess] = useState("");
  const [burnTxHash, setBurnTxHash] = useState("");

  // Define checkAuth function before using it in useEffect
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (response.ok) {
        setIsAuthenticated(true);
        setCurrentUser(data.authenticatedUser);
        setStats(data);
        loadMintingAddress();
      } else {
        setIsAuthenticated(false);
        setAuthError(data.error || 'Failed to authenticate');
      }
    } catch (err: any) {
      setIsAuthenticated(false);
      setAuthError(err.message);
    }
  }, []);

  // Check for OAuth errors/success in URL
  useEffect(() => {
    const error = searchParams.get('error');
    const userId = searchParams.get('userId');
    const logout = searchParams.get('logout');

    if (error === 'not_admin') {
      setAuthError(`Access Denied: Your Discord ID (${userId}) is not authorized as admin.`);
      setIsAuthenticated(false);
    } else if (error === 'access_denied') {
      setAuthError('You cancelled the Discord login.');
      setIsAuthenticated(false);
    } else if (error) {
      setAuthError(`Authentication error: ${error}`);
      setIsAuthenticated(false);
    } else if (logout) {
      setAuthError(null);
      setIsAuthenticated(false);
    } else if (searchParams.get('success')) {
      // Successful login, check auth status
      checkAuth();
    } else {
      // Initial load - check auth
      checkAuth();
    }
  }, [searchParams, checkAuth]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadMintingAddress = async () => {
    try {
      const response = await fetch('/api/config/minting-address');
      if (response.ok) {
        const data = await response.json();
        setMintingAddress(data.address);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const viewNFT = async () => {
    try {
      setLoadingNFT(true);
      setNftError("");
      setNftMetadata(null);
      setNftImage("");

      const response = await fetch(`/api/nft/metadata/${txHash}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch metadata');
      }

      const data = await response.json();
      const json = data.metadata;

      setNftMetadata(data.raw);

      // Extract image
      const policyIds = Object.keys(json);
      let foundImage = false;

      for (const policyId of policyIds) {
        const assets = json[policyId];
        const assetNames = Object.keys(assets);

        for (const assetName of assetNames) {
          const assetData = assets[assetName];
          let imageData = null;

          if (Array.isArray(assetData.image)) {
            // Join array chunks - first chunk already contains "data:image/png;base64," prefix
            imageData = assetData.image.join('');
          } else if (assetData.files && Array.isArray(assetData.files)) {
            const imageFile = assetData.files.find((f: any) => f.mediaType?.includes('image'));
            if (imageFile && Array.isArray(imageFile.src)) {
              // Join array chunks - first chunk already contains "data:image/png;base64," prefix
              imageData = imageFile.src.join('');
            }
          }

          if (imageData) {
            // Check if imageData already has the data URI prefix
            if (imageData.startsWith('data:image')) {
              setNftImage(imageData);
            } else {
              // Fallback for old format without prefix
              setNftImage(`data:image/png;base64,${imageData}`);
            }
            foundImage = true;
            break;
          }
        }
        if (foundImage) break;
      }

      if (!foundImage) {
        setNftError("Could not reconstruct image");
      }
    } catch (err: any) {
      setNftError(err.message);
    } finally {
      setLoadingNFT(false);
    }
  };

  const getAssetUnit = async () => {
    try {
      setBurnLoading(true);
      setBurnError("");

      const response = await fetch(`/api/nft/metadata/${txHash}`);
      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }

      const data = await response.json();
      const metadata = data.metadata;
      const policyIds = Object.keys(metadata);

      if (policyIds.length === 0) {
        throw new Error('No NFTs found');
      }

      const policyId = policyIds[0];
      const assets = metadata[policyId];
      const assetName = Object.keys(assets)[0];
      const assetNameHex = Buffer.from(assetName, 'utf8').toString('hex');

      setAssetUnit(`${policyId}${assetNameHex}`);
    } catch (err: any) {
      setBurnError(err.message);
    } finally {
      setBurnLoading(false);
    }
  };

  const burnNFT = async () => {
    try {
      setBurnLoading(true);
      setBurnError("");
      setBurnSuccess("");

      const response = await fetch('/api/burn/server-burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetUnit })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to burn');
      }

      setBurnTxHash(data.txHash);
      setBurnSuccess(`NFT burned! TX: ${data.txHash}`);
      loadStats(); // Refresh stats
    } catch (err: any) {
      setBurnError(err.message);
    } finally {
      setBurnLoading(false);
    }
  };

  const percentage = stats ? ((stats.sold / stats.totalSupply) * 100).toFixed(2) : '0';

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full border border-gray-700">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>

          {authError && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-4">
              <p className="text-red-200">{authError}</p>
            </div>
          )}

          <p className="text-gray-400 mb-6">
            Please login with your Discord account to access the admin dashboard.
          </p>

          <a
            href="/api/auth/discord/login"
            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition duration-200"
          >
            Login with Discord
          </a>

          <Link
            href="/"
            className="block w-full text-center mt-4 text-gray-400 hover:text-white transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated - show dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">NFT Admin Dashboard</h1>
              {currentUser && (
                <p className="text-sm text-gray-400 mt-1">
                  Logged in as: <span className="text-blue-400">{currentUser.username}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <a
                href="/api/auth/discord/logout"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                Logout
              </a>
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2">
            {[
              { id: 'dashboard' as Tab, label: '📊 Dashboard', icon: '📊' },
              { id: 'view-nft' as Tab, label: '👁️ View NFT', icon: '👁️' },
              { id: 'burn' as Tab, label: '🔥 Burn NFT', icon: '🔥' },
              { id: 'tools' as Tab, label: '🛠️ Tools', icon: '🛠️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Total Supply</div>
                <div className="text-3xl font-bold">{stats?.totalSupply || 0}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Sold</div>
                <div className="text-3xl font-bold text-green-400">{stats?.sold || 0}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Available</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.available || 0}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Sold %</div>
                <div className="text-3xl font-bold text-purple-400">{percentage}%</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Minting Progress</div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between">
                <h2 className="text-xl font-semibold">
                  Recent Sales {stats?.network && `(${stats.network})`}
                </h2>
                <button onClick={loadStats} className="text-sm text-blue-400 hover:text-blue-300">
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                {!stats?.recentSales || stats?.recentSales?.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No sales yet</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">NFT ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Wallet</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">TX Hash</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {stats?.recentSales?.map((sale: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-750">
                          <td className="px-6 py-4 text-sm">#{sale.nftId}</td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-400">
                            {sale.walletAddress.slice(0, 12)}...
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <a href={`https://${stats.network === 'MAINNET' ? '' : 'preprod.'}cardanoscan.io/transaction/${sale.txHash}`}
                               target="_blank"
                               className="text-blue-400 hover:underline font-mono">
                              {sale.txHash.slice(0, 12)}...
                            </a>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">{sale.soldAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW NFT TAB */}
        {activeTab === 'view-nft' && (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">View NFT Metadata</h2>

            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <label className="block text-sm font-medium mb-2">Transaction Hash</label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Enter transaction hash..."
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
              />
              <button
                onClick={viewNFT}
                disabled={loadingNFT || !txHash}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold"
              >
                {loadingNFT ? 'Loading...' : 'View NFT'}
              </button>
            </div>

            {nftError && (
              <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-6">
                <p className="text-red-200">{nftError}</p>
              </div>
            )}

            {nftImage && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4">NFT Image</h3>
                <div className="flex justify-center">
                  <img src={nftImage} alt="NFT" className="max-w-full h-auto rounded" style={{ imageRendering: 'pixelated' }} />
                </div>
              </div>
            )}

            {nftMetadata && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Raw Metadata</h3>
                <pre className="bg-gray-900 p-4 rounded overflow-auto max-h-96 text-xs">
                  {JSON.stringify(nftMetadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* BURN NFT TAB */}
        {activeTab === 'burn' && (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Burn NFT (Server-Side)</h2>

            {/* Instructions */}
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">How to Burn:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                <li>Send the NFT to the minting wallet address below</li>
                <li>Get the asset unit from the minting transaction (or enter it manually)</li>
                <li>Click &quot;Burn NFT&quot; to permanently destroy it</li>
              </ol>
            </div>

            {/* Minting Wallet Address */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-2">1. Minting Wallet Address</h3>
              <p className="text-gray-400 text-sm mb-4">Send your NFT to this address first:</p>
              <div className="bg-gray-700 p-3 rounded">
                <code className="text-sm text-green-400 break-all">{mintingAddress || 'Loading...'}</code>
                {mintingAddress && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(mintingAddress);
                      alert('Copied!');
                    }}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                  >
                    📋 Copy Address
                  </button>
                )}
              </div>
            </div>

            {/* Get Asset Unit (Optional Helper) */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-2">2. Get Asset Unit (Optional)</h3>
              <p className="text-gray-400 text-sm mb-4">Extract asset unit from minting transaction:</p>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Enter minting transaction hash..."
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 mb-4"
              />
              <button
                onClick={getAssetUnit}
                disabled={burnLoading || !txHash}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
              >
                {burnLoading ? 'Getting...' : 'Extract Asset Unit'}
              </button>
            </div>

            {/* Burn NFT */}
            <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
              <h3 className="text-xl font-semibold mb-2">3. Burn NFT</h3>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Asset Unit (PolicyId + AssetNameHex):</label>
                <input
                  type="text"
                  value={assetUnit}
                  onChange={(e) => setAssetUnit(e.target.value)}
                  placeholder="Enter or paste asset unit..."
                  className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 font-mono text-sm"
                />
              </div>

              {burnError && (
                <div className="bg-red-900/50 border border-red-600 rounded p-3 mb-4">
                  <p className="text-red-200 text-sm whitespace-pre-wrap">{burnError}</p>
                </div>
              )}

              {burnSuccess && (
                <div className="bg-green-900/50 border border-green-600 rounded p-3 mb-4">
                  <p className="text-green-200 text-sm">{burnSuccess}</p>
                  {burnTxHash && (
                    <a
                      href={`https://preprod.cardanoscan.io/transaction/${burnTxHash}`}
                      target="_blank"
                      className="text-blue-400 hover:underline text-sm block mt-2"
                    >
                      View on CardanoScan →
                    </a>
                  )}
                </div>
              )}

              <div className="bg-yellow-900/20 border border-yellow-600 rounded p-3 mb-4">
                <p className="text-yellow-300 text-sm">
                  ⚠️ <strong>Warning:</strong> Burning is permanent and cannot be undone!
                </p>
              </div>

              <button
                onClick={burnNFT}
                disabled={burnLoading || !assetUnit}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold"
              >
                {burnLoading ? 'Burning...' : '🔥 Burn NFT'}
              </button>
            </div>
          </div>
        )}

        {/* TOOLS TAB */}
        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-2">📋 Get Minting Address</h3>
              <p className="text-gray-400 text-sm mb-4">Copy the minting wallet address</p>
              <div className="bg-gray-700 p-3 rounded mb-4">
                <code className="text-sm text-green-400 break-all">{mintingAddress}</code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mintingAddress);
                  alert('Copied!');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                📋 Copy Address
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-2">🔄 Refresh Data</h3>
              <p className="text-gray-400 text-sm mb-4">Reload statistics and addresses</p>
              <button
                onClick={() => {
                  loadStats();
                  loadMintingAddress();
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                🔄 Refresh All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
