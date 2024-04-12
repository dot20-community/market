import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { AssetInfo } from 'apps/backend/src/modules/asset';
import { create } from 'zustand';

export type GlobalState = {
  account?: string;
  accounts: InjectedAccountWithMeta[];
  dotPrice: number;
  gasFee: number;
  assetInfos: AssetInfo[];
  setAccount: (account?: string) => void;
  setAccounts: (accounts: InjectedAccountWithMeta[]) => void;
  setDotPrice: (dotPrice: number) => void;
  setGasFee: (gasFee: number) => void;
  setAssetInfo: (assetInfo: AssetInfo) => void;
};

const defaultState = {
  dotPrice: 10,
  gasFee: 0.02,
  assetInfos: [] as AssetInfo[],
  accounts: [] as InjectedAccountWithMeta[],
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
    setAccounts: (accounts: InjectedAccountWithMeta[]) => {
      set({ accounts });
    },
    setAssetInfo: (assetInfo: AssetInfo) => {
      set((state) => {
        const index = state.assetInfos.findIndex(
          (info) => info.id === assetInfo.id,
        );
        if (index === -1) {
          state.assetInfos.push(assetInfo);
        } else {
          state.assetInfos[index] = assetInfo;
        }
        // 注意这里要返回一个新的数组，否则不会触发更新
        return { assetInfos: [...state.assetInfos] };
      });
    },
  };
});
