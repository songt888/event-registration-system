import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from './api';
import { useAuth } from './auth';
import { play, setSound, soundOn } from './sound';

type WinState = 'normal' | 'max' | 'min' | 'closed';

// Signed-in shell: header with name, role, role-based links and logout. Hiding links is convenience only;
// the API guards decide access (F-01 section 5).
export function Layout() {
  const { user, loading, error, reload, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [time, setTime] = useState(() => new Date());
  const [sound, setSoundState] = useState(soundOn);
  // window manager: every page is one window that can be closed, minimized to the taskbar or maximized
  const location = useLocation();
  const [win, setWin] = useState<WinState>('normal');
  const [title, setTitle] = useState('');
  const wmRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  // a new page opens a new window
  const firstPage = useRef(true);
  useEffect(() => {
    setWin('normal');
    if (firstPage.current) firstPage.current = false; // sign-in already plays the startup jingle
    else play('open');
  }, [location.pathname]);
  // the window's title (its h1) labels the taskbar task and the desktop icon
  useEffect(() => {
    const h1 = wmRef.current?.querySelector('h1');
    if (h1 && h1.textContent !== title) setTitle(h1.textContent ?? '');
  });

  function windowAction(next: WinState, sound: 'close' | 'minimize' | 'maximize' | 'open') {
    play(sound);
    setWin(next);
  }

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
      play('shutdown');
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
          <span className="orb" aria-hidden="true" />
          <NavLink to="/events" end>Events</NavLink>{' '}
          {user.role === 'PARTICIPANT' && <NavLink to="/my/registrations">My registrations</NavLink>}
          {user.role === 'ORGANIZER' && <NavLink to="/organizer/events" end>My events</NavLink>}
          {win === 'min' && (
            <button type="button" className="task-min" data-sound="open" aria-label={`Restore window: ${title}`} onClick={() => windowAction('normal', 'open')}>
              {title}
            </button>
          )}
        </nav>
        <span>
          {user.name} ({user.role === 'ORGANIZER' ? 'Organizer' : 'Participant'})
        </span>{' '}
        <span className="clock" aria-hidden="true">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button className="tray" type="button" aria-pressed={sound} onClick={() => { setSound(!sound); setSoundState(!sound); }}>
          {sound ? 'Sound on' : 'Sound off'}
        </button>
        <button onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
        {logoutError && <p role="alert">{logoutError}</p>}
      </header>
      <div ref={wmRef} className={`wm wm-${win}`}>
        <div className="win-ctrl">
          <button type="button" className="dot dot-close" data-sound="close" aria-label="Close window" onClick={() => windowAction('closed', 'close')} />
          <button type="button" className="dot dot-min" data-sound="minimize" aria-label="Minimize window" onClick={() => windowAction('min', 'minimize')} />
          <button
            type="button"
            className="dot dot-max"
            data-sound="maximize"
            aria-label={win === 'max' ? 'Restore window size' : 'Maximize window'}
            onClick={() => windowAction(win === 'max' ? 'normal' : 'max', 'maximize')}
          />
        </div>
        <Outlet />
      </div>
      {win === 'closed' && (
        <button type="button" className="desk-icon" data-sound="open" aria-label={`Open window: ${title}`} onClick={() => windowAction('normal', 'open')}>
          <span className="desk-folder" aria-hidden="true" />
          {title}
        </button>
      )}
    </>
  );
}
