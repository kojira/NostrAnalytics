import React, { useState } from 'react';
import { useAnalyticsStore } from '../state/store';
import { initWasm, buildLanguageIndex, computeMetricsByLanguage } from '../wasm/analytics';
import { MetricType } from '../types';
import {
  generateCacheKey,
  generateLanguageIndexKey,
  getCachedMetrics,
  saveCachedMetrics,
  saveLanguageIndex,
  clearAllCache,
  saveEvents,
  getEvents,
  findLanguageIndexByRelays
} from '../services/db';

const METRIC_WINDOW_DAYS: Record<MetricType, 1 | 7 | 30 | 365> = {
  dau: 1,
  wau: 7,
  mau: 30,
  yau: 365
};

export const AnalysisControl: React.FC = () => {
  const {
    config,
    isAnalyzing,
    progress,
    relayProgress,
    setAnalyzing,
    setProgress,
    setRelayProgress,
    clearRelayProgress,
    setResults,
    clearResults,
    setEvents
  } = useAnalyticsStore();
  
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = 
    config.relays.length > 0 &&
    config.languages.length > 0 &&
    config.metrics.length > 0;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setError(null);
    setAnalyzing(true);
    clearResults();

    try {
      // Initialize WASM
      await initWasm();
      
      const since = Math.floor(config.dateRange.start.getTime() / 1000);
      const until = Math.floor(config.dateRange.end.getTime() / 1000);

      // Step 1: Build language index with incremental fetching
      setProgress({ stage: '言語インデックス構築中...', current: 0, total: 100 });
      clearRelayProgress();
      
      // Find existing caches for the same relays (exact match required)
      const existingCaches = await findLanguageIndexByRelays(config.relays);
      console.log(`Found ${existingCaches.length} existing cache(s) for relays: ${config.relays.join(', ')}`);
      
      // Find the best matching cache that covers the requested period
      let bestCache = existingCaches.find(cache => 
        cache.since <= since && cache.until >= until
      );
      
      let userLanguages: Record<string, Record<string, number>>;
      let allEvents: any[] = [];
      
      if (bestCache) {
        // Perfect match - use cached data
        console.log(`Using cached data: ${bestCache.since} - ${bestCache.until}`);
        const cachedData = bestCache.data;
        
        if (cachedData.userLanguages) {
          userLanguages = cachedData.userLanguages;
        } else if (cachedData.result && cachedData.result.userLanguages) {
          userLanguages = cachedData.result.userLanguages;
        } else {
          userLanguages = cachedData;
        }
        
        // Load events from cache
        const cachedEvents: any = await getEvents(bestCache.key);
        if (cachedEvents) {
          if (Array.isArray(cachedEvents)) {
            allEvents = cachedEvents;
          } else if (cachedEvents.events) {
            allEvents = cachedEvents.events;
          }
          console.log(`Loaded ${allEvents.length} events from cache`);
        }
      } else {
        // No perfect match - check for partial overlap
        const overlappingCache = existingCaches.find(cache =>
          (cache.since <= since && cache.until >= since) || // Overlaps at start
          (cache.since <= until && cache.until >= until) || // Overlaps at end
          (cache.since >= since && cache.until <= until)    // Contained within
        );
        
        if (overlappingCache) {
          console.log(`Found overlapping cache: ${overlappingCache.since} - ${overlappingCache.until}`);
          console.log(`Requested period: ${since} - ${until}`);
          
          // Load existing data
          const cachedData = overlappingCache.data;
          if (cachedData.userLanguages) {
            userLanguages = cachedData.userLanguages;
          } else if (cachedData.result && cachedData.result.userLanguages) {
            userLanguages = cachedData.result.userLanguages;
          } else {
            userLanguages = cachedData;
          }
          
          const cachedEvents: any = await getEvents(overlappingCache.key);
          if (cachedEvents) {
            if (Array.isArray(cachedEvents)) {
              allEvents = cachedEvents;
            } else if (cachedEvents.events) {
              allEvents = cachedEvents.events;
            }
          }
          
          // Fetch missing periods
          const missingPeriods: Array<{ since: number; until: number }> = [];
          
          if (since < overlappingCache.since) {
            missingPeriods.push({ since, until: overlappingCache.since - 1 });
          }
          if (until > overlappingCache.until) {
            missingPeriods.push({ since: overlappingCache.until + 1, until });
          }
          
          console.log(`Fetching ${missingPeriods.length} missing period(s)`);
          
          for (const period of missingPeriods) {
            const indexData = await buildLanguageIndex(config.relays, {
              since: period.since,
              until: period.until,
              confThresh: 0.5,
              maxLangsPerUser: 5
            }, (relay, progress, status, fetched) => {
              setRelayProgress(relay, { status: status as any, progress, fetched });
            });
            
            // Merge user languages
            let newUserLanguages = indexData.userLanguages;
            if (newUserLanguages instanceof Map) {
              newUserLanguages = Object.fromEntries(newUserLanguages);
            }
            
            for (const [pubkey, langs] of Object.entries(newUserLanguages)) {
              let convertedLangs = langs;
              if (langs instanceof Map) {
                convertedLangs = Object.fromEntries(langs);
              }
              
              if (!userLanguages[pubkey]) {
                userLanguages[pubkey] = convertedLangs as Record<string, number>;
              } else {
                // Merge language scores (take max confidence)
                for (const [lang, conf] of Object.entries(convertedLangs as Record<string, number>)) {
                  if (!userLanguages[pubkey][lang] || userLanguages[pubkey][lang] < conf) {
                    userLanguages[pubkey][lang] = conf;
                  }
                }
              }
            }
            
            // Merge events
            allEvents = allEvents.concat(indexData.events);
          }
          
          console.log(`Merged data: ${Object.keys(userLanguages).length} users, ${allEvents.length} events`);
        } else {
          // No overlap - fetch entire period
          console.log(`No overlapping cache found, fetching entire period: ${since} - ${until}`);
          
          const indexData = await buildLanguageIndex(config.relays, {
            since,
            until,
            confThresh: 0.5,
            maxLangsPerUser: 5
          }, (relay, progress, status, fetched) => {
            setRelayProgress(relay, { status: status as any, progress, fetched });
          });
          
          if (indexData.userLanguages instanceof Map) {
            userLanguages = Object.fromEntries(indexData.userLanguages);
          } else {
            userLanguages = indexData.userLanguages;
          }
          
          // Convert inner Maps to plain objects
          const convertedUserLanguages: Record<string, Record<string, number>> = {};
          for (const [pubkey, langs] of Object.entries(userLanguages)) {
            if (langs instanceof Map) {
              convertedUserLanguages[pubkey] = Object.fromEntries(langs);
            } else {
              convertedUserLanguages[pubkey] = langs as Record<string, number>;
            }
          }
          userLanguages = convertedUserLanguages;
          allEvents = indexData.events;
          
          console.log(`Fetched: ${Object.keys(userLanguages).length} users, ${allEvents.length} events`);
        }
        
        // Save merged/new data to cache
        const indexKey = generateLanguageIndexKey(config.relays, since, until);
        const dataToCache = {
          result: { userLanguages },
          userLanguages: userLanguages
        };
        await saveLanguageIndex(indexKey, dataToCache, config.relays, since, until);
        
        // Add detected language to events and save
        const eventsWithLanguage = allEvents.map((event: any) => {
          if (event.detectedLanguage) return event; // Already has language
          
          const userLangs = userLanguages[event.pubkey];
          if (!userLangs || Object.keys(userLangs).length === 0) {
            return { ...event, detectedLanguage: null };
          }
          const sortedLangs = Object.entries(userLangs).sort((a: any, b: any) => b[1] - a[1]);
          return { ...event, detectedLanguage: sortedLangs[0][0] };
        });
        
        await saveEvents(indexKey, eventsWithLanguage, config.relays, since, until);
        setEvents(eventsWithLanguage);
        console.log(`Saved ${eventsWithLanguage.length} events to cache`);
      }
      
      // Set events if we have them
      if (allEvents.length > 0 && !bestCache) {
        // Already set above
      } else if (bestCache && allEvents.length > 0) {
        setEvents(allEvents);
      }

      // Step 2: Compute metrics for each selected metric
      for (let i = 0; i < config.metrics.length; i++) {
        const metric = config.metrics[i];
        const windowDays = METRIC_WINDOW_DAYS[metric];
        
        setProgress({
          stage: `${metric.toUpperCase()} 計算中...`,
          current: i + 1,
          total: config.metrics.length
        });

        const cacheKey = generateCacheKey(
          config.relays,
          since,
          until,
          windowDays
        );

        let cachedData: any = await getCachedMetrics(cacheKey);

        if (!cachedData) {
          // Compute metrics for ALL languages and cache
          const metricsDataByLang = await computeMetricsByLanguage(
            allEvents, // Use cached events
            userLanguages,
            {
              since,
              until,
              languages: [], // Empty = compute for all languages
              granularity: 'day',
              window_days: windowDays
            }
          );
          
          // Save ALL language metrics to cache (convert to plain object)
          const cacheData = JSON.parse(JSON.stringify(metricsDataByLang));
          await saveCachedMetrics(cacheKey, cacheData);
          cachedData = cacheData;
          console.log(`Computed and cached metrics for ${metric} (all languages)`);
        } else {
          console.log(`Using cached metrics for ${metric}`);
        }
        
        // Filter to selected languages only
        const filteredData: Record<string, any[]> = {};
        for (const lang of config.languages) {
          if (cachedData && cachedData[lang]) {
            filteredData[lang] = cachedData[lang];
          }
        }
        
        setResults(metric, filteredData);
      }

      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析中にエラーが発生しました');
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClearCache = async () => {
    await clearAllCache();
    clearResults();
    setProgress({ stage: 'キャッシュをクリアしました', current: 100, total: 100 });
    setTimeout(() => setProgress(null), 2000);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>分析実行</h3>
      
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          エラー: {error}
        </div>
      )}

      {progress && (
        <div style={{
          padding: '12px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <div style={{ marginBottom: '5px' }}>{progress.stage}</div>
          <div style={{
            width: '100%',
            height: '20px',
            backgroundColor: '#fff',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(progress.current / progress.total) * 100}%`,
              height: '100%',
              backgroundColor: '#2196f3',
              transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ marginTop: '5px', fontSize: '14px' }}>
            {progress.current} / {progress.total}
          </div>
        </div>
      )}

      {Object.keys(relayProgress).length > 0 && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>リレー別進捗</div>
          {Object.entries(relayProgress).map(([relay, info]) => {
            const statusColor = 
              info.status === 'completed' ? '#4caf50' :
              info.status === 'error' ? '#f44336' :
              info.status === 'fetching' ? '#2196f3' :
              info.status === 'connecting' ? '#ff9800' : '#999';
            
            const statusText =
              info.status === 'completed' ? '完了' :
              info.status === 'error' ? 'エラー' :
              info.status === 'fetching' ? '取得中' :
              info.status === 'connecting' ? '接続中' : '待機中';

            return (
              <div key={relay} style={{ marginBottom: '8px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '4px',
                  fontSize: '13px'
                }}>
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    maxWidth: '60%'
                  }}>
                    {relay}
                  </span>
                  <span style={{ color: statusColor, fontWeight: 'bold' }}>
                    {statusText} {info.progress}% ({info.fetched.toLocaleString()}件)
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${info.progress}%`,
                    height: '100%',
                    backgroundColor: statusColor,
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze || isAnalyzing}
          style={{
            padding: '12px 24px',
            backgroundColor: canAnalyze && !isAnalyzing ? '#4caf50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: canAnalyze && !isAnalyzing ? 'pointer' : 'not-allowed',
            fontWeight: 'bold'
          }}
        >
          {isAnalyzing ? '分析中...' : '分析開始'}
        </button>

        <button
          onClick={handleClearCache}
          disabled={isAnalyzing}
          style={{
            padding: '12px 24px',
            backgroundColor: isAnalyzing ? '#ccc' : '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer'
          }}
        >
          キャッシュクリア
        </button>
      </div>

      {!canAnalyze && (
        <p style={{ color: '#f44336', marginTop: '10px' }}>
          リレー、言語、メトリクスをすべて選択してください
        </p>
      )}
    </div>
  );
};

