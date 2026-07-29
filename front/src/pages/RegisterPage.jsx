import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/auth/AuthCard';
import { useStore } from '../context/StoreContext';

export default function RegisterPage() {
  const { store } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = store.register(form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <AuthCard title="Create an account">
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="form-error-banner" role="alert">
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="field-input"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="field-input"
            value={form.name}
            onChange={update('name')}
            autoComplete="name"
          />
        </div>

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
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          Create account
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 18, marginBottom: 0, fontSize: 13.5 }}>
        <Link to="/login">Already have an account? Log in</Link>
      </p>
    </AuthCard>
  );
}
