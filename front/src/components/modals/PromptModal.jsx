import { useState } from 'react';
import Modal from '../Modal';

export default function PromptModal({ title, label, initialValue = '', confirmLabel = 'Save', onClose, onSubmit }) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');

  function submit(e) {
    e?.preventDefault();
    const result = onSubmit(value);
    if (!result?.ok) {
      setError(result?.error || 'Something went wrong.');
      return;
    }
    onClose();
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="prompt-input">
          {label}
        </label>
        <input
          id="prompt-input"
          autoFocus
          className={`field-input ${error ? 'has-error' : ''}`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
        />
        {error && <div className="field-error">{error}</div>}
      </form>
    </Modal>
  );
}
