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
  const { isConnected, walletId, address, disconnect } = useWallet();
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [mintStatus, setMintStatus] = useState<MintStatus>({ status: 'idle' });
  const [mintedNFTs, setMintedNFTs] = useState<MintedNFT[]>([]);
  const [paymentTxHash, setPaymentTxHash] = useState<string>("");

  // Import NFT configuration
  const { COST_PER_NFT, PROFIT_WALLET, USE_BASE64_IMAGES, COLLECTION } =
    require('@/config/nft').NFT_CONFIG;

  useEffect(() => {
    if (isConnected) {
      loadAvailableCount();
    }
  }, [isConnected]);

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

      if (!walletId) {
        throw new Error("No wallet connected");
      }

      const wallet = await BrowserWallet.enable(walletId);

      // Step 1: Get user's UTxOs
      setMintStatus({ status: 'preparing', message: 'Preparing minting transaction...' });

      const userUtxos = await wallet.getUtxos();
      console.log(`User has ${userUtxos.length} UTxOs available`);

      // Step 2: Request server to build unsigned minting transaction
      setMintStatus({ status: 'preparing', message: 'Building minting transaction...' });

      const buildResponse = await fetch('/api/mint/build-mint-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          userUtxos: userUtxos
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
          nftData
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
      setMintStatus({
        status: 'success',
        message: 'Mint successful! Your NFT will arrive in your wallet shortly.',
        txHash: mintData.txHash
      });

      // Reload available count after success
      loadAvailableCount();

    } catch (error: any) {
      console.error("Minting error:", error);
      setError(error.message || "Failed to mint NFT");
      setMintStatus({
        status: 'error',
        message: error.message || "Failed to mint NFT"
      });
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
                  <p>Before you can mint NFTs, please ensure these environment variables are set on the server:</p>
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
                      <h3 className="text-theme-secondary font-bold mb-4 text-xl">Your NFT!</h3>
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
                  ) : (
                    <>
                      <h3 className="text-theme-secondary font-bold mb-4 text-xl">Mystery NFT</h3>
                      <div className="inline-block p-4 bg-theme-primary rounded-lg border-2 border-theme-secondary">
                        <div className="w-48 h-48 bg-gradient-to-br from-purple-900 to-pink-900 rounded flex items-center justify-center relative overflow-hidden">
                          <span className="text-6xl animate-pulse">❓</span>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        </div>
                        <p className="text-gray-400 text-sm mt-2">Mystery NFT</p>
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
                Mint Pixel Cab NFT
              </h1>

              <p className="text-gray-700 mb-6">
                Mint a randomly selected NFT from the Pixel Cab collection! Your NFT will be revealed after minting.
              </p>

              {/* Cost Display */}
              <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold">Cost:</span>
                  <span className="text-2xl font-bold text-theme-primary">{COST_PER_NFT} ADA</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">One NFT per mint</p>
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

              {/* Mint Button */}
              <button
                onClick={handleMint}
                disabled={isLoading || mintStatus.status === 'success' || needsConfiguration}
                className={`w-full bg-theme-secondary text-theme-primary py-3 px-6 rounded-lg font-semibold
                  ${(isLoading || mintStatus.status === 'success' || needsConfiguration) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-highlight'}
                  transition-colors
                `}
              >
                {needsConfiguration ? 'Configuration Required' :
                  isLoading ? 'Minting...' :
                  mintStatus.status === 'success' ? 'Mint Successful!' :
                    `Mint NFT (${COST_PER_NFT} ADA)`}
              </button>

              {/* Reset Button after success */}
              {mintStatus.status === 'success' && (
                <button
                  onClick={() => {
                    setMintStatus({ status: 'idle' });
                    setMintedNFTs([]);
                    setPaymentTxHash("");
                    loadAvailableCount();
                  }}
                  className="w-full mt-4 bg-white border-2 border-theme-blue text-theme-blue py-2 px-6 rounded-lg font-semibold hover:bg-theme-blue hover:text-white transition-colors"
                >
                  Mint Another NFT
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
