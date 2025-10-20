// WASM module loader and wrapper

import type {
  LanguageIndexOptions,
  LanguageIndexResult,
  MetricsOptions,
  MetricDataPoint
} from '../types';

let wasmModule: any = null;

// WebSocket connection pool
interface RelayConnection {
  ws: WebSocket;
  subscriptions: Map<string, { resolve: (events: any[]) => void; events: any[] }>;
  isConnecting: boolean;
  lastUsed: number;
}

const relayConnections = new Map<string, RelayConnection>();
const CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Clean up old connections
const cleanupOldConnections = () => {
  const now = Date.now();
  for (const [relay, conn] of relayConnections.entries()) {
    if (now - conn.lastUsed > CONNECTION_TIMEOUT && conn.subscriptions.size === 0) {
      console.log(`Closing idle connection to ${relay}`);
      conn.ws.close();
      relayConnections.delete(relay);
    }
  }
};

// Cleanup interval
setInterval(cleanupOldConnections, 60 * 1000); // Check every minute

export const initWasm = async (): Promise<void> => {
  if (wasmModule) {
    return;
  }
  
  try {
    // Import WASM module
    const module = await import('./pkg/nostr_analytics.js');
    await module.default(); // Initialize WASM
    wasmModule = module;
    console.log('WASM module loaded, version:', wasmModule.get_version());
  } catch (error) {
    console.error('Failed to load WASM module:', error);
    throw error;
  }
};

// Close all relay connections
export const closeAllRelayConnections = () => {
  for (const [relay, conn] of relayConnections.entries()) {
    console.log(`Closing connection to ${relay}`);
    conn.ws.close();
  }
  relayConnections.clear();
};

