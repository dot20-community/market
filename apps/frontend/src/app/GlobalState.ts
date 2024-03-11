import { create } from 'zustand';

export type GlobalState = {
  account?: string;
  dotPrice: number;
  gasFee: number;
  setAccount: (account?: string) => void;
  setDotPrice: (dotPrice: number) => void;
  setGasFee: (gasFee: number) => void;
};

const defaultState = {
  dotPrice: 10,
  gasFee: 0.02,
};

const SOTRAGE_KEY_ACCOUNT = 'SELECT_ACCOUNT';

export const useGlobalStateStore = create<GlobalState>((set) => {
  const account = localStorage.getItem(SOTRAGE_KEY_ACCOUNT);

  return {
    ...defaultState,
    account: account ?? undefined,
    setDotPrice: (dotPrice: number) => {
      set({ dotPrice });
    },
    setGasFee: (gasFee: number) => {
      set({ gasFee });
    },
    setAccount: (account?: string) => {
      if (!account) {
        localStorage.removeItem(SOTRAGE_KEY_ACCOUNT);
      } else {
        localStorage.setItem(SOTRAGE_KEY_ACCOUNT, account);
      }
      set({ account: account });
    },
  };
});
