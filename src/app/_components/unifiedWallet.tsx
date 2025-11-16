"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { walletData } from "@/data/walletData";
import { useWallet } from "@/providers/WalletProvider";

export const UnifiedWallet = () => {
  const router = useRouter();
  const { isConnected, walletId, address, balance, connect, disconnect } = useWallet();
  const [WalletComponent, setWalletComponent] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);

  // Load CardanoWallet component
  useEffect(() => {
    const loadWalletComponent = async () => {
      try {
        const { CardanoWallet } = await import("@meshsdk/react");
        setWalletComponent(() => CardanoWallet);
      } catch (error) {
        console.error("Error importing CardanoWallet:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadWalletComponent();
  }, []);

  const handleWalletSelect = async (selectedWalletId: string) => {
    try {
      setIsConnecting(true);
      setConnectingWalletId(selectedWalletId);
      await connect(selectedWalletId);
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
      setConnectingWalletId(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading wallet component...</p>
        </div>
      </div>
    );
  }

  // Connected state
  if (isConnected) {
    const adaBalance = balance?.find(b => b.unit === 'lovelace');
    const adaAmount = adaBalance ? (parseInt(adaBalance.quantity) / 1_000_000).toFixed(2) : '0.00';

    return (
      <div className="p-4">
        <div className="mb-4 p-4 bg-theme-secondary/10 border border-theme-primary rounded-lg">
          <p className="text-sm text-theme-primary font-medium">
            ✓ Connected to {walletId}
          </p>
          {address && (
            <p className="text-xs text-gray-700 mt-1">
              Address: <span className="font-mono">{address.slice(0, 8)}...{address.slice(-8)}</span>
            </p>
          )}
          <p className="text-xs text-gray-700 mt-1">
            Balance: <span className="font-medium">{adaAmount} ADA</span>
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => router.push('/mint')}
            className="px-4 py-2 bg-theme-secondary text-theme-primary font-medium rounded hover:bg-theme-highlight transition-colors"
          >
            Go to Mint Page
          </button>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 text-theme-accent border border-theme-accent rounded hover:bg-theme-accent hover:text-white transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Wallet selection state
  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-theme-primary">Select a Wallet</h3>
        <p className="text-sm text-gray-600 mt-1">
          Choose your Cardano wallet to connect
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {walletData.map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => handleWalletSelect(wallet.id)}
            disabled={isConnecting}
            className={`
              flex items-center justify-center p-4 border rounded-lg
              transition-all duration-200
              ${isConnecting
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-theme-highlight/10 hover:border-theme-primary hover:shadow-sm'
              }
              ${connectingWalletId === wallet.id
                ? 'border-theme-primary bg-theme-highlight/10'
                : 'border-gray-300'
              }
            `}
          >
            <span className="text-sm font-medium text-theme-primary">
              {connectingWalletId === wallet.id ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-theme-primary mr-2"></span>
                  Connecting...
                </span>
              ) : (
                wallet.title
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
