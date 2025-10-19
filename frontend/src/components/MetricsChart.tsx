import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAnalyticsStore } from '../state/store';
import { MetricType } from '../types';

const METRIC_COLORS: Record<MetricType, string> = {
  dau: '#2196f3',
  wau: '#4caf50',
  mau: '#ff9800',
  yau: '#9c27b0'
};

// Language colors - use a palette that works well together
const LANGUAGE_COLORS: Record<string, string> = {
  en: '#2196f3',  // Blue
  ja: '#f44336',  // Red
  zh: '#ff9800',  // Orange
  es: '#4caf50',  // Green
  pt: '#9c27b0',  // Purple
  fr: '#00bcd4',  // Cyan
  de: '#ff5722',  // Deep Orange
  it: '#8bc34a',  // Light Green
  ru: '#3f51b5',  // Indigo
  ko: '#e91e63',  // Pink
  ar: '#009688',  // Teal
  hi: '#ffc107',  // Amber
  tr: '#673ab7',  // Deep Purple
  nl: '#03a9f4',  // Light Blue
  pl: '#cddc39',  // Lime
  uk: '#ffeb3b',  // Yellow
  th: '#795548',  // Brown
  vi: '#607d8b',  // Blue Grey
  id: '#ff6f00',  // Orange Accent
  he: '#1976d2',  // Blue Darken
};

const METRIC_LABELS: Record<MetricType, string> = {
  dau: 'DAU',
  wau: 'WAU',
  mau: 'MAU',
  yau: 'YAU'
};

export const MetricsChart: React.FC = () => {
  const { config, results } = useAnalyticsStore();

  const hasResults = Object.keys(results).length > 0;

  if (!hasResults) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        color: '#999'
      }}>
        分析を実行すると、ここにグラフが表示されます
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>分析結果</h3>
      
      {config.metrics.map((metric) => {
        const dataByLang = results[metric];
        if (!dataByLang || typeof dataByLang !== 'object') return null;

        // Get all unique languages present in the data for this metric
        const languages = Object.keys(dataByLang);
        if (languages.length === 0) return null;

        // Determine sampling interval based on metric type
        let samplingInterval = 1; // days
        if (metric === 'wau') {
          samplingInterval = 7; // 1 week
        } else if (metric === 'mau') {
          samplingInterval = 30; // 1 month
        } else if (metric === 'yau') {
          samplingInterval = 365; // 1 year
        }

        // Combine data from all languages by date
        const combinedData: Record<string, any> = {};

        languages.forEach((lang: string) => {
          const points = dataByLang[lang];
          if (Array.isArray(points)) {
            points.forEach((point: any, index: number) => {
              // Sample data at the specified interval
              if (index % samplingInterval !== 0) return;
              
              const date = new Date(point.epoch_day * 86400 * 1000).toISOString().split('T')[0];
              if (!combinedData[date]) {
                combinedData[date] = { date, epoch_day: point.epoch_day };
              }
              combinedData[date][lang] = point.count;
            });
          }
        });

        const chartData = Object.values(combinedData).sort((a: any, b: any) => a.epoch_day - b.epoch_day);

        return (
          <div
            key={metric}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}
          >
            <h4 style={{ marginTop: 0, color: METRIC_COLORS[metric] }}>
              {METRIC_LABELS[metric]} - {
                metric === 'dau' ? '日次アクティブユーザー' :
                metric === 'wau' ? '週次アクティブユーザー' :
                metric === 'mau' ? '月次アクティブユーザー' :
                '年次アクティブユーザー'
              }
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <Legend />
                {languages.map((lang: string) => (
                  <Line
                    key={lang}
                    type="monotone"
                    dataKey={lang}
                    name={lang.toUpperCase()}
                    stroke={LANGUAGE_COLORS[lang] || METRIC_COLORS[metric]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              <p>データポイント数: {chartData.length}</p>
            </div>
          </div>
        );
      })}

      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        fontSize: '14px',
        color: '#666'
      }}>
        <p style={{ margin: 0 }}>選択言語: {config.languages.join(', ')}</p>
      </div>
    </div>
  );
};

