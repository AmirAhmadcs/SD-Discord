import { Plus, X } from 'lucide-react';

export default function TopicTabs({ topics, activeTopicId, onSelect, onCreate, onDelete, canManage }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderBottom: '1px solid var(--border-soft)',
        overflowX: 'auto',
      }}
    >
      {topics.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: t.id === activeTopicId ? 'var(--accent-soft)' : 'transparent',
            color: t.id === activeTopicId ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderRadius: 999,
            padding: '6px 6px 6px 12px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => onSelect(t.id)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: 13, fontWeight: 600, padding: 0 }}
          >
            # {t.name}
          </button>
          {canManage && (
            <button
              aria-label={`Delete topic ${t.name}`}
              title="Delete topic"
              onClick={() => onDelete(t.id)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      {canManage && (
        <button
          onClick={onCreate}
          aria-label="Create topic"
          title="Create topic"
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '1px solid var(--border-mid)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}
