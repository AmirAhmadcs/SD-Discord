import Modal from '../Modal';
import Avatar from '../Avatar';
import { MessageCircle, Users, Hash } from 'lucide-react';

const ICON = { dm: MessageCircle, group: Users, channel: Hash };

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPanel({ notifications, getUser, onClose, onSelect, onMarkAllRead }) {
  return (
    <Modal
      title="Notifications"
      onClose={onClose}
      width={420}
      footer={
        notifications.some((n) => !n.read) && (
          <button className="btn btn-ghost" onClick={onMarkAllRead}>
            Mark all as read
          </button>
        )
      }
    >
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {notifications.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, textAlign: 'center', padding: '30px 0' }}>
            No notifications yet.
          </p>
        )}
        {notifications.map((n) => {
          const from = getUser(n.fromUserId);
          const Icon = ICON[n.scope] || MessageCircle;
          return (
            <button
              key={n.id}
              onClick={() => onSelect(n)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 8px',
                background: n.read ? 'transparent' : 'var(--accent-soft)',
                border: 'none',
                borderRadius: 10,
                textAlign: 'left',
                marginBottom: 3,
              }}
            >
              <Avatar label={from?.name || '?'} size={34} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5 }}>
                  <strong>{from?.name || 'Unknown user'}</strong>
                  <Icon size={12} color="var(--text-muted)" />
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {timeAgo(n.createdAt)}
                  </span>
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {n.preview}
                </span>
              </span>
              {!n.read && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
