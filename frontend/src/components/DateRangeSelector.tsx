import React from 'react';
import { useAnalyticsStore } from '../state/store';

export const DateRangeSelector: React.FC = () => {
  const { config, setDateRange } = useAnalyticsStore();

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateRange(start, end);
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleStartChange = (value: string) => {
    const newStart = new Date(value);
    if (!isNaN(newStart.getTime())) {
      setDateRange(newStart, config.dateRange.end);
    }
  };

  const handleEndChange = (value: string) => {
    const newEnd = new Date(value);
    if (!isNaN(newEnd.getTime())) {
      setDateRange(config.dateRange.start, newEnd);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>期間選択</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => handlePreset(30)} style={{ padding: '8px 16px' }}>
          過去30日
        </button>
        <button onClick={() => handlePreset(90)} style={{ padding: '8px 16px' }}>
          過去90日
        </button>
        <button onClick={() => handlePreset(180)} style={{ padding: '8px 16px' }}>
          過去180日
        </button>
        <button onClick={() => handlePreset(365)} style={{ padding: '8px 16px' }}>
          過去365日
        </button>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            開始日:
          </label>
          <input
            type="date"
            value={formatDate(config.dateRange.start)}
            onChange={(e) => handleStartChange(e.target.value)}
            style={{ padding: '8px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            終了日:
          </label>
          <input
            type="date"
            value={formatDate(config.dateRange.end)}
            onChange={(e) => handleEndChange(e.target.value)}
            style={{ padding: '8px' }}
          />
        </div>
      </div>
      <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        期間: {Math.ceil((config.dateRange.end.getTime() - config.dateRange.start.getTime()) / (24 * 60 * 60 * 1000))} 日間
      </p>
    </div>
  );
};

