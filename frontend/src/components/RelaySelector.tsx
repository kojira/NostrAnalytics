import React, { useState } from 'react';
import { useAnalyticsStore } from '../state/store';

export const RelaySelector: React.FC = () => {
  const { config, setRelays } = useAnalyticsStore();
  const [newRelay, setNewRelay] = useState('');

  const handleAdd = () => {
    if (newRelay.trim() && newRelay.startsWith('wss://')) {
      if (!config.relays.includes(newRelay.trim())) {
        setRelays([...config.relays, newRelay.trim()]);
        setNewRelay('');
      }
    }
  };

  const handleRemove = (relay: string) => {
    setRelays(config.relays.filter(r => r !== relay));
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>リレー設定</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input
          type="text"
          value={newRelay}
          onChange={(e) => setNewRelay(e.target.value)}
          placeholder="wss://relay.example.com"
          style={{ flex: 1, padding: '8px' }}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} style={{ padding: '8px 16px' }}>
          追加
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {config.relays.map((relay) => (
          <div
            key={relay}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{relay}</span>
            <button
              onClick={() => handleRemove(relay)}
              style={{
                padding: '4px 12px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              削除
            </button>
          </div>
        ))}
      </div>
      {config.relays.length === 0 && (
        <p style={{ color: '#999', marginTop: '10px' }}>
          リレーを追加してください
        </p>
      )}
    </div>
  );
};

