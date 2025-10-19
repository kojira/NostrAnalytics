import React, { useState, useEffect } from 'react';
import { getStoredPrivateKey, storePrivateKey, clearPrivateKey, getPublicKey } from '../services/nostr';
import { useAnalyticsStore } from '../state/store';

export const PrivateKeyInput: React.FC = () => {
  const { pubkey, setPubkey } = useAnalyticsStore();
  const [privateKey, setPrivateKey] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if private key is already stored
    const stored = getStoredPrivateKey();
    if (stored && !pubkey) {
      loadPublicKey();
    }
  }, [pubkey]);

  const loadPublicKey = async () => {
    try {
      const pk = await getPublicKey();
      setPubkey(pk);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '公開鍵の取得に失敗しました');
    }
  };

  const handleSave = async () => {
    if (!privateKey.trim()) {
      setError('秘密鍵を入力してください');
      return;
    }

    // Validate hex format (64 characters)
    if (!/^[0-9a-fA-F]{64}$/.test(privateKey.trim())) {
      setError('秘密鍵は64文字の16進数である必要があります');
      return;
    }

    try {
      storePrivateKey(privateKey.trim());
      await loadPublicKey();
      setPrivateKey('');
      setShowInput(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '秘密鍵の保存に失敗しました');
    }
  };

  const handleClear = () => {
    if (confirm('保存された秘密鍵をクリアしますか？')) {
      clearPrivateKey();
      setPubkey(null);
      setPrivateKey('');
      setError(null);
    }
  };

  const hasStoredKey = !!getStoredPrivateKey();

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>認証設定</h3>
      
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          {error}
        </div>
      )}

      {pubkey ? (
        <div style={{
          padding: '12px',
          backgroundColor: '#e8f5e9',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <div style={{ marginBottom: '5px', fontSize: '14px', color: '#666' }}>
            接続中の公開鍵:
          </div>
          <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
            {pubkey}
          </code>
          {hasStoredKey && (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={handleClear}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                秘密鍵をクリア
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {!showInput ? (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowInput(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                秘密鍵を入力
              </button>
              <button
                onClick={loadPublicKey}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                NIP-07で接続
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  秘密鍵 (hex, 64文字):
                </label>
                <input
                  type="password"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="0123456789abcdef..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setShowInput(false);
                    setPrivateKey('');
                    setError(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#999',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
              </div>
              <p style={{ marginTop: '10px', fontSize: '12px', color: '#f44336' }}>
                ⚠️ 秘密鍵はブラウザのLocalStorageに保存されます。セキュリティリスクを理解した上で使用してください。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

