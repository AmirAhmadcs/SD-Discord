import { MessageCircle, Users, Hash, Settings, LogOut, Bell, Clock } from 'lucide-react';
import Avatar from '../Avatar';

function RailButton({ active, onClick, label, children, badge }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: 13,
        border: 'none',
        background: active ? 'var(--accent)' : 'var(--bg-panel-2)',
        color: active ? '#fff' : 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
    >
      {children}
      {badge ? (
        <span
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            background: '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 999,
            minWidth: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--bg-rail)',
          }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );
}

export default function NavRail({
  section,
  onSection,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  onOpenScheduled,
  unreadNotifications,
  onLogout,
  currentUser,
}) {
  return (
    <div
      style={{
        width: 72,
        flexShrink: 0,
        background: 'var(--bg-rail)',
        borderRight: '1px solid var(--border-soft)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14px 0',
        gap: 10,
      }}
    >
      <button
        onClick={onOpenProfile}
        aria-label="Your profile"
        title={currentUser?.name}
        style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: 6 }}
      >
        <Avatar label={currentUser?.name || '?'} size={44} online />
      </button>

      <div style={{ width: 30, height: 1, background: 'var(--border-soft)', margin: '2px 0 6px' }} />

      <RailButton active={section === 'dm'} onClick={() => onSection('dm')} label="Direct Messages">
        <MessageCircle size={20} />
      </RailButton>
      <RailButton active={section === 'group'} onClick={() => onSection('group')} label="Groups">
        <Users size={20} />
      </RailButton>
      <RailButton active={section === 'channel'} onClick={() => onSection('channel')} label="Channels">
        <Hash size={20} />
      </RailButton>

      <div style={{ width: 30, height: 1, background: 'var(--border-soft)', margin: '2px 0' }} />

      <RailButton onClick={onOpenNotifications} label="Notifications" badge={unreadNotifications}>
        <Bell size={19} />
      </RailButton>
      <RailButton onClick={onOpenScheduled} label="Scheduled messages">
        <Clock size={19} />
      </RailButton>

      <div style={{ flex: 1 }} />

      <RailButton onClick={onOpenSettings} label="Settings">
        <Settings size={20} />
      </RailButton>
      <RailButton onClick={onLogout} label="Log out">
        <LogOut size={20} />
      </RailButton>
    </div>
  );
}
