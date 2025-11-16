"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

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
        await refreshBalance(walletInstance);
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

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

  const refreshBalance = async (walletInstance?: BrowserWallet) => {
    const w = walletInstance || wallet;
    if (w) {
      try {
        const walletBalance = await w.getBalance();
        setBalance(walletBalance);
      } catch (error) {
        console.error('Balance fetch error:', error);
      }
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
