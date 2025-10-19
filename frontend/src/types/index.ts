// Type definitions for the application

export interface LanguageIndexResult {
  users: number;
  by_lang: Record<string, number>;
  events_processed: number;
  events_with_language: number;
}

export interface LanguageIndexOptions {
  since: number;
  until: number;
  maxEvents?: number;
  confThresh?: number;
  maxLangsPerUser?: number;
}

export interface MetricsOptions {
  since: number;
  until: number;
  languages: string[];
  granularity: 'day';
  window_days: 1 | 7 | 30 | 365;
}

export interface MetricDataPoint {
  epoch_day: number;
  count: number;
}

export type MetricType = 'dau' | 'wau' | 'mau' | 'yau';

export interface AnalyticsConfig {
  relays: string[];
  languages: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: MetricType[];
}

export interface CachedResult {
  key: string;
  data: MetricDataPoint[];
  generatedAt: number;
  ttl: number;
}

// NIP-07 window.nostr interface
export interface NostrProvider {
  getPublicKey(): Promise<string>;
  signEvent(event: NostrEvent): Promise<NostrEvent>;
}

export interface NostrEvent {
  id?: string;
  pubkey?: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

declare global {
  interface Window {
    nostr?: NostrProvider;
  }
}

// Language options for UI
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

