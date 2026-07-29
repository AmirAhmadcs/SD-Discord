export default function AuthCard({ title, children, width = 420 }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width,
          maxWidth: '100%',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 30px',
          boxShadow: 'var(--shadow-pop)',
          border: '1px solid var(--border-soft)',
        }}
      >
        <h1 style={{ textAlign: 'center', fontSize: 24, marginTop: 0, marginBottom: 26 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
