import Dexie, { Table } from 'dexie';
import { CachedResult } from '../types';

// IndexedDB schema
class AnalyticsDatabase extends Dexie {
  metrics!: Table<CachedResult, string>;
  languageIndex!: Table<{
    key: string;
    data: any;
    generatedAt: number;
    ttl: number;
  }, string>;
  events!: Table<{
    key: string;
    data: any[];
    generatedAt: number;
    ttl: number;
  }, string>;

  constructor() {
    super('NostrAnalyticsDB');
    
    this.version(2).stores({
      metrics: 'key, generatedAt',
      languageIndex: 'key, generatedAt',
      events: 'key, generatedAt'
    });
  }

  async cleanExpired() {
    const now = Date.now();
    
    // Clean expired metrics
    const expiredMetrics = await this.metrics
      .filter(item => item.generatedAt + item.ttl < now)
      .toArray();
    
    if (expiredMetrics.length > 0) {
      await this.metrics.bulkDelete(expiredMetrics.map(m => m.key));
      console.log(`Cleaned ${expiredMetrics.length} expired metrics`);
    }
    
    // Clean expired language index
    const expiredIndex = await this.languageIndex
      .filter(item => item.generatedAt + item.ttl < now)
      .toArray();
    
    if (expiredIndex.length > 0) {
      await this.languageIndex.bulkDelete(expiredIndex.map(i => i.key));
      console.log(`Cleaned ${expiredIndex.length} expired language indices`);
    }
    
    // Clean expired events
    const expiredEvents = await this.events
      .filter(item => item.generatedAt + item.ttl < now)
      .toArray();
    
    if (expiredEvents.length > 0) {
      await this.events.bulkDelete(expiredEvents.map(e => e.key));
      console.log(`Cleaned ${expiredEvents.length} expired event caches`);
    }
  }
}

export const db = new AnalyticsDatabase();

// Clean expired data on initialization
db.cleanExpired();

// Helper functions
export const generateCacheKey = (
  relays: string[],
  since: number,
  until: number,
  windowDays: number
): string => {
  const relayHash = relays.sort().join(',');
  return `metrics:${relayHash}:${since}:${until}:${windowDays}`;
};

export const generateLanguageIndexKey = (
  relays: string[],
  since: number,
  until: number
): string => {
  const relayHash = relays.sort().join(',');
  return `langIndex:${relayHash}:${since}:${until}`;
};

export const saveCachedMetrics = async (
  key: string,
  data: any[],
  ttlMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days default
): Promise<void> => {
  await db.metrics.put({
    key,
    data,
    generatedAt: Date.now(),
    ttl: ttlMs
  });
};

export const getCachedMetrics = async (key: string): Promise<any[] | null> => {
  const cached = await db.metrics.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (cached.generatedAt + cached.ttl < Date.now()) {
    await db.metrics.delete(key);
    return null;
  }
  
  return cached.data;
};

export const saveLanguageIndex = async (
  key: string,
  data: any,
  relays: string[],
  since: number,
  until: number,
  ttlMs: number = 30 * 24 * 60 * 60 * 1000 // 30 days default
): Promise<void> => {
  await db.languageIndex.put({
    key,
    data: {
      ...data,
      _meta: { relays: relays.sort(), since, until }
    },
    generatedAt: Date.now(),
    ttl: ttlMs
  });
};

export const getLanguageIndex = async (key: string): Promise<any | null> => {
  const cached = await db.languageIndex.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (cached.generatedAt + cached.ttl < Date.now()) {
    await db.languageIndex.delete(key);
    return null;
  }
  
  return cached.data;
};

export const saveEvents = async (
  key: string,
  data: any[],
  relays: string[],
  since: number,
  until: number,
  ttlMs: number = 30 * 24 * 60 * 60 * 1000 // 30 days default
): Promise<void> => {
  await db.events.put({
    key,
    data: {
      events: data,
      _meta: { relays: relays.sort(), since, until }
    } as any,
    generatedAt: Date.now(),
    ttl: ttlMs
  });
};

export const getEvents = async (key: string): Promise<any[] | null> => {
  const cached = await db.events.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (cached.generatedAt + cached.ttl < Date.now()) {
    await db.events.delete(key);
    return null;
  }
  
  return cached.data;
};

export const findLanguageIndexByRelays = async (
  relays: string[]
): Promise<Array<{ key: string; data: any; relays: string[]; since: number; until: number }>> => {
  const sortedRelays = relays.sort();
  
  const allIndices = await db.languageIndex.toArray();
  const matchingIndices = allIndices
    .filter(item => {
      // Check if relays match exactly
      const cachedRelays = item.data._meta?.relays || [];
      return JSON.stringify(cachedRelays) === JSON.stringify(sortedRelays);
    })
    .map(item => ({
      key: item.key,
      data: item.data,
      relays: item.data._meta?.relays || [],
      since: item.data._meta?.since || 0,
      until: item.data._meta?.until || 0
    }))
    .filter(item => item.since > 0 && item.until > 0);
  
  return matchingIndices;
};

export const clearAllCache = async (): Promise<void> => {
  await db.metrics.clear();
  await db.languageIndex.clear();
  await db.events.clear();
  console.log('All cache cleared');
};