// Get or create relay connection
async function getRelayConnection(relay: string): Promise<RelayConnection> {
  const existing = relayConnections.get(relay);
  
  if (existing && existing.ws.readyState === WebSocket.OPEN) {
    existing.lastUsed = Date.now();
    return existing;
  }
  
  // Remove old connection if exists
  if (existing) {
    existing.ws.close();
    relayConnections.delete(relay);
  }
  
  // Create new connection
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relay);
    const conn: RelayConnection = {
      ws,
      subscriptions: new Map(),
      isConnecting: true,
      lastUsed: Date.now()
    };
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Connection timeout: ${relay}`));
    }, 10000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      conn.isConnecting = false;
      relayConnections.set(relay, conn);
      console.log(`✓ Connected to ${relay}`);
      resolve(conn);
    };
    
    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error(`✗ Connection error: ${relay}`, error);
      reject(error);
    };
    
    // Handle incoming messages
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (Array.isArray(data) && data[0] === 'EVENT' && data[1]) {
          const subId = data[1];
          const event = data[2];
          const sub = conn.subscriptions.get(subId);
          if (sub) {
            sub.events.push(event);
          }
        } else if (Array.isArray(data) && data[0] === 'EOSE' && data[1]) {
          const subId = data[1];
          const sub = conn.subscriptions.get(subId);
          if (sub) {
            sub.resolve(sub.events);
            conn.subscriptions.delete(subId);
          }
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
    
    ws.onclose = () => {
      // Resolve all pending subscriptions with partial results
      for (const sub of conn.subscriptions.values()) {
        sub.resolve(sub.events);
      }
      conn.subscriptions.clear();
      relayConnections.delete(relay);
      console.log(`Connection closed: ${relay}`);
    };
  });
}

// Fetch events from relay using persistent WebSocket connection
async function fetchEventsFromRelay(
  relay: string,
  filter: any,
  timeout: number = 30000,
  onProgress?: (fetched: number, status: string) => void
): Promise<any[]> {
  try {
    onProgress?.(0, 'connecting');
    const conn = await getRelayConnection(relay);
    
    return new Promise((resolve) => {
      const subId = 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(7);
      const events: any[] = [];
      
      // Register subscription
      conn.subscriptions.set(subId, {
        resolve: (finalEvents) => {
          onProgress?.(finalEvents.length, 'completed');
          clearTimeout(timeoutId);
          resolve(finalEvents);
        },
        events
      });
      
      const timeoutId = setTimeout(() => {
        const sub = conn.subscriptions.get(subId);
        if (sub) {
          onProgress?.(sub.events.length, 'timeout');
          sub.resolve(sub.events);
          conn.subscriptions.delete(subId);
        }
      }, timeout);
      
      // Send subscription request
      const subscription = ['REQ', subId, filter];
      conn.ws.send(JSON.stringify(subscription));
      onProgress?.(0, 'fetching');
      
      // Update progress periodically
      const progressInterval = setInterval(() => {
        const sub = conn.subscriptions.get(subId);
        if (sub) {
          onProgress?.(sub.events.length, 'fetching');
        } else {
          clearInterval(progressInterval);
        }
      }, 500);
      
      // Cleanup on completion
      const originalResolve = conn.subscriptions.get(subId)?.resolve;
      if (originalResolve) {
        conn.subscriptions.set(subId, {
          resolve: (finalEvents) => {
            clearInterval(progressInterval);
            originalResolve(finalEvents);
          },
          events
        });
      }
    });
  } catch (error) {
    console.error(`Failed to fetch from ${relay}:`, error);
    onProgress?.(0, 'error');
    return [];
  }
}

// Fetch events in chunks
async function fetchEventsChunked(
  relays: string[],
  since: number,
  until: number,
  kinds?: number[],
  chunkSizeDays: number = 1,
  onRelayProgress?: (relay: string, progress: number, status: string, fetched: number) => void
): Promise<any[]> {
  const allEvents: any[] = [];
  const seenIds = new Set<string>();
  const chunkSize = chunkSizeDays * 86400;
  const totalPeriod = until - since;
  const relayFetchedCounts = new Map<string, number>();
  
  // Initialize relay progress
  relays.forEach(relay => {
    relayFetchedCounts.set(relay, 0);
    onRelayProgress?.(relay, 0, 'pending', 0);
  });
  
  let processedPeriod = 0;
  
  for (let currentSince = since; currentSince < until; currentSince += chunkSize) {
    const currentUntil = Math.min(currentSince + chunkSize, until);
    const currentChunkSize = currentUntil - currentSince;
    
    const filter: any = {
      since: currentSince,
      until: currentUntil,
      limit: 1000
    };
    
    if (kinds) {
      filter.kinds = kinds;
    }
    
    // Fetch from all relays in parallel with progress tracking
    const promises = relays.map(relay => 
      fetchEventsFromRelay(relay, filter, 30000, (fetched, status) => {
        const currentProgress = Math.round(((processedPeriod + currentChunkSize * 0.5) / totalPeriod) * 100);
        const mappedStatus = status === 'connected' ? 'connecting' : 
                            status === 'fetching' ? 'fetching' :
                            status === 'completed' ? 'fetching' : // Keep fetching until all chunks done
                            status === 'error' ? 'error' : 'pending';
        const currentFetched = relayFetchedCounts.get(relay) || 0;
        onRelayProgress?.(relay, currentProgress, mappedStatus, currentFetched + fetched);
      })
    );
    const results = await Promise.allSettled(promises);
    
    let chunkNewEvents = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const relay = relays[i];
      if (result.status === 'fulfilled') {
        let relayNewEvents = 0;
        for (const event of result.value) {
          if (!seenIds.has(event.id)) {
            seenIds.add(event.id);
            allEvents.push(event);
            relayNewEvents++;
            chunkNewEvents++;
          }
        }
        const currentFetched = relayFetchedCounts.get(relay) || 0;
        relayFetchedCounts.set(relay, currentFetched + result.value.length);
        console.log(`  ${relay}: ${result.value.length} events (${relayNewEvents} new, ${result.value.length - relayNewEvents} duplicates)`);
      } else {
        console.error(`  ${relay}: Failed -`, result.reason);
        const currentFetched = relayFetchedCounts.get(relay) || 0;
        onRelayProgress?.(relay, Math.round((processedPeriod / totalPeriod) * 100), 'error', currentFetched);
      }
    }
    
    processedPeriod += currentChunkSize;
    const overallProgress = Math.round((processedPeriod / totalPeriod) * 100);
    
    // Update progress for all relays
    relays.forEach(relay => {
      const fetched = relayFetchedCounts.get(relay) || 0;
      onRelayProgress?.(relay, overallProgress, 'fetching', fetched);
    });
    
    console.log(`Fetched chunk ${currentSince}-${currentUntil}: ${allEvents.length} events total (+${chunkNewEvents} new) [${overallProgress}%]`);
  }
  
  // Mark all relays as completed
  relays.forEach(relay => {
    const fetched = relayFetchedCounts.get(relay) || 0;
    onRelayProgress?.(relay, 100, 'completed', fetched);
  });
  
  return allEvents;
}

export const buildLanguageIndex = async (
  relays: string[],
  options: LanguageIndexOptions,
  onRelayProgress?: (relay: string, progress: number, status: string, fetched: number) => void
): Promise<{ result: LanguageIndexResult; userLanguages: Record<string, Record<string, number>>; events: any[] }> => {
  if (!wasmModule) {
    await initWasm();
  }
  
  console.log('Building language index...');
  
  // Fetch content events (kind:1 notes and kind:42 channel messages for language detection)
  const events = await fetchEventsChunked(
    relays,
    options.since,
    options.until,
    [1, 42], // kind:1 (notes) and kind:42 (channel messages) for language detection
    1, // 1 day chunks
    onRelayProgress
  );
  
  console.log(`Fetched ${events.length} events for language detection`);
  
  // Limit events if maxEvents is specified
  const eventsToProcess = options.maxEvents 
    ? events.slice(0, options.maxEvents)
    : events;
  
  // Process events with WASM
  const confThresh = options.confThresh ?? 0.5;
  const maxLangsPerUser = options.maxLangsPerUser ?? 5;
  
  const output = wasmModule.process_events_for_language_index(
    eventsToProcess,
    confThresh,
    maxLangsPerUser
  );
  
  // Return events with detected language
  return {
    ...output,
    events: eventsToProcess
  };
};

export const computeMetrics = async (
  relays: string[],
  userLanguages: Record<string, Record<string, number>>,
  options: MetricsOptions
): Promise<MetricDataPoint[]> => {
  if (!wasmModule) {
    await initWasm();
  }
  
  console.log('Computing metrics...');
  
  // Fetch all kinds of events for activity tracking
  const events = await fetchEventsChunked(
    relays,
    options.since,
    options.until,
    undefined, // All kinds
    1 // 1 day chunks for activity
  );
  
  console.log(`Fetched ${events.length} events for activity tracking`);
  
  // Ensure userLanguages is a plain object
  const plainUserLanguages: Record<string, Record<string, number>> = {};
  for (const [key, value] of Object.entries(userLanguages)) {
    plainUserLanguages[key] = value;
  }
  
  // Compute metrics with WASM
  const results = wasmModule.compute_metrics_from_events(
    events,
    plainUserLanguages,
    options.languages,
    BigInt(options.since),
    BigInt(options.until),
    options.window_days
  );
  
  return results;
};

export const computeMetricsByLanguage = async (
  events: any[], // Accept events as parameter instead of fetching
  userLanguages: Record<string, Record<string, number>>,
  options: MetricsOptions
): Promise<Record<string, MetricDataPoint[]>> => {
  if (!wasmModule) {
    await initWasm();
  }
  
  console.log('Computing metrics by language...');
  console.log(`Using ${events.length} events for activity tracking`);
  
  // Ensure userLanguages is a plain object
  const plainUserLanguages: Record<string, Record<string, number>> = {};
  for (const [key, value] of Object.entries(userLanguages)) {
    plainUserLanguages[key] = value;
  }
  
  // Get all unique languages from userLanguages if not specified
  const targetLanguages = options.languages && options.languages.length > 0
    ? options.languages
    : Array.from(new Set(
        Object.values(plainUserLanguages).flatMap(langs => Object.keys(langs))
      ));
  
  console.log(`Computing metrics for languages: ${targetLanguages.join(', ')}`);
  
  // Compute metrics by language with WASM
  const results = wasmModule.compute_metrics_by_language(
    events,
    plainUserLanguages,
    targetLanguages,
    BigInt(options.since),
    BigInt(options.until),
    options.window_days
  );
  
  // Convert Map to plain object if necessary
  if (results instanceof Map) {
    return Object.fromEntries(results);
  }
  
  return results;
};

export const abortAll = (): void => {
  console.log('Abort requested');
  // TODO: Implement abort mechanism
};
