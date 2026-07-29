import PromptModal from './PromptModal';

export default function CreateChannelModal({ onClose, onCreate }) {
  return (
    <PromptModal
      title="Create a channel"
      label="Channel name"
      confirmLabel="Create channel"
      onClose={onClose}
      onSubmit={(name) => onCreate({ name })}
    />
  );
}
