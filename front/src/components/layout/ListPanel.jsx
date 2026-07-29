import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import Avatar from '../Avatar';

const SECTION_LABEL = {
  dm: 'Direct Messages',
  group: 'Groups',
  channel: 'Channels',
};

export default function ListPanel({ section, items, selectedId, onSelect, onCreate, createLabel }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-soft)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '16px 14px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, margin: 0, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {SECTION_LABEL[section]}
          </h2>
          <button
            onClick={onCreate}
            title={createLabel}
            aria-label={createLabel}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent-soft)',
              color: 'var(--accent-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find or start a conversation"
            className="field-input"
            style={{ paddingLeft: 32, fontSize: 13.5 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 30, padding: '0 12px' }}>
            {items.length === 0 ? `No ${SECTION_LABEL[section].toLowerCase()} yet. Tap + to start one.` : 'No matches.'}
          </p>
        )}
        {filtered.map((it) => (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 8px',
              borderRadius: 10,
              border: 'none',
              marginBottom: 2,
              background: it.id === selectedId ? 'var(--accent-soft)' : 'transparent',
              color: it.id === selectedId ? 'var(--text-primary)' : 'var(--text-secondary)',
              textAlign: 'left',
            }}
          >
            <Avatar label={it.label} size={36} square={section === 'channel'} online={it.online} />
            <span style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-primary)',
                }}
              >
                {it.label}
              </span>
              {it.sublabel && (
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {it.sublabel}
                </span>
              )}
            </span>
            {it.badge ? (
              <span
                style={{
                  marginLeft: 'auto',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 999,
                  minWidth: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                }}
              >
                {it.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
