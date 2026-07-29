import Modal from '../Modal';
import Avatar from '../Avatar';

export default function StartDmModal({ users, onClose, onPick }) {
  return (
    <Modal title="New message" onClose={onClose}>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {users.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>No other users have registered yet.</p>
        )}
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => {
              onPick(u.id);
              onClose();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 8px',
              background: 'transparent',
              border: 'none',
              borderRadius: 10,
              textAlign: 'left',
            }}
          >
            <Avatar label={u.name} size={36} />
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
