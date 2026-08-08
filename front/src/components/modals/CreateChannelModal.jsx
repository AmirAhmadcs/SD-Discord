import { useState } from "react";

import Modal from "../Modal";

export default function CreateChannelModal({ servers, onClose, onCreate }) {
  const [name, setName] = useState("");

  const [serverId, setServerId] = useState(servers[0]?.id ?? "");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e?.preventDefault();

    setError("");

    if (!serverId) {
      setError("Create or select a group/server first.");

      return;
    }

    setSubmitting(true);

    const result = await onCreate({
      name,
      serverId,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);

      return;
    }

    onClose();
  }

  return (
    <Modal
      title="Create a channel"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={submitting}
          >
            Create channel
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        {error && <div className="form-error-banner">{error}</div>}

        <label className="field-label">Server / Group</label>

        <select
          className="field-input"
          value={serverId}
          onChange={(e) => setServerId(e.target.value)}
          style={{
            marginBottom: 16,
          }}
        >
          <option value="">Select server</option>

          {servers.map((server) => (
            <option key={server.id} value={server.id}>
              {server.name}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="channel-name">
          Channel name
        </label>

        <input
          id="channel-name"
          autoFocus
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </form>
    </Modal>
  );
}
