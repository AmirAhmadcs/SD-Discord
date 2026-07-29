import { useState } from 'react';
import { Pencil, Trash2, Check, X, Download, FileText } from 'lucide-react';
import Avatar from '../Avatar';
import { formatTimeOnly } from '../../utils/time';
import { formatBytes } from '../../utils/file';

function MediaContent({ message }) {
  if (message.kind === 'image') {
    return (
      <img
        src={message.dataUrl}
        alt={message.fileName || 'image attachment'}
        style={{ maxWidth: 320, maxHeight: 260, borderRadius: 10, display: 'block', marginTop: 4 }}
      />
    );
  }
  if (message.kind === 'video') {
    return (
      <video
        src={message.dataUrl}
        controls
        style={{ maxWidth: 340, maxHeight: 260, borderRadius: 10, display: 'block', marginTop: 4 }}
      />
    );
  }
  if (message.kind === 'audio') {
    return (
      <audio src={message.dataUrl} controls style={{ marginTop: 6, maxWidth: 300 }} />
    );
  }
  // file / document
  return (
    <a
      href={message.dataUrl}
      download={message.fileName}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
        padding: '10px 12px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-mid)',
        borderRadius: 10,
        maxWidth: 300,
        textDecoration: 'none',
        color: 'var(--text-primary)',
      }}
    >
      <FileText size={22} color="var(--accent-text)" />
      <span style={{ overflow: 'hidden' }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {message.fileName}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{formatBytes(message.fileSize)}</span>
      </span>
      <Download size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} />
    </a>
  );
}

export default function MessageBubble({ message, sender, isOwn, canDelete, showHeader, onEdit, onDelete, onOpenProfile }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);
  const [error, setError] = useState('');

  function submitEdit() {
    const result = onEdit(message.id, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    setError('');
  }

  return (
    <div
      className="message-row"
      style={{
        display: 'flex',
        gap: 12,
        padding: showHeader ? '10px 16px 2px' : '1px 16px',
        position: 'relative',
      }}
    >
      <div style={{ width: 36, flexShrink: 0 }}>
        {showHeader && sender && (
          <button
            onClick={() => onOpenProfile?.(sender.id)}
            aria-label={`View ${sender.name}'s profile`}
            style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex' }}
          >
            <Avatar label={sender.name} size={36} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {showHeader && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <button
              onClick={() => sender && onOpenProfile?.(sender.id)}
              style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 600, fontSize: 14.5, color: 'inherit' }}
            >
              {sender?.name || 'Unknown user'}
            </button>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{formatTimeOnly(message.createdAt)}</span>
          </div>
        )}

        {editing ? (
          <div style={{ marginTop: 4 }}>
            <textarea
              autoFocus
              className="field-input"
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{ resize: 'vertical' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
            />
            {error && <div className="field-error">{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 13 }} onClick={submitEdit}>
                <Check size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                Save
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '5px 12px', fontSize: 13 }}
                onClick={() => {
                  setEditing(false);
                  setDraft(message.text);
                  setError('');
                }}
              >
                <X size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.kind === 'text' ? (
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {message.text}
              </p>
            ) : (
              <>
                <MediaContent message={message} />
                {message.text && (
                  <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>{message.text}</p>
                )}
              </>
            )}
            {message.editedAt && (
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>(edited)</span>
            )}
          </>
        )}
      </div>

      {!editing && (isOwn || canDelete) && (
        <div
          className="msg-actions"
          style={{
            position: 'absolute',
            top: 6,
            right: 16,
            display: 'flex',
            gap: 4,
            transition: 'opacity 0.1s ease',
            background: 'var(--bg-panel-2)',
            border: '1px solid var(--border-soft)',
            borderRadius: 8,
            padding: 3,
          }}
        >
          {isOwn && (
            <button
              aria-label="Edit message"
              title="Edit message"
              onClick={() => setEditing(true)}
              style={{ background: 'transparent', border: 'none', padding: 5, color: 'var(--text-secondary)' }}
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            aria-label="Delete message"
            title="Delete message"
            onClick={() => onDelete(message.id)}
            style={{ background: 'transparent', border: 'none', padding: 5, color: '#ff8484' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
