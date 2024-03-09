import { create } from 'zustand';

console.log('init GlobalState');

export type GlobalState = {
  dotPrice: number;
  gasFee: number;
  setDotPrice: (dotPrice: number) => void;
  setGasFee: (gasFee: number) => void;
};

const defaultState = {
  dotPrice: 10,
  gasFee: 0.02,
};

export const useGlobalStateStore = create<GlobalState>((set) => {
  return {
    ...defaultState,
    setDotPrice: (dotPrice: number) => {
      set({ dotPrice });
    },
    setGasFee: (gasFee: number) => {
      set({ gasFee });
    },
  };
});
