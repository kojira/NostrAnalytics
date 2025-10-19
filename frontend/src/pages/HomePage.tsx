import React from 'react';
import { RelaySelector } from '../components/RelaySelector';
import { LanguageSelector } from '../components/LanguageSelector';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { MetricsSelector } from '../components/MetricsSelector';
import { AnalysisControl } from '../components/AnalysisControl';
import { MetricsChart } from '../components/MetricsChart';
import { NostrPublisher } from '../components/NostrPublisher';
import { PrivateKeyInput } from '../components/PrivateKeyInput';
import { EventBrowser } from '../components/EventBrowser';
import { PublishedResultsBrowser } from '../components/PublishedResultsBrowser';

export const HomePage: React.FC = () => {
  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <header style={{
        marginBottom: '30px',
        borderBottom: '2px solid #2196f3',
        paddingBottom: '20px'
      }}>
        <h1 style={{ margin: 0, color: '#2196f3' }}>
          Nostr Analytics
        </h1>
        <p style={{ margin: '10px 0 0 0', color: '#666' }}>
          言語別アクティブユーザー分析ツール (DAU/WAU/MAU/YAU)
        </p>
      </header>

      <main>
        <section style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginTop: 0, color: '#333' }}>設定</h2>
          <PrivateKeyInput />
          <RelaySelector />
          <LanguageSelector />
          <DateRangeSelector />
          <MetricsSelector />
        </section>

        <section style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <AnalysisControl />
        </section>

        <section style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <MetricsChart />
        </section>

        <section style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <EventBrowser />
        </section>

        <section style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <PublishedResultsBrowser />
        </section>

        <section style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <NostrPublisher />
        </section>
      </main>

      <footer style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #ddd',
        textAlign: 'center',
        color: '#999',
        fontSize: '14px'
      }}>
        <p>
          Powered by rust-nostr + whatlang + React
        </p>
        <p>
          分析結果は kind: 30080 (Parameterized Replaceable Event) で発行されます
        </p>
      </footer>
    </div>
  );
};

