import React, { useState, useMemo } from 'react';
import { useAnalyticsStore } from '../state/store';

export const EventBrowser: React.FC = () => {
  const { events } = useAnalyticsStore();
  
  // Filter states
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [contentFilter, setContentFilter] = useState<string>('');
  const [pubkeyFilter, setPubkeyFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Apply filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Language filter
      if (languageFilter && event.detectedLanguage !== languageFilter) {
        return false;
      }
      
      // Content filter (case-insensitive)
      if (contentFilter && !event.content.toLowerCase().includes(contentFilter.toLowerCase())) {
        return false;
      }
      
      // Pubkey filter (partial match)
      if (pubkeyFilter && !event.pubkey.toLowerCase().includes(pubkeyFilter.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [events, languageFilter, contentFilter, pubkeyFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  // Get unique languages
  const uniqueLanguages = useMemo(() => {
    const langs = new Set(events.map(e => e.detectedLanguage).filter(Boolean));
    return Array.from(langs).sort();
  }, [events]);

  // Reset to page 1 when filters or items per page change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [languageFilter, contentFilter, pubkeyFilter, itemsPerPage]);

  if (events.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        color: '#999'
      }}>
        分析を実行すると、取得したイベントがここに表示されます
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>イベントブラウザ</h3>
      
      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h4 style={{ marginTop: 0 }}>フィルタ</h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px'
        }}>
          {/* Language filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              言語
            </label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            >
              <option value="">すべて</option>
              {uniqueLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Content filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              文言検索
            </label>
            <input
              type="text"
              value={contentFilter}
              onChange={(e) => setContentFilter(e.target.value)}
              placeholder="キーワードを入力..."
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>

          {/* Pubkey filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Pubkey
            </label>
            <input
              type="text"
              value={pubkeyFilter}
              onChange={(e) => setPubkeyFilter(e.target.value)}
              placeholder="pubkeyを入力..."
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {filteredEvents.length} / {events.length} イベント
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '14px', color: '#666' }}>表示件数:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10件</option>
              <option value={20}>20件</option>
              <option value={50}>50件</option>
              <option value={100}>100件</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '15px'
        }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: currentPage === 1 ? '#f5f5f5' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ← 前へ
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>ページ</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
              style={{
                width: '80px',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                textAlign: 'center'
              }}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>/ {totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: currentPage === totalPages ? '#f5f5f5' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            次へ →
          </button>
        </div>
      )}

      {/* Events list */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {paginatedEvents.map((event, index) => {
          const isExpanded = expandedEventIds.has(event.id);
          const contentPreview = event.content.length > 150 
            ? event.content.substring(0, 150) + '...' 
            : event.content;

          return (
            <div
              key={event.id}
              onClick={() => toggleEventExpansion(event.id)}
              style={{
                padding: '15px',
                borderBottom: index < paginatedEvents.length - 1 ? '1px solid #eee' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: isExpanded ? '#f5f5f5' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!isExpanded) e.currentTarget.style.backgroundColor = '#fafafa';
              }}
              onMouseLeave={(e) => {
                if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '10px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      marginRight: '8px',
                      fontWeight: 'bold'
                    }}>
                      {event.detectedLanguage ? event.detectedLanguage.toUpperCase() : 'N/A'}
                    </span>
                    <span style={{ marginRight: '8px' }}>
                      Kind: {event.kind}
                    </span>
                    <span>
                      {new Date(event.created_at * 1000).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    fontFamily: 'monospace',
                    marginBottom: '8px'
                  }}>
                    {event.pubkey}
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#333',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: isExpanded ? 'none' : '4.8em',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {isExpanded ? event.content : contentPreview}
              </div>
              {event.content.length > 150 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#2196f3',
                  fontWeight: 'bold'
                }}>
                  {isExpanded ? '▲ 閉じる' : '▼ もっと見る'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px'
        }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: currentPage === 1 ? '#f5f5f5' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            最初
          </button>

          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: currentPage === 1 ? '#f5f5f5' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ← 前へ
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>ページ</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
              style={{
                width: '80px',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                textAlign: 'center'
              }}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>/ {totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: currentPage === totalPages ? '#f5f5f5' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            次へ →
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: currentPage === totalPages ? '#f5f5f5' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            最後
          </button>
        </div>
      )}
    </div>
  );
};

