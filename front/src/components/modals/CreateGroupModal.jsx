import { useState } from "react";
import Modal from "../Modal";
import Avatar from "../Avatar";

export default function CreateGroupModal({ users, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");

  function toggle(id) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  async function submit(e) {
    e?.preventDefault();
    const result = await onCreate({ name, memberIds: selected });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal
      title="Create a group"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Create group
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        {error && <div className="form-error-banner">{error}</div>}

        <label className="field-label" htmlFor="group-name">
          Group name
        </label>
        <input
          id="group-name"
          autoFocus
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        <span className="field-label">Add members</span>
        <div
          style={{
            maxHeight: 260,
            overflowY: "auto",
            border: "1px solid var(--border-mid)",
            borderRadius: 10,
          }}
        >
          {users.length === 0 && (
            <p
              style={{
                padding: 14,
                color: "var(--text-muted)",
                fontSize: 13,
                margin: 0,
              }}
            >
              No other users yet.
            </p>
          )}
          {users.map((u) => {
            const blocked = u.allowAddToGroup === false;
            return (
              <label
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderBottom: "1px solid var(--border-soft)",
                  opacity: blocked ? 0.5 : 1,
                  cursor: blocked ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  disabled={blocked}
                  checked={selected.includes(u.id)}
                  onChange={() => toggle(u.id)}
                />
                <Avatar label={u.name} size={30} />
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {u.name}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    @{u.username}
                    {blocked ? " · not accepting group invites" : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
