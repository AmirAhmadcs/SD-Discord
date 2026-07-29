import Avatar from '../Avatar';
import { formatDateOnly } from '../../utils/time';
import { Users, Pencil, Trash2, LogOut, Image as ImageIcon, ToggleLeft, ToggleRight, ShieldCheck } from 'lucide-react';

function ActionButton({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        border: 'none',
        background: 'transparent',
        color: danger ? '#ff8484' : 'var(--text-secondary)',
        fontSize: 13.5,
        textAlign: 'left',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

export default function DetailsPanel({
  section,
  title,
  subtitle,
  createdAt,
  mediaMessages,
  onOpenMembers,
  onOpenProfile,
  onRename,
  canRename,
  onDelete,
  canDelete,
  onLeave,
  canLeave,
  mediaAllowed,
  onToggleMedia,
  canToggleMedia,
  canManageRoles,
  onOpenRoles,
}) {
  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-soft)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '28px 20px 16px', textAlign: 'center', borderBottom: '1px solid var(--border-soft)' }}>
        {section === 'dm' && onOpenProfile ? (
          <button onClick={onOpenProfile} style={{ background: 'transparent', border: 'none', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Avatar label={title} size={72} />
            </div>
            <h3 style={{ margin: '0 0 2px', fontSize: 17 }}>{title}</h3>
            {subtitle && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>}
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Avatar label={title} size={72} square={section === 'channel'} />
            </div>
            <h3 style={{ margin: '0 0 2px', fontSize: 17 }}>{title}</h3>
            {subtitle && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>}
          </>
        )}
      </div>

      <div style={{ padding: 18, borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>
          {section === 'dm' ? 'Member since' : 'Created at'}
        </div>
        <div style={{ fontSize: 13.5 }}>{formatDateOnly(createdAt)}</div>
      </div>

      {(section === 'group' || section === 'channel') && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-soft)' }}>
          <ActionButton icon={Users} label={section === 'channel' ? 'Channel members' : 'Group members'} onClick={onOpenMembers} />
          {section === 'channel' && canManageRoles && (
            <ActionButton icon={ShieldCheck} label="Manage roles" onClick={onOpenRoles} />
          )}
          {canRename && <ActionButton icon={Pencil} label={`Rename ${section}`} onClick={onRename} />}
          {section === 'channel' && canToggleMedia && (
            <ActionButton
              icon={mediaAllowed ? ToggleRight : ToggleLeft}
              label={mediaAllowed ? 'Media sharing: on' : 'Media sharing: off'}
              onClick={onToggleMedia}
            />
          )}
          {canLeave && <ActionButton icon={LogOut} label={`Leave ${section}`} onClick={onLeave} />}
          {canDelete && <ActionButton icon={Trash2} label={`Delete ${section}`} onClick={onDelete} danger />}
        </div>
      )}

      <div style={{ padding: 18, flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ImageIcon size={14} />
          Shared media ({mediaMessages.length})
        </div>
        {mediaMessages.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Photos, videos and files shared here will appear.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {mediaMessages.map((m) => (
              <a
                key={m.id}
                href={m.dataUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  aspectRatio: '1 / 1',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                {m.kind === 'image' ? (
                  <img src={m.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      padding: 4,
                    }}
                  >
                    {m.kind.toUpperCase()}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
