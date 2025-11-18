"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BrowserWallet, Transaction, AssetMetadata } from "@meshsdk/core";
import { useWallet } from "@/providers/WalletProvider";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { SiteFooter } from "@/app/_components/SiteFooter";

interface NFTMetadata {
  id: number;
  name: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface AvailableNFT {
  id: number;
  metadata: NFTMetadata;
  imagePath: string;
}

interface MintStatus {
  status: 'idle' | 'preparing' | 'signing' | 'submitting' | 'success' | 'error';
  message?: string;
  txHash?: string;
}

interface MintedNFT {
  id: number;
  name: string;
  imageData: string; // Base64 image data
  assetName: string;
  txHash: string;
}

export default function MintPage() {
  const router = useRouter();
  const { isConnected, walletId, address, disconnect, refreshBalance } = useWallet();
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [mintStatus, setMintStatus] = useState<MintStatus>({ status: 'idle' });
  const [mintedNFTs, setMintedNFTs] = useState<MintedNFT[]>([]);
  const [paymentTxHash, setPaymentTxHash] = useState<string>("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Queue state
  const [queueId, setQueueId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [queueStatus, setQueueStatus] = useState<string>('idle');
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number>(0);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number | null>(null);

  // Import NFT configuration
  const { COST_PER_NFT, PROFIT_WALLET, USE_BASE64_IMAGES, COLLECTION } =
    require('@/config/nft').NFT_CONFIG;

  useEffect(() => {
    if (isConnected) {
      loadAvailableCount();
    }
  }, [isConnected]);

  // Restore queue state from localStorage on page load
  // IMPORTANT: Queue is wallet-based, so validate the saved queue belongs to current wallet
  useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      const savedQueueId = localStorage.getItem('mintQueueId');
      const savedWallet = localStorage.getItem('mintQueueWallet');

      if (savedQueueId && savedWallet) {
        // Check if saved queue belongs to current wallet
        if (savedWallet === address) {
          console.log('🔄 Restoring queue from localStorage:', savedQueueId);
          setQueueId(savedQueueId);
          setQueueStatus('waiting');
          setMintStatus({ status: 'preparing', message: 'Restoring queue position...' });
        } else {
          // Wallet changed, clear old queue data
          console.log('🔄 Wallet changed, clearing old queue data');
          localStorage.removeItem('mintQueueId');
          localStorage.removeItem('mintQueueWallet');
        }
      }
    }
  }, [address]);

