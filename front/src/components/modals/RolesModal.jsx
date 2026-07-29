import { useState } from 'react';
import Modal from '../Modal';
import { Trash2, Plus } from 'lucide-react';

const PERMISSION_FIELDS = [
  { key: 'post', label: 'Send messages' },
  { key: 'deleteAnyMessage', label: "Delete others' messages" },
  { key: 'manageMembers', label: 'Add & manage members' },
  { key: 'manageTopics', label: 'Create & delete topics' },
  { key: 'manageChannel', label: 'Rename & delete channel, toggle media' },
  { key: 'manageRoles', label: 'Create & manage roles' },
];

function RoleRow({ role, isDefault, onUpdate, onDelete }) {
  const [name, setName] = useState(role.name);
  const [error, setError] = useState('');

  function commitName() {
    if (name.trim() === role.name) return;
    const result = onUpdate({ name });
    if (!result.ok) setError(result.error);
    else setError('');
  }

  function togglePerm(key) {
    const result = onUpdate({ permissions: { [key]: !role.permissions[key] } });
    if (!result.ok) setError(result.error);
    else setError('');
  }

  return (
    <div style={{ border: '1px solid var(--border-mid)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <input
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          style={{ flex: 1, fontWeight: 600 }}
        />
        {!isDefault && (
          <button
            aria-label={`Delete role ${role.name}`}
            title="Delete role"
            onClick={onDelete}
            style={{ background: 'transparent', border: 'none', color: '#ff8484', display: 'flex', padding: 6 }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {error && <div className="field-error" style={{ marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PERMISSION_FIELDS.map((f) => (
          <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <input type="checkbox" checked={!!role.permissions[f.key]} onChange={() => togglePerm(f.key)} />
            {f.label}
          </label>
        ))}
      </div>
      {isDefault && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
          Default role — automatically assigned to new members. Can't be deleted.
        </p>
      )}
    </div>
  );
}

export default function RolesModal({ channel, onClose, onCreateRole, onUpdateRole, onDeleteRole }) {
  const [newRoleName, setNewRoleName] = useState('');
  const [error, setError] = useState('');

  function handleCreate(e) {
    e.preventDefault();
    const result = onCreateRole(newRoleName);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewRoleName('');
    setError('');
  }

  const roles = Object.values(channel.roles).sort((a, b) => a.createdAt - b.createdAt);

  return (
    <Modal title="Channel roles" onClose={onClose} width={480}>
      <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
        {roles.map((role) => (
          <RoleRow
            key={role.id}
            role={role}
            isDefault={role.id === channel.defaultRoleId}
            onUpdate={(patch) => onUpdateRole(role.id, patch)}
            onDelete={() => onDeleteRole(role.id)}
          />
        ))}
      </div>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8 }}>
        <input
          className="field-input"
          placeholder="New role name"
          value={newRoleName}
          onChange={(e) => {
            setNewRoleName(e.target.value);
            setError('');
          }}
        />
        <button type="submit" className="btn btn-primary" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} />
          Create role
        </button>
      </form>
      {error && <div className="field-error" style={{ marginTop: 8 }}>{error}</div>}
    </Modal>
  );
}
