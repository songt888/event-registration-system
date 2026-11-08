import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from './api';
import { useAuth } from './auth';
import { play } from './sound';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Boot screen plays once per browser session; it is decorative and never blocks the form.
  const [boot] = useState(() => {
    try {
      if (sessionStorage.getItem('booted')) return false;
      sessionStorage.setItem('booted', '1');
    } catch {
      /* storage blocked: still show it once */
    }
    return true;
  });

  if (user) return <Navigate to="/events" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await login(email, password);
      play('startup');
      navigate('/events', { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setFieldErrors(Object.fromEntries((apiErr.details ?? []).map((d) => [d.field, d.message])));
      setError(apiErr.message);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    {boot && (
      <div className="boot" aria-hidden="true">
        <b>MILLENNIUM OS</b>
        <span>Event Registration System v2.000</span>
        <span>Counting seats . . . ok</span>
        <span>Starting log-on . . .</span>
        <i />
      </div>
    )}
    <main className="logon">
      <h1>Sign in</h1>
      <form onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {fieldErrors.email && <p role="alert">{fieldErrors.email}</p>}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {fieldErrors.password && <p role="alert">{fieldErrors.password}</p>}
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
    </>
  );
}
