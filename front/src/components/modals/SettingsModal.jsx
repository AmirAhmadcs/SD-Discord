import { useState } from "react";
import Modal from "../Modal";
import Avatar from "../Avatar";

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        padding: 14,
        background: "var(--bg-input)",
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          {description}
        </div>
      </div>
      <label
        style={{
          position: "relative",
          display: "inline-block",
          width: 42,
          height: 24,
          flexShrink: 0,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            background: checked ? "var(--accent)" : "var(--bg-card)",
            borderRadius: 999,
            transition: "background 0.15s ease",
            cursor: "pointer",
          }}
          onClick={() => onChange(!checked)}
        />
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s ease",
            pointerEvents: "none",
          }}
        />
      </label>
    </div>
  );
}

export default function SettingsModal({
  user,
  simulateOffline,
  onClose,
  onUpdateProfile,
  onSetAllowAddToGroup,
  onSetSimulateOffline,
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    const result = await onUpdateProfile({ name, email, bio });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Modal title="Settings" onClose={onClose} width={460}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Avatar label={user.name} size={52} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            @{user.username} (can't be changed)
          </div>
        </div>
      </div>

      <form onSubmit={saveProfile} style={{ marginBottom: 24 }}>
        {error && <div className="form-error-banner">{error}</div>}

        <label className="field-label" htmlFor="settings-name">
          Display name
        </label>
        <input
          id="settings-name"
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label className="field-label" htmlFor="settings-email">
          Email
        </label>
        <input
          id="settings-email"
          type="email"
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label className="field-label" htmlFor="settings-bio">
          Bio
        </label>
        <textarea
          id="settings-bio"
          className="field-input"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ resize: "vertical", marginBottom: 14 }}
          maxLength={240}
        />

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          {saved ? "Saved" : "Save changes"}
        </button>
      </form>

      <ToggleRow
        title="Allow others to add me to groups"
        description="When turned off, other users won't be able to add your account to a new or existing group."
        checked={user.allowAddToGroup !== false}
        onChange={onSetAllowAddToGroup}
      />

      <ToggleRow
        title="Simulate offline mode"
        description="For testing: while on, your outgoing messages are queued locally and sent automatically once you turn this back off."
        checked={simulateOffline}
        onChange={onSetSimulateOffline}
      />
    </Modal>
  );
}
