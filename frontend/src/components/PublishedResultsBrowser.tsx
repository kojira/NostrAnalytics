import { useState } from 'react';
import { fetchPublishedResults, parsePublishedResult } from '../services/nostr';
import { useAnalyticsStore } from '../state/store';

interface ParsedResult {
  eventId: string;
  metric: string;
  language: string;
  relays: string[];
  timeframe: {
    start: number;
    end: number;
    granularity: string;
    windowDays: number;
  };
  counts: [number, number][];
  eligibleUserCount: number;
  author: string;
  publishedAt: number;
}

export const PublishedResultsBrowser = () => {
  const { config } = useAnalyticsStore();
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ParsedResult | null>(null);
  const [filterLanguage, setFilterLanguage] = useState<string>('');
  const [filterMetric, setFilterMetric] = useState<string>('');

  const handleFetch = async () => {
    setLoading(true);
    try {
      const events = await fetchPublishedResults(config.relays, {
        languages: filterLanguage ? [filterLanguage] : undefined,
        metrics: filterMetric ? [filterMetric] : undefined,
      });

      const parsed = events
        .map((event) => {
          const result = parsePublishedResult(event);
          if (result) {
            return {
              eventId: event.id,
              ...result,
            };
          }
          return null;
        })
        .filter((r): r is ParsedResult => r !== null)
        .sort((a, b) => b.publishedAt - a.publishedAt); // Sort by newest first

      setResults(parsed);
    } catch (error) {
      console.error('Failed to fetch published results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('ja-JP');
  };

  const formatAuthor = (pubkey: string) => {
    return `${pubkey.substring(0, 8)}...${pubkey.substring(pubkey.length - 8)}`;
  };

  const handleLoadResult = (result: ParsedResult) => {
    // Convert counts to the format expected by the chart
    const metricsData = result.counts.map(([epochDay, count]) => ({
      epoch_day: epochDay,
      count,
    }));

    // Update the store with the loaded data
    const { setResults, results: currentResults } = useAnalyticsStore.getState();
    
    // Merge with existing results for this metric
    const existingMetricData = currentResults[result.metric] || {};
    const updatedMetricData = {
      ...existingMetricData,
      [result.language]: metricsData,
    };
    
    setResults(result.metric, updatedMetricData);

    alert(`${result.metric.toUpperCase()} データを読み込みました (言語: ${result.language})`);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px' }}>
      <h2>📊 発行済み分析結果</h2>
      <p>リレーから他のユーザーが発行した分析結果を取得して再利用できます。</p>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ marginRight: '5px' }}>言語:</label>
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            style={{ padding: '5px' }}
          >
            <option value="">すべて</option>
            <option value="ja">日本語 (ja)</option>
            <option value="en">英語 (en)</option>
            <option value="zh">中国語 (zh)</option>
            <option value="ko">韓国語 (ko)</option>
            <option value="es">スペイン語 (es)</option>
            <option value="fr">フランス語 (fr)</option>
            <option value="de">ドイツ語 (de)</option>
          </select>
        </div>

        <div>
          <label style={{ marginRight: '5px' }}>メトリクス:</label>
          <select
            value={filterMetric}
            onChange={(e) => setFilterMetric(e.target.value)}
            style={{ padding: '5px' }}
          >
            <option value="">すべて</option>
            <option value="dau">DAU</option>
            <option value="wau">WAU</option>
            <option value="mau">MAU</option>
            <option value="yau">YAU</option>
          </select>
        </div>

        <button
          onClick={handleFetch}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '取得中...' : '検索'}
        </button>

        {results.length > 0 && (
          <span style={{ marginLeft: '10px', color: '#666' }}>
            {results.length}件の結果
          </span>
        )}
      </div>

      {results.length > 0 && (
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5' }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>メトリクス</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>言語</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>期間</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>データ点数</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>発行者</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>発行日時</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>アクション</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr
                  key={result.eventId}
                  style={{
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    backgroundColor: selectedResult?.eventId === result.eventId ? '#e3f2fd' : 'transparent',
                  }}
                  onClick={() => setSelectedResult(result)}
                >
                  <td style={{ padding: '10px' }}>{result.metric.toUpperCase()}</td>
                  <td style={{ padding: '10px' }}>{result.language}</td>
                  <td style={{ padding: '10px', fontSize: '0.9em' }}>
                    {formatDate(result.timeframe.start)}
                    <br />〜 {formatDate(result.timeframe.end)}
                  </td>
                  <td style={{ padding: '10px' }}>{result.counts.length}点</td>
                  <td style={{ padding: '10px', fontSize: '0.9em', fontFamily: 'monospace' }}>
                    {formatAuthor(result.author)}
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.9em' }}>{formatDate(result.publishedAt)}</td>
                  <td style={{ padding: '10px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadResult(result);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                      }}
                    >
                      読み込み
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedResult && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <h3>詳細情報</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '10px', fontSize: '0.95em' }}>
            <strong>イベントID:</strong>
            <span style={{ fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>
              {selectedResult.eventId}
            </span>
            
            <strong>メトリクス:</strong>
            <span>{selectedResult.metric.toUpperCase()}</span>
            
            <strong>言語:</strong>
            <span>{selectedResult.language}</span>
            
            <strong>対象リレー:</strong>
            <div>
              {selectedResult.relays.map((relay, i) => (
                <div key={i} style={{ fontSize: '0.9em' }}>{relay}</div>
              ))}
            </div>
            
            <strong>期間:</strong>
            <span>
              {formatDate(selectedResult.timeframe.start)} 〜 {formatDate(selectedResult.timeframe.end)}
            </span>
            
            <strong>ウィンドウ:</strong>
            <span>{selectedResult.timeframe.windowDays}日</span>
            
            <strong>データ点数:</strong>
            <span>{selectedResult.counts.length}点</span>
            
            <strong>対象ユーザー数:</strong>
            <span>{selectedResult.eligibleUserCount.toLocaleString()}人</span>
            
            <strong>発行者:</strong>
            <span style={{ fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>
              {selectedResult.author}
            </span>
            
            <strong>発行日時:</strong>
            <span>{formatDate(selectedResult.publishedAt)}</span>
          </div>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          検索ボタンをクリックして、発行済みの分析結果を取得してください。
        </div>
      )}
    </div>
  );
};

