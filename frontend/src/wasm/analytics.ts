// WASM module loader and wrapper

import type {
  LanguageIndexOptions,
  LanguageIndexResult,
  MetricsOptions,
  MetricDataPoint
} from '../types';

let wasmModule: any = null;

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

// Fetch events from relay using WebSocket
async function fetchEventsFromRelay(
  relay: string,
  filter: any,
  timeout: number = 30000
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const events: any[] = [];
    const ws = new WebSocket(relay);
    let timeoutId: NodeJS.Timeout;
    
    const cleanup = () => {
      clearTimeout(timeoutId);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
    
    timeoutId = setTimeout(() => {
      cleanup();
      resolve(events); // Return partial results on timeout
    }, timeout);
    
    ws.onopen = () => {
      // Subscribe with filter
      const subscription = ['REQ', 'sub-' + Date.now(), filter];
      ws.send(JSON.stringify(subscription));
    };
    
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (Array.isArray(data) && data[0] === 'EVENT') {
          events.push(data[2]); // Event is at index 2
        } else if (Array.isArray(data) && data[0] === 'EOSE') {
          // End of stored events
          cleanup();
          resolve(events);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      cleanup();
      resolve(events); // Return partial results on error
    };
  });
}

// Fetch events in chunks
async function fetchEventsChunked(
  relays: string[],
  since: number,
  until: number,
  kinds?: number[],
  chunkSizeDays: number = 1
): Promise<any[]> {
  const allEvents: any[] = [];
  const seenIds = new Set<string>();
  const chunkSize = chunkSizeDays * 86400;
  
  for (let currentSince = since; currentSince < until; currentSince += chunkSize) {
    const currentUntil = Math.min(currentSince + chunkSize, until);
    
    const filter: any = {
      since: currentSince,
      until: currentUntil,
      limit: 1000
    };
    
    if (kinds) {
      filter.kinds = kinds;
    }
    
    // Fetch from all relays in parallel
    const promises = relays.map(relay => fetchEventsFromRelay(relay, filter));
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
        console.log(`  ${relay}: ${result.value.length} events (${relayNewEvents} new, ${result.value.length - relayNewEvents} duplicates)`);
      } else {
        console.error(`  ${relay}: Failed -`, result.reason);
      }
    }
    
    console.log(`Fetched chunk ${currentSince}-${currentUntil}: ${allEvents.length} events total (+${chunkNewEvents} new)`);
  }
  
  return allEvents;
}

export const buildLanguageIndex = async (
  relays: string[],
  options: LanguageIndexOptions
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
    1 // 1 day chunks
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
