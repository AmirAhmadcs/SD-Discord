const PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function Avatar({ label = '?', size = 40, online, square = false }) {
  const color = PALETTE[hashString(label) % PALETTE.length];
  const initials = label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: square ? size * 0.28 : '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: size * 0.4,
          color: '#fff',
          userSelect: 'none',
        }}
      >
        {initials || '?'}
      </div>
      {online !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: '50%',
            background: online ? '#22c55e' : '#6c6c7c',
            border: '2px solid var(--bg-panel)',
          }}
        />
      )}
    </div>
  );
}
