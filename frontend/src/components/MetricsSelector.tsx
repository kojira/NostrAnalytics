import React from 'react';
import { useAnalyticsStore } from '../state/store';
import { MetricType } from '../types';

const METRIC_INFO: Record<MetricType, { label: string; description: string; days: number }> = {
  dau: { label: 'DAU (日次)', description: '1日間のアクティブユーザー数', days: 1 },
  wau: { label: 'WAU (週次)', description: '7日間のアクティブユーザー数', days: 7 },
  mau: { label: 'MAU (月次)', description: '30日間のアクティブユーザー数', days: 30 },
  yau: { label: 'YAU (年次)', description: '365日間のアクティブユーザー数', days: 365 }
};

export const MetricsSelector: React.FC = () => {
  const { config, setMetrics } = useAnalyticsStore();

  const handleToggle = (metric: MetricType) => {
    if (config.metrics.includes(metric)) {
      setMetrics(config.metrics.filter(m => m !== metric));
    } else {
      setMetrics([...config.metrics, metric]);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>メトリクス選択</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
        {(Object.keys(METRIC_INFO) as MetricType[]).map((metric) => {
          const info = METRIC_INFO[metric];
          const isSelected = config.metrics.includes(metric);
          return (
            <label
              key={metric}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '12px',
                backgroundColor: isSelected ? '#e8f5e9' : '#f5f5f5',
                borderRadius: '4px',
                cursor: 'pointer',
                border: isSelected ? '2px solid #4caf50' : '2px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(metric)}
                  style={{ marginRight: '8px' }}
                />
                <strong>{info.label}</strong>
              </div>
              <small style={{ color: '#666', marginLeft: '24px' }}>
                {info.description}
              </small>
            </label>
          );
        })}
      </div>
      {config.metrics.length === 0 && (
        <p style={{ color: '#999', marginTop: '10px' }}>
          少なくとも1つのメトリクスを選択してください
        </p>
      )}
    </div>
  );
};

