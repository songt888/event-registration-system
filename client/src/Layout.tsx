import { useState } from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ApiError } from './api';
import { useAuth } from './auth';

// Signed-in shell: header with name, role, role-based links and logout. Hiding links is convenience only;
// the API guards decide access (F-01 section 5).
export function Layout() {
  const { user, loading, error, reload, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  if (loading) return <p>Loading...</p>;
  if (error)
    return (
      <main>
        <p role="alert">{error}</p>
        <button onClick={reload}>Try again</button>
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;

  async function onLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setLogoutError(`Logout failed: ${(err as ApiError).message}`);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header>
        <nav>
          <Link to="/events">Events</Link>{' '}
          {user.role === 'PARTICIPANT' && <Link to="/my/registrations">My registrations</Link>}
          {user.role === 'ORGANIZER' && <Link to="/organizer/events">My events</Link>}
        </nav>
        <span>
          {user.name} ({user.role === 'ORGANIZER' ? 'Organizer' : 'Participant'})
        </span>{' '}
        <button onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
        {logoutError && <p role="alert">{logoutError}</p>}
      </header>
      <Outlet />
    </>
  );
}
