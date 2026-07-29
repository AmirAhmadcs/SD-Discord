import Modal from '../Modal';
import { Pencil, X } from 'lucide-react';
import { formatDateTime } from '../../utils/time';

const STATUS_STYLE = {
  pending: { label: 'Pending', color: '#f5b74a', bg: 'rgba(245, 183, 74, 0.14)' },
  sent: { label: 'Sent', color: '#7fd8a8', bg: 'rgba(127, 216, 168, 0.14)' },
  canceled: { label: 'Canceled', color: '#9a9aab', bg: 'rgba(154, 154, 171, 0.14)' },
  failed: { label: 'Failed', color: '#ff8484', bg: 'rgba(239, 68, 68, 0.14)' },
};

export default function ScheduledMessagesModal({ entries, resolveDestination, onClose, onEdit, onCancel }) {
  return (
    <Modal title="Scheduled messages" onClose={onClose} width={480}>
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        {entries.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, textAlign: 'center', padding: '30px 0' }}>
            You have no scheduled messages.
          </p>
        )}
        {entries.map((entry) => {
          const status = STATUS_STYLE[entry.status] || STATUS_STYLE.pending;
          return (
            <div
              key={entry.id}
              style={{
                border: '1px solid var(--border-mid)',
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{resolveDestination(entry)}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: status.color,
                    background: status.bg,
                    padding: '3px 8px',
                    borderRadius: 999,
                  }}
                >
                  {status.label}
                </span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {entry.text}
              </p>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: entry.status === 'pending' ? 8 : 0 }}>
                {entry.status === 'sent'
                  ? `Sent at ${formatDateTime(entry.sentAt)}`
                  : entry.status === 'failed'
                  ? `Failed: ${entry.error || 'could not be delivered'}`
                  : `Scheduled for ${formatDateTime(entry.sendAt)}`}
              </div>
              {entry.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '5px 10px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => onEdit(entry)}
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '5px 10px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => onCancel(entry.id)}
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
