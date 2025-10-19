import React from 'react';
import { useAnalyticsStore } from '../state/store';
import { LANGUAGES } from '../services/languages';

export const LanguageSelector: React.FC = () => {
  const { config, setLanguages } = useAnalyticsStore();

  const handleToggle = (code: string) => {
    if (config.languages.includes(code)) {
      setLanguages(config.languages.filter(l => l !== code));
    } else {
      setLanguages([...config.languages, code]);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>言語選択</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {LANGUAGES.map((lang) => {
          const isSelected = config.languages.includes(lang.code);
          return (
            <label
              key={lang.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                backgroundColor: isSelected ? '#e3f2fd' : '#f5f5f5',
                borderRadius: '4px',
                cursor: 'pointer',
                border: isSelected ? '2px solid #2196f3' : '2px solid transparent'
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(lang.code)}
                style={{ marginRight: '8px' }}
              />
              <span>
                {lang.nativeName} <small style={{ color: '#666' }}>({lang.code})</small>
              </span>
            </label>
          );
        })}
      </div>
      {config.languages.length === 0 && (
        <p style={{ color: '#999', marginTop: '10px' }}>
          少なくとも1つの言語を選択してください
        </p>
      )}
      <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        選択中: {config.languages.length} 言語
      </p>
    </div>
  );
};

