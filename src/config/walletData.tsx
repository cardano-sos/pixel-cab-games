// src/data/walletData.tsx

export type WalletItem = {
  id: string;
  title: string;
};

export const walletData: WalletItem[] = [
  { id: 'eternl', title: 'Eternl' },
  { id: 'lace', title: 'Lace' },
  { id: 'flint', title: 'Flint' },
  { id: 'typhon', title: 'Typhon' },
  { id: 'gero', title: 'Gero' },
  { id: 'nufi', title: 'Nufi' },
  { id: 'vespr', title: 'Vespr' },
  { id: 'tokeo', title: 'Tokeo' }
];

// Helper function to validate wallet IDs
export const isValidWallet = (id: string): boolean => {
  const validWallets = [
    'eternl', 'lace', 'flint', 'typhon', 'gero', 'nufi', 'vespr', 'begin'
  ];
  return validWallets.includes(id);
};
