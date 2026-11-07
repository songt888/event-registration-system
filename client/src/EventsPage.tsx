import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api, ApiError } from './api';
import { useAuth } from './auth';
import { play } from './sound';
import type { EventPayload } from './MyEventsPage';

const places = (e: EventPayload) => (e.remainingPlaces === 0 ? 'Full' : `${e.remainingPlaces} of ${e.capacity} places left`);

// Capacity: segmented installer bar (decorative) beside the unchanged text.
function Places({ e }: { e: EventPayload }) {
  return (
    <div className="places">
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${(e.remainingPlaces / e.capacity) * 100}%` }} />
      </div>
      <p className={e.remainingPlaces === 0 ? 'full' : undefined}>{places(e)}</p>
    </div>
  );
}

function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    setError(null);
    api<T>(path).then(setData, setError);
  }, [path, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}

export function EventsPage() {
  const { data, error } = useApi<{ events: EventPayload[] }>('/events');
  if (error?.status === 401) return <Navigate to="/login" replace />;
  return (
    <main>
      <h1>Events</h1>
      {error ? (
        <p role="alert">{error.message}</p>
      ) : !data ? (
        <p>Loading events...</p>
      ) : data.events.length === 0 ? (
        <p>No published events yet</p>
      ) : (
        <ul className="cd-grid">
          {data.events.map((e) => (
            <li key={e.id} className="cd-case">
              <div className="disc" aria-hidden="true" />
              <h2>
                <Link to={`/events/${e.id}`}>{e.title}</Link>
              </h2>
              <p className="muted">{new Date(e.startsAt).toLocaleString()}</p>
              <p className="muted">{e.location}</p>
              <Places e={e} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const registerError = (err: ApiError) =>
  err.status === 403 ? 'You do not have access to this' : err.status === 404 ? 'Not found' : err.message;

export function EventDetailPage() {
  const { user } = useAuth();
  const { data: e, error, reload } = useApi<EventPayload>(`/events/${useParams().id}`);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [lostSession, setLostSession] = useState(false);
  const [burning, setBurning] = useState(false);

  async function register(id: string) {
    setPending(true);
    setResult(null);
    try {
      await api(`/events/${id}/registrations`, { method: 'POST', body: {} });
      setResult({ ok: true, text: 'You are registered for this event.' });
      setBurning(true); // signature moment: the disc spins up like a burn
      play('burn');
      setTimeout(() => setBurning(false), 1500);
      reload();
    } catch (err) {
      if ((err as ApiError).status === 401) setLostSession(true);
      else setResult({ ok: false, text: registerError(err as ApiError) });
    } finally {
      setPending(false);
    }
  }

  if (error?.status === 401 || lostSession) return <Navigate to="/login" replace />;
  if (error) return <main>{error.status === 404 ? <p>Not found</p> : <p role="alert">{error.message}</p>}</main>;
  if (!e) return <main><p>Loading event...</p></main>;
  return (
    <main>
      <h1>{e.title}</h1>
      <div className={burning ? 'props burning' : 'props'}>
        <div className="disc" aria-hidden="true" />
        <div>
          <p>{e.description}</p>
          <p className="muted">{e.location}</p>
          <p className="muted">{new Date(e.startsAt).toLocaleString()}</p>
          <Places e={e} />
          {/* F-04: shown even when Full; the server decides (BR-01). */}
          {user?.role === 'PARTICIPANT' && e.status === 'PUBLISHED' && (
            <button onClick={() => register(e.id)} disabled={pending}>
              {pending ? 'Registering...' : 'Register'}
            </button>
          )}
          {result && (
            <p role={result.ok ? 'status' : 'alert'} data-sound-skip={result.ok ? '' : undefined}>
              {result.text}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
