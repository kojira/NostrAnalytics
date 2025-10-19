import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AnalyticsConfig, MetricType, MetricDataPoint } from '../types';

interface AnalyticsState {
  // Configuration
  config: AnalyticsConfig;
  setRelays: (relays: string[]) => void;
  setLanguages: (languages: string[]) => void;
  setDateRange: (start: Date, end: Date) => void;
  setMetrics: (metrics: MetricType[]) => void;
  
  // Analysis state
  isAnalyzing: boolean;
  progress: {
    stage: string;
    current: number;
    total: number;
  } | null;
  setAnalyzing: (analyzing: boolean) => void;
  setProgress: (progress: { stage: string; current: number; total: number } | null) => void;
  
  // Results (now supports language-keyed data)
  results: Record<string, any>;
  setResults: (key: string, data: any) => void;
  clearResults: () => void;
  
  // Events data for browser
  events: any[];
  setEvents: (events: any[]) => void;
  
  // Nostr
  pubkey: string | null;
  setPubkey: (pubkey: string | null) => void;
}

// Default config
const defaultConfig: AnalyticsConfig = {
  relays: [
    'wss://x.kojira.io'
  ],
  languages: ['en', 'ja'],
  dateRange: {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    end: new Date()
  },
  metrics: ['dau', 'wau', 'mau']
};

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set) => ({
      // Configuration
      config: defaultConfig,
      setRelays: (relays) =>
        set((state) => ({
          config: { ...state.config, relays }
        })),
      setLanguages: (languages) =>
        set((state) => ({
          config: { ...state.config, languages }
        })),
      setDateRange: (start, end) =>
        set((state) => ({
          config: { ...state.config, dateRange: { start, end } }
        })),
      setMetrics: (metrics) =>
        set((state) => ({
          config: { ...state.config, metrics }
        })),
      
      // Analysis state
      isAnalyzing: false,
      progress: null,
      setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      setProgress: (progress) => set({ progress }),
      
      // Results
      results: {},
      setResults: (key, data) =>
        set((state) => ({
          results: { ...state.results, [key]: data }
        })),
      clearResults: () => set({ results: {} }),
      
      // Events data
      events: [],
      setEvents: (events) => set({ events }),
      
      // Nostr
      pubkey: null,
      setPubkey: (pubkey) => set({ pubkey })
    }),
    {
      name: 'nostr-analytics-storage',
      partialize: (state) => ({
        config: {
          ...state.config,
          dateRange: {
            start: state.config.dateRange.start.toISOString(),
            end: state.config.dateRange.end.toISOString()
          }
        },
        pubkey: state.pubkey
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.config.dateRange) {
          // Convert string dates back to Date objects
          state.config.dateRange.start = new Date(state.config.dateRange.start);
          state.config.dateRange.end = new Date(state.config.dateRange.end);
        }
      }
    }
  )
);

