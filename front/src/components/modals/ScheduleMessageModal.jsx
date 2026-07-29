import { useState } from 'react';
import Modal from '../Modal';

function toLocalInputParts(ts) {
  const d = ts ? new Date(ts) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

export default function ScheduleMessageModal({ destinationLabel, editing, onClose, onSubmit }) {
  const initial = toLocalInputParts(editing?.sendAt);
  const [text, setText] = useState(editing?.text || '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) {
      setError('Message text cannot be empty.');
      return;
    }
    if (!date || !time) {
      setError('Pick both a date and a time.');
      return;
    }
    const sendAt = new Date(`${date}T${time}`).getTime();
    const result = onSubmit({ text, sendAt });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal
      title={editing ? 'Edit scheduled message' : 'Schedule a message'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {editing ? 'Save changes' : 'Schedule message'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        {error && <div className="form-error-banner">{error}</div>}

        {destinationLabel && (
          <div style={{ marginBottom: 14 }}>
            <span className="field-label">Sending to</span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{destinationLabel}</div>
          </div>
        )}

        <label className="field-label" htmlFor="sched-text">
          Message
        </label>
        <textarea
          id="sched-text"
          className="field-input"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ resize: 'vertical', marginBottom: 14 }}
          autoFocus
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor="sched-date">
              Date
            </label>
            <input id="sched-date" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor="sched-time">
              Time
            </label>
            <input id="sched-time" type="time" className="field-input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