  // Save/clear queue ID in localStorage whenever it changes
  // Also save wallet address to validate queue belongs to this wallet
  useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      if (queueId) {
        localStorage.setItem('mintQueueId', queueId);
        localStorage.setItem('mintQueueWallet', address);
        console.log('💾 Saved queue to localStorage:', queueId);
      } else {
        localStorage.removeItem('mintQueueId');
        localStorage.removeItem('mintQueueWallet');
        console.log('🗑️ Cleared queue from localStorage');
      }
    }
  }, [queueId, address]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // Poll queue status
  useEffect(() => {
    if (!queueId || queueStatus === 'completed' || queueStatus === 'failed') {
      return;
    }

    const pollQueue = async () => {
      try {
        const response = await fetch(`/api/queue/status?queueId=${queueId}`);
        if (response.ok) {
          const data = await response.json();
          setQueuePosition(data.position);
          setQueueStatus(data.status);
          setEstimatedWaitTime(data.estimatedWaitTime);
          setTimeoutSeconds(data.timeoutSeconds);

          // Check if timed out (5 minute limit exceeded)
          if (data.timeoutSeconds !== undefined && data.timeoutSeconds !== null && data.timeoutSeconds <= 0) {
            console.log('⏰ Queue timeout - you took too long to mint');
            setError('Your queue session timed out (5 minute limit). Please try again.');
            setMintStatus({ status: 'error', message: 'Queue timeout - you took too long to mint. Please try again.' });
            setQueueId(null);
            setQueueStatus('failed');
            return;
          }

          // If at front of queue (position 1) and status is waiting, can start minting
          if (data.position === 1 && data.status === 'waiting') {
            console.log('🎯 Your turn to mint!');
            // handleMint will proceed automatically
          }
        } else if (response.status === 404) {
          // Queue entry not found (likely cleaned up due to timeout)
          console.log('⏰ Queue entry not found - likely timed out');
          setError('Your queue session timed out. Please try again.');
          setMintStatus({ status: 'error', message: 'Queue timeout. Please try again.' });
          setQueueId(null);
          setQueueStatus('failed');
        }
      } catch (error) {
        console.error('Error polling queue:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollQueue, 2000);
    pollQueue(); // Poll immediately

    return () => clearInterval(interval);
  }, [queueId, queueStatus]);

  const loadAvailableCount = async () => {
    try {
      const response = await fetch('/api/nfts/available?mode=count');
      if (response.ok) {
        const data = await response.json();
        setTotalAvailable(data.count);
      }
    } catch (error) {
      console.error('Error loading available count:', error);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    router.push('/');
  };

  const handleMint = async () => {
    try {
      setIsLoading(true);
      setError("");
      setMintedNFTs([]);
      setPaymentTxHash("");
      setMintStatus({ status: 'preparing' });

      // Validate configuration
      if (PROFIT_WALLET === "addr1qy....") {
        throw new Error("Please set NEXT_PUBLIC_PROFIT_WALLET in your environment variables before minting");
      }

      if (!walletId || !address) {
        throw new Error("No wallet connected");
      }

      // Step 1: Join queue
      setMintStatus({ status: 'preparing', message: 'Joining mint queue...' });

      const queueResponse = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });

      if (!queueResponse.ok) {
        throw new Error('Failed to join queue');
      }

      const queueData = await queueResponse.json();
      setQueueId(queueData.queueId);
      setQueuePosition(queueData.position);
      setQueueStatus('waiting');

      console.log(`📝 Joined queue at position ${queueData.position}`);

      // Step 2: Wait for our turn (if not at position 1)
      if (queueData.position > 1) {
        setMintStatus({
          status: 'preparing',
          message: `Queue position: #${queueData.position}. Please wait your turn...`
        });

        // Wait until we're at front of queue (position 1)
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s

          const statusResponse = await fetch(`/api/queue/status?queueId=${queueData.queueId}`);
          if (!statusResponse.ok) break;

          const statusData = await statusResponse.json();
          setQueuePosition(statusData.position);
          setQueueStatus(statusData.status);
          setEstimatedWaitTime(statusData.estimatedWaitTime);

          if (statusData.position === 1 && statusData.status === 'waiting') {
            console.log('🎯 Your turn to mint!');
            break;
          }

          setMintStatus({
            status: 'preparing',
            message: `Queue position: #${statusData.position}. Estimated wait: ${Math.ceil(statusData.estimatedWaitTime / 60)} min`
          });
        }
      }

      // Step 3: Get user's UTxOs
      setMintStatus({ status: 'preparing', message: 'Preparing minting transaction...' });

      const wallet = await BrowserWallet.enable(walletId);
      const userUtxos = await wallet.getUtxos();
      console.log(`User has ${userUtxos.length} UTxOs available`);

      // Step 2: Request server to build unsigned minting transaction
      setMintStatus({ status: 'preparing', message: 'Building minting transaction...' });

      const buildResponse = await fetch('/api/mint/build-mint-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          userUtxos: userUtxos,
          queueId: queueData.queueId
        })
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json();
        throw new Error(errorData.error || 'Failed to build minting transaction');
      }

      const { unsignedTx, nftData } = await buildResponse.json();
      console.log('Received unsigned transaction from server');

      // Step 3: User signs the transaction (full sign, we'll add minting signature server-side)
      setMintStatus({ status: 'signing', message: 'Please sign the minting transaction in your wallet...' });
      const userSignedTx = await wallet.signTx(unsignedTx);

      console.log('User signed transaction');

      // Step 4: Send user-signed tx back to server for co-signing and submission
      setMintStatus({ status: 'submitting', message: 'Submitting minting transaction...' });

      const submitResponse = await fetch('/api/mint/submit-mint-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unsignedTx,
          userSignedTx: userSignedTx,
          userAddress: address,
          nftData,
          queueId: queueData.queueId
        })
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.error || 'Failed to submit minting transaction');
      }

      const mintData = await submitResponse.json();

      console.log('NFT minted:', mintData);

      // Set the minted NFTs (from nftData returned in build step)
      setMintedNFTs([mintData.mintedNFT]);
      setPaymentTxHash(mintData.txHash); // The single minting transaction

      // Handle successful mint
      const successMessage = mintData.confirmed
        ? '✅ Collectible minted and confirmed on blockchain!'
        : '🎉 Collectible minted! Confirming on blockchain (may take 30-60s)...';

      setMintStatus({
        status: 'success',
        message: successMessage,
        txHash: mintData.txHash
      });

      // Update queue status and clear queue ID (will remove from localStorage)
      setQueueStatus('completed');
      setQueueId(null);

      // Reload available count after success
      loadAvailableCount();

      // Refresh wallet balance for display
      try {
        await refreshBalance();
        console.log('✅ Wallet balance refreshed');
      } catch (refreshError) {
        console.warn('Failed to refresh wallet balance:', refreshError);
      }

      console.log('✅ Mint completed, queue released for next user');

    } catch (error: any) {
      console.error("Minting error:", error);

      // Detect UTxO conflict errors
      const errorMessage = error.message || '';
      const isUtxoConflict = errorMessage.includes('BadInputsUTxO') ||
                             errorMessage.includes('ValueNotConservedUTxO') ||
                             errorMessage.includes('already spent');

      if (isUtxoConflict) {
        setError("Your wallet is still syncing from the previous mint. Please wait 15-30 seconds before trying again.");
        setMintStatus({
          status: 'error',
          message: "⏳ Wallet syncing - please wait 15-30 seconds before minting again. Your previous mint was successful!"
        });

        // Try to refresh wallet for next attempt
        try {
          await refreshBalance();
        } catch (refreshError) {
          console.error('Failed to refresh wallet:', refreshError);
        }
      } else {
        setError(errorMessage || "Failed to mint Collectible");
        setMintStatus({
          status: 'error',
          message: errorMessage || "Failed to mint Collectible"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-theme-primary py-8">
        <div className="max-w-4xl mx-auto px-4">
          <SiteHeader />
          <div className="bg-theme-card border border-theme-accent rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-theme-primary mb-2">Wallet Not Connected</h2>
            <p className="text-gray-700 mb-4">Please connect your wallet to access the minting page.</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-theme-secondary text-theme-primary font-medium rounded hover:bg-theme-highlight transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if configuration is needed
  const needsConfiguration = PROFIT_WALLET === "addr1qy....";

  return (
    <div className="min-h-screen bg-theme-primary py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Configuration Warning */}
        {needsConfiguration && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Configuration Required</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Before you can mint Collectibles, please ensure these environment variables are set on the server:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>MINTTING_WALLET_OUTPUT_MNEMONIC (24-word phrase for server-side minting)</li>
                    <li>NEXT_PUBLIC_PROFIT_WALLET (your Cardano wallet address for receiving payments)</li>
                    <li>BLOCKFROST_PROJECT_ID (for blockchain connectivity)</li>
                  </ul>
                  <p className="mt-2">💡 Minting happens server-side with your minting wallet. Users just pay!</p>
                  <p className="mt-1">See <code className="bg-yellow-100 px-1 rounded">.envrc.example</code> or <code className="bg-yellow-100 px-1 rounded">ENVRC_SETUP.md</code> for setup.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Site Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {/* Mini logo */}
            <div className="flex items-center gap-2">
              <Image
                src="/Face_Logo_2_Blue_Pink_border_Large_Size.png.webp"
                alt="Pixel Cab"
                width={48}
                height={48}
                className="pixelated"
              />
              <span className="text-theme-secondary font-bold text-xl">Pixel Cab Games</span>
            </div>

            {/* Wallet info */}
            <div className="text-right">
              <div className="text-sm text-theme-secondary">
                Connected: <span className="text-theme-blue">{walletId}</span>
              </div>
              {address && (
                <div className="text-xs text-gray-400">
                  {address.slice(0, 8)}...{address.slice(-8)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleDisconnect}
              className="text-sm text-theme-accent hover:text-white border border-theme-accent hover:bg-theme-accent px-3 py-1 rounded transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="bg-theme-card rounded-lg shadow-lg overflow-hidden border border-theme-primary">
          <div className="md:flex">
            <div className="md:flex-shrink-0 md:w-1/2">
              <div className="h-full flex items-center justify-center p-6 bg-gray-900 relative overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="grid grid-cols-4 gap-2 p-4">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square bg-gradient-to-br from-blue-500 to-pink-500 rounded"
                        style={{
                          opacity: Math.random() * 0.3 + 0.1,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Mystery Box or Minted NFT */}
                <div className="text-center relative z-10">
                  {mintStatus.status === 'success' && mintedNFTs.length > 0 ? (
                    <>
                      <h3 className="text-theme-secondary font-bold mb-4 text-xl">Your Collectible!</h3>
                      <div className="inline-block p-4 bg-theme-primary rounded-lg border-2 border-theme-secondary">
                        <img
                          src={`data:image/png;base64,${mintedNFTs[0].imageData}`}
                          alt={mintedNFTs[0].name}
                          width={200}
                          height={200}
                          className="object-contain pixelated"
                        />
                        <p className="text-theme-secondary font-semibold mt-2">{mintedNFTs[0].name}</p>
                      </div>
                    </>
                  ) : queuePosition > 1 && queueStatus === 'waiting' ? (
                    <>
                      <h3 className="text-blue-400 font-bold mb-4 text-xl">You&apos;re in Queue</h3>
                      <div className="inline-block p-4 bg-theme-primary rounded-lg border-2 border-blue-500">
                        <div className="w-48 h-48 bg-gradient-to-br from-blue-900 to-purple-900 rounded flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-32 h-32 border-8 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                          </div>
                          <div className="text-center z-10">
                            <div className="text-5xl font-bold text-white mb-2">#{queuePosition}</div>
                            <div className="text-sm text-blue-300">in queue</div>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        </div>
                        <p className="text-blue-400 text-sm mt-2 font-medium">Please wait your turn...</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-theme-secondary font-bold mb-4 text-xl">Mystery Collectible</h3>
                      <div className="inline-block p-4 bg-theme-primary rounded-lg border-2 border-theme-secondary">
                        <div className="w-48 h-48 bg-gradient-to-br from-purple-900 to-pink-900 rounded flex items-center justify-center relative overflow-hidden">
                          <span className="text-6xl animate-pulse">❓</span>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        </div>
                        <p className="text-gray-400 text-sm mt-2">Mystery Collectible</p>
                      </div>
                    </>
                  )}
                  <p className="text-gray-400 text-sm mt-4">{COLLECTION.name}</p>
                </div>
              </div>
              <style jsx>{`
                .pixelated {
                  image-rendering: pixelated;
                  image-rendering: -moz-crisp-edges;
                  image-rendering: crisp-edges;
                }
              `}</style>
            </div>

            <div className="p-8 md:w-1/2">
              <h1 className="text-2xl font-bold text-theme-primary mb-4">
                Mint Pixel Cab Collectible
              </h1>

              <p className="text-gray-700 mb-6">
                Mint a randomly selected Collectible from the Pixel Cab collection! Your Collectible will be revealed after minting.
              </p>

              {/* Cost Display */}
              <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold">Cost:</span>
                  <span className="text-2xl font-bold text-theme-primary">{COST_PER_NFT} ADA</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">One Collectible per mint</p>
              </div>

              {/* Status Messages */}
              {mintStatus.status !== 'idle' && (
                <div className={`p-4 mb-4 rounded-lg ${mintStatus.status === 'success' ? 'bg-theme-secondary/10 text-theme-primary border border-theme-primary' :
                    mintStatus.status === 'error' ? 'bg-theme-accent/10 text-theme-primary border border-theme-accent' :
                      'bg-theme-highlight/10 text-theme-primary border border-theme-primary'
                  }`}>
                  <div className="whitespace-pre-line">
                    {mintStatus.message}
                  </div>
                  {mintStatus.status === 'success' && mintedNFTs.length > 0 && (
                    <div className="mt-4">
                      {/* Minting Transaction */}
                      <div className="border-t border-gray-300 pt-3">
                        <div className="font-semibold text-sm mb-2">🎨 Minting Transaction:</div>
                        <div className="bg-white/5 rounded p-2">
                          <div className="text-sm font-medium">{mintedNFTs[0].name}</div>
                          <a
                            href={`https://preprod.cardanoscan.io/transaction/${mintedNFTs[0].txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline break-all"
                          >
                            TX: {mintedNFTs[0].txHash}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  {mintStatus.txHash && mintStatus.status !== 'success' && (
                    <div className="mt-2 text-sm break-all">
                      Transaction: {mintStatus.txHash}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mb-4 text-theme-accent text-sm font-medium">{error}</div>
              )}

              {/* Queue Status - Enhanced */}
              {queueId && queueStatus !== 'completed' && queueStatus !== 'failed' && (
                <div className="mb-6">
                  {queuePosition > 1 && queueStatus === 'waiting' ? (
                    /* Waiting in Queue - Prominent Display */
                    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg border-2 border-blue-500/50 p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {/* Animated Loading Spinner */}
                          <div className="relative">
                            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-blue-400 font-bold text-sm">#{queuePosition}</span>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">You&apos;re in the Queue!</h3>
                            <p className="text-blue-300 text-sm">Position #{queuePosition} of {queuePosition} waiting</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/30 rounded-lg p-4 mb-4">
                        <p className="text-white font-medium mb-2">⏳ Please wait your turn</p>
                        <p className="text-gray-300 text-sm">
                          The page will <span className="text-green-400 font-semibold">automatically start minting</span> when it&apos;s your turn.
                          You don&apos;t need to do anything - just keep this page open!
                        </p>
                      </div>

                      {estimatedWaitTime > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Estimated wait time:</span>
                          <span className="text-yellow-400 font-bold">
                            ~{Math.ceil(estimatedWaitTime / 60)} minute{Math.ceil(estimatedWaitTime / 60) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* Timeout countdown - show if queue position is 1 */}
                      {queuePosition === 1 && timeoutSeconds !== null && timeoutSeconds > 0 && (
                        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-red-300 font-medium">⏰ Time remaining to mint:</span>
                            <span className="text-red-400 font-bold text-lg">
                              {Math.floor(timeoutSeconds / 60)}:{(timeoutSeconds % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <p className="text-xs text-red-300 mt-2">
                            You have 5 minutes to complete your mint or you&apos;ll lose your turn.
                          </p>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-gray-400 text-center">
                          💡 Each person must fully complete their mint before the next person can start.
                          This ensures zero transaction conflicts.
                        </p>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          ⚠️ You&apos;ll have 5 minutes to mint once it&apos;s your turn.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Currently Minting or Confirming - Compact Display */
                    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 border-3 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                        <div className="flex-1">
                          {queuePosition === 1 && queueStatus === 'minting' && (
                            <div className="text-green-400 font-medium">🔨 Minting your Collectible...</div>
                          )}
                          {queueStatus === 'confirming' && (
                            <div className="text-yellow-400 font-medium">⏳ Confirming on blockchain (~30s)...</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">Queue Position: #{queuePosition}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mint Button */}
              <button
                onClick={handleMint}
                disabled={isLoading || mintStatus.status === 'success' || needsConfiguration || cooldownSeconds > 0 || (queuePosition > 1 && queueStatus === 'waiting')}
                className={`w-full bg-theme-secondary text-theme-primary py-3 px-6 rounded-lg font-semibold
                  ${(isLoading || mintStatus.status === 'success' || needsConfiguration || cooldownSeconds > 0 || (queuePosition > 1 && queueStatus === 'waiting')) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-highlight'}
                  transition-colors
                `}
              >
                {queuePosition > 1 && queueStatus === 'waiting'
                  ? `⏳ Waiting in Queue (Position #${queuePosition})`
                  : cooldownSeconds > 0
                  ? `Please wait ${cooldownSeconds}s (wallet syncing...)`
                  : needsConfiguration
                  ? 'Configuration Required'
                  : isLoading
                  ? 'Minting...'
                  : mintStatus.status === 'success'
                  ? 'Mint Successful!'
                  : `Mint Collectible (${COST_PER_NFT} ADA)`}
              </button>

              {/* Reset Button after success */}
              {mintStatus.status === 'success' && (
                <button
                  onClick={() => {
                    // Warn user they'll go to back of queue
                    const confirmMint = window.confirm(
                      "If you mint again, you will be placed at the back of the queue.\n\n" +
                      "Are you sure you want to mint another Collectible?"
                    );

                    if (confirmMint) {
                      setMintStatus({ status: 'idle' });
                      setMintedNFTs([]);
                      setPaymentTxHash("");
                      loadAvailableCount();
                    }
                  }}
                  className="w-full mt-4 bg-white border-2 border-theme-blue text-theme-blue py-2 px-6 rounded-lg font-semibold hover:bg-theme-blue hover:text-white transition-colors"
                >
                  Mint Another Collectible
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
