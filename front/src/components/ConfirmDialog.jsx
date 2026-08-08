import Modal from './Modal';

export default async function ConfirmDialog({ title, message, confirmLabel = 'حذف', onConfirm, onClose, danger = true }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      width={380}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            انصراف
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              await onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.8, fontSize: 14.5 }}>{message}</p>
    </Modal>
  );
}
