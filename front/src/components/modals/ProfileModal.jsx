import Modal from '../Modal';
import Avatar from '../Avatar';
import { formatDateOnly } from '../../utils/time';

export default function ProfileModal({ user, isSelf, onClose, onEditRequest }) {
  return (
    <Modal
      title="Profile"
      onClose={onClose}
      width={380}
      footer={
        isSelf && (
          <button
            className="btn btn-primary"
            onClick={() => {
              onClose();
              onEditRequest();
            }}
          >
            Edit profile
          </button>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Avatar label={user.name} size={76} />
        <h3 style={{ margin: '14px 0 2px', fontSize: 18 }}>
          {user.name}
          {isSelf && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (you)</span>}
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>@{user.username}</p>
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 3 }}>Email</div>
          <div style={{ fontSize: 13.5 }}>{user.email}</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 3 }}>Bio</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: user.bio ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {user.bio || 'No bio yet.'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 3 }}>Member since</div>
          <div style={{ fontSize: 13.5 }}>{formatDateOnly(user.createdAt)}</div>
        </div>
      </div>
    </Modal>
  );
}
