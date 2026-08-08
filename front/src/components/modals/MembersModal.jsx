import { useState } from "react";
import Modal from "../Modal";
import Avatar from "../Avatar";
import { ShieldCheck, UserPlus } from "lucide-react";

export default function MembersModal({
  kind, // 'group' | 'channel'
  entity,
  getUser,
  currentUserId,
  candidates,
  canManageMembers,
  onAddMember,
  onAssignRole,
  onOpenProfile,
  onClose,
}) {
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const members = entity.memberIds.map((id) => getUser(id)).filter(Boolean);
  const nonMembers = candidates.filter((u) => !entity.memberIds.includes(u.id));
  const roles = kind === "channel" ? Object.values(entity.roles) : [];

  function roleIdFor(userId) {
    if (kind !== "channel") return null;
    if (entity.ownerId === userId) return "owner";
    return entity.memberRoles[userId] || entity.defaultRoleId;
  }

  async function handleAdd(userId) {
    const result = await onAddMember(userId);
    if (!result.ok) setError(result.error);
    else setError("");
  }

  async function handleRoleChange(userId, roleId) {
    const result = await onAssignRole(userId, roleId);
    if (!result.ok) setError(result.error);
    else setError("");
  }

  return (
    <Modal
      title={`${kind === "channel" ? "Channel" : "Group"} members`}
      onClose={onClose}
      width={460}
    >
      {error && <div className="form-error-banner">{error}</div>}

      <div style={{ maxHeight: 340, overflowY: "auto" }}>
        {members.map((u) => {
          const isOwner = kind === "channel" && entity.ownerId === u.id;
          return (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 4px",
                borderBottom: "1px solid var(--border-soft)",
              }}
            >
              <button
                onClick={() => onOpenProfile?.(u.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  display: "flex",
                }}
                aria-label={`View ${u.name}'s profile`}
              >
                <Avatar label={u.name} size={34} />
              </button>
              <button
                onClick={() => onOpenProfile?.(u.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {u.name} {u.id === currentUserId ? "(you)" : ""}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  @{u.username}
                </span>
              </button>

              {kind === "channel" &&
                (isOwner ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--accent-text)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ShieldCheck size={13} />
                    Owner
                  </span>
                ) : canManageMembers ? (
                  <select
                    value={roleIdFor(u.id)}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="field-input"
                    style={{
                      width: "auto",
                      padding: "5px 8px",
                      fontSize: 12.5,
                    }}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {entity.roles[roleIdFor(u.id)]?.name}
                  </span>
                ))}
            </div>
          );
        })}
      </div>

      {canManageMembers && nonMembers.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="btn btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              padding: "7px 12px",
            }}
          >
            <UserPlus size={15} />
            Add member
          </button>
          {showAdd && (
            <div
              style={{
                marginTop: 10,
                maxHeight: 180,
                overflowY: "auto",
                border: "1px solid var(--border-mid)",
                borderRadius: 10,
              }}
            >
              {nonMembers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleAdd(u.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border-soft)",
                    textAlign: "left",
                  }}
                >
                  <Avatar label={u.name} size={28} />
                  <span style={{ fontSize: 13 }}>{u.name}</span>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: "var(--text-muted)",
                      marginLeft: 4,
                    }}
                  >
                    @{u.username}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
