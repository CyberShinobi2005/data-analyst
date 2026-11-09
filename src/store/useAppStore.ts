import { create } from 'zustand';
import type { ActiveTab, CurrencySymbol, DatasetMetadata, ThemeMode } from '../types';

interface AppState {
  theme: ThemeMode;
  toggleTheme: () => void;
  currency: CurrencySymbol;
  setCurrency: (c: CurrencySymbol) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  metadata: DatasetMetadata | null;
  cleanRows: Record<string, unknown>[];
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setDataset: (cleanRows: Record<string, unknown>[], metadata: DatasetMetadata) => void;
  clearDataset: () => void;
  formatValue: (val: number | null | undefined, isCurrency?: boolean) => string;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  },

  currency: '$',
  setCurrency: (currency: CurrencySymbol) => set({ currency }),

  activeTab: 'dashboard',
  setActiveTab: (activeTab: ActiveTab) => set({ activeTab }),

  metadata: null,
  cleanRows: [],
  isLoading: false,
  loadingMessage: '',
  error: null,

  setLoading: (isLoading: boolean, loadingMessage: string = '') =>
    set({ isLoading, loadingMessage }),

  setError: (error: string | null) => set({ error, isLoading: false }),

  setDataset: (cleanRows: Record<string, unknown>[], metadata: DatasetMetadata) =>
    set({
      cleanRows,
      metadata,
      isLoading: false,
      loadingMessage: '',
      error: null,
    }),

  clearDataset: () =>
    set({
      cleanRows: [],
      metadata: null,
      error: null,
      activeTab: 'dashboard',
    }),

  formatValue: (val: number | null | undefined, isCurrency: boolean = true) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    const sym = isCurrency ? get().currency : '';
    const formattedNum = val.toLocaleString('en-US', {
      minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return sym ? `${sym}${formattedNum}` : formattedNum;
  },
}));
