import { useEffect, useMemo, useRef, useState } from 'react';
import { Info, Search, X } from 'lucide-react';
import MessageBubble from '../chat/MessageBubble';
import PendingMessageRow from '../chat/PendingMessageRow';
import Composer from '../chat/Composer';
import TopicTabs from '../chat/TopicTabs';

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export default function ChatArea({
  title,
  subtitle,
  titleClickable,
  onTitleClick,
  messages,
  outbox,
  getUser,
  currentUserId,
  isManager,
  onEditMessage,
  onDeleteMessage,
  onOpenProfile,
  onSend,
  onOpenSchedule,
  composerDisabled,
  composerDisabledReason,
  mediaDisabled,
  mediaDisabledReason,
  topics,
  activeTopicId,
  onSelectTopic,
  onCreateTopic,
  onDeleteTopic,
  canManageTopics,
  onToggleDetails,
  onRetryOutbox,
  onRemoveOutbox,
}) {
  const scrollRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredMessages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      const inText = m.text && m.text.toLowerCase().includes(q);
      const inFile = m.fileName && m.fileName.toLowerCase().includes(q);
      return inText || inFile;
    });
  }, [messages, query]);

  const searching = query.trim().length > 0;

  useEffect(() => {
    if (scrollRef.current && !searching) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, activeTopicId, searching]);

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-soft)',
          gap: 10,
        }}
      >
        {titleClickable ? (
          <button
            onClick={onTitleClick}
            style={{ background: 'transparent', border: 'none', textAlign: 'left', padding: 0 }}
          >
            <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>}
          </button>
        ) : (
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => {
              setSearchOpen((s) => !s);
              if (searchOpen) setQuery('');
            }}
            aria-label="Search messages"
            title="Search messages"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex' }}
          >
            <Search size={18} />
          </button>
          <button
            onClick={onToggleDetails}
            aria-label="Toggle details panel"
            title="Details"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex' }}
          >
            <Info size={19} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-soft)', display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in this conversation..."
              className="field-input"
              style={{ paddingLeft: 30, fontSize: 13.5 }}
            />
          </div>
          <button
            onClick={() => {
              setQuery('');
              setSearchOpen(false);
            }}
            aria-label="Close search"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {topics && (
        <TopicTabs
          topics={topics}
          activeTopicId={activeTopicId}
          onSelect={onSelectTopic}
          onCreate={onCreateTopic}
          onDelete={onDeleteTopic}
          canManage={canManageTopics}
        />
      )}

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {searching && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, margin: '0 0 8px' }}>
            {filteredMessages.length} result{filteredMessages.length === 1 ? '' : 's'} for "{query}"
          </p>
        )}
        {filteredMessages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5, marginTop: 40 }}>
            {searching ? 'No matching messages.' : 'No messages yet. Say hello!'}
          </p>
        )}
        {filteredMessages.map((m, i) => {
          const prev = filteredMessages[i - 1];
          const showHeader =
            searching || !prev || prev.senderId !== m.senderId || m.createdAt - prev.createdAt > GROUP_WINDOW_MS;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              sender={getUser(m.senderId)}
              isOwn={m.senderId === currentUserId}
              canDelete={isManager}
              showHeader={showHeader}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onOpenProfile={onOpenProfile}
            />
          );
        })}
        {!searching &&
          outbox?.map((entry) => (
            <PendingMessageRow key={entry.id} entry={entry} onRetry={onRetryOutbox} onRemove={onRemoveOutbox} />
          ))}
      </div>

      <Composer
        disabled={composerDisabled}
        disabledReason={composerDisabledReason}
        mediaDisabled={mediaDisabled}
        mediaDisabledReason={mediaDisabledReason}
        onSend={onSend}
        onOpenSchedule={onOpenSchedule}
      />
    </div>
  );
}
