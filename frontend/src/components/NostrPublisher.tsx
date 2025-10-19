import React, { useState, useEffect } from 'react';
import { useAnalyticsStore } from '../state/store';
import { isNostrAvailable, getPublicKey, createAnalyticsEvent, publishToRelays } from '../services/nostr';
import { MetricType } from '../types';

export const NostrPublisher: React.FC = () => {
  const { config, results, pubkey, setPubkey } = useAnalyticsStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const hasResults = Object.keys(results).length > 0;
  const nostrAvailable = isNostrAvailable();

  useEffect(() => {
    if (nostrAvailable && !pubkey) {
      getPublicKey()
        .then(pk => setPubkey(pk))
        .catch(err => console.error('Failed to get pubkey:', err));
    }
  }, [nostrAvailable, pubkey, setPubkey]);

  const handlePublish = async () => {
    if (!hasResults || !nostrAvailable) return;

    setIsPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);

    try {
      const since = Math.floor(config.dateRange.start.getTime() / 1000);
      const until = Math.floor(config.dateRange.end.getTime() / 1000);

      // Publish each metric for each language
      for (const metric of config.metrics) {
        const data = results[metric];
        if (!data) continue;

        for (const language of config.languages) {
          const windowDays = metric === 'dau' ? 1 : metric === 'wau' ? 7 : metric === 'mau' ? 30 : 365;
          
          const event = createAnalyticsEvent(
            metric as MetricType,
            language,
            config.relays,
            { start: since, end: until, windowDays },
            data,
            0 // eligibleUserCount - would be calculated from language index
          );

          await publishToRelays(event, config.relays);
          console.log(`Published ${metric} for ${language}`);
        }
      }

      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 5000);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : '発行中にエラーが発生しました');
      console.error('Publish error:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  if (!nostrAvailable) {
    return (
      <div style={{
        padding: '12px',
        backgroundColor: '#fff3cd',
        color: '#856404',
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        NIP-07対応のNostr拡張機能が見つかりません。結果をリレーに発行するには拡張機能をインストールしてください。
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>結果の発行 (NIP-07)</h3>
      
      {pubkey && (
        <div style={{
          padding: '8px',
          backgroundColor: '#e8f5e9',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '14px'
        }}>
          接続中の公開鍵: <code>{pubkey.substring(0, 16)}...</code>
        </div>
      )}

      {publishError && (
        <div style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          エラー: {publishError}
        </div>
      )}

      {publishSuccess && (
        <div style={{
          padding: '12px',
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          ✓ 結果をリレーに発行しました
        </div>
      )}

      <button
        onClick={handlePublish}
        disabled={!hasResults || isPublishing}
        style={{
          padding: '12px 24px',
          backgroundColor: hasResults && !isPublishing ? '#2196f3' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: hasResults && !isPublishing ? 'pointer' : 'not-allowed',
          fontWeight: 'bold'
        }}
      >
        {isPublishing ? '発行中...' : 'リレーに発行 (kind: 30080)'}
      </button>

      {!hasResults && (
        <p style={{ color: '#999', marginTop: '10px', fontSize: '14px' }}>
          分析を実行してから発行してください
        </p>
      )}

      {hasResults && (
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          <p>発行先リレー: {config.relays.length} 個</p>
          <p>発行イベント数: {config.metrics.length * config.languages.length} 個</p>
        </div>
      )}
    </div>
  );
};

