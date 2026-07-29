import { Clock, AlertTriangle, RotateCw, X } from 'lucide-react';

export default function PendingMessageRow({ entry, onRetry, onRemove }) {
  const failed = entry.status === 'failed';
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 16px', opacity: 0.75 }}>
      <div style={{ width: 36, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {entry.payload.kind === 'text' ? entry.payload.text : `${entry.payload.fileName || 'Attachment'}`}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {failed ? (
            <>
              <AlertTriangle size={12} color="#ff8484" />
              <span style={{ fontSize: 11.5, color: '#ff8484' }}>Failed to send{entry.error ? `: ${entry.error}` : ''}</span>
              <button
                onClick={() => onRetry(entry.id)}
                title="Retry"
                aria-label="Retry sending"
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-text)', display: 'flex', marginLeft: 6 }}
              >
                <RotateCw size={13} />
              </button>
              <button
                onClick={() => onRemove(entry.id)}
                title="Discard"
                aria-label="Discard message"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex' }}
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <Clock size={12} color="var(--text-muted)" />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Waiting to send — you're offline</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
