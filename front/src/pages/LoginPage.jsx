import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/auth/AuthCard';
import { useStore } from '../context/StoreContext';

export default function LoginPage() {
  const { store } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = store.login(form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <AuthCard title="Log in">
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="form-error-banner" role="alert">
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="field-input"
            value={form.username}
            onChange={update('username')}
            autoComplete="username"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="field-input"
            value={form.password}
            onChange={update('password')}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          Login
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 18, marginBottom: 0, fontSize: 13.5 }}>
        <Link to="/register">Don't have an account? Register</Link>
      </p>

      <p style={{ textAlign: 'center', marginTop: 14, marginBottom: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
        Demo accounts: sara_dev / ali_designer / reza_pm — password 123456
      </p>
    </AuthCard>
  );
}
