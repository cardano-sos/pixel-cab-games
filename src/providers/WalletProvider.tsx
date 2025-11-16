"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserWallet } from '@meshsdk/core';
import { useRouter } from 'next/navigation';

interface WalletContextType {
  isConnected: boolean;
  walletId: string | null;
  address: string | null;
  balance: any[] | null;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<any[] | null>(null);
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);

  const refreshBalance = useCallback(async (walletInstance?: BrowserWallet) => {
    try {
      const activeWallet = walletInstance || wallet;
      if (!activeWallet) return;

      const utxos = await activeWallet.getUtxos();

      // Sum lovelace across all UTxOs
      const totalLovelace = utxos.reduce((sum: number, utxo: any) => {
        const lovelaceAmount = utxo.output.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0';
        return sum + parseInt(lovelaceAmount);
      }, 0);

      // Collect all non-lovelace assets
      const assetMap = new Map<string, number>();
      utxos.forEach((utxo: any) => {
        utxo.output.amount.forEach((asset: any) => {
          if (asset.unit !== 'lovelace') {
            const current = assetMap.get(asset.unit) || 0;
            assetMap.set(asset.unit, current + parseInt(asset.quantity));
          }
        });
      });

      // Create balance array with summed values
      const balanceData = [
        { unit: 'lovelace', quantity: totalLovelace.toString() },
        ...Array.from(assetMap.entries()).map(([unit, quantity]) => ({
          unit,
          quantity: quantity.toString()
        }))
      ];

      setBalance(balanceData);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  }, [wallet]);

  // Check session on mount only (no dependencies to avoid infinite loop)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          setWalletId(data.session.walletId);
          setAddress(data.session.address);
          setIsConnected(true);

          // Reinitialize wallet
          const walletInstance = await BrowserWallet.enable(data.session.walletId);
          setWallet(walletInstance);

          // Refresh balance once
          const utxos = await walletInstance.getUtxos();
          const totalLovelace = utxos.reduce((sum: number, utxo: any) => {
            const lovelaceAmount = utxo.output.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0';
            return sum + parseInt(lovelaceAmount);
          }, 0);

          const assetMap = new Map<string, number>();
          utxos.forEach((utxo: any) => {
            utxo.output.amount.forEach((asset: any) => {
              if (asset.unit !== 'lovelace') {
                const current = assetMap.get(asset.unit) || 0;
                assetMap.set(asset.unit, current + parseInt(asset.quantity));
              }
            });
          });

          const balanceData = [
            { unit: 'lovelace', quantity: totalLovelace.toString() },
            ...Array.from(assetMap.entries()).map(([unit, quantity]) => ({
              unit,
              quantity: quantity.toString()
            }))
          ];

          setBalance(balanceData);
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };

    checkSession();
  }, []); // Empty dependency array - run only once on mount

  const connect = async (selectedWalletId: string) => {
    try {
      const walletInstance = await BrowserWallet.enable(selectedWalletId);
      const [userAddress] = await walletInstance.getUsedAddresses();

      if (userAddress) {
        // Create session
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletId: selectedWalletId,
            address: userAddress,
          }),
        });

        if (!response.ok) throw new Error('Failed to create session');

        setWallet(walletInstance);
        setWalletId(selectedWalletId);
        setAddress(userAddress);
        setIsConnected(true);
        await refreshBalance(walletInstance);
      }
    } catch (error) {
      console.error('Connect error:', error);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      setWallet(null);
      setWalletId(null);
      setAddress(null);
      setBalance(null);
      setIsConnected(false);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        walletId,
        address,
        balance,
        connect,
        disconnect,
        refreshBalance: () => refreshBalance(),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
