import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api, ApiError } from './api';
import { useAuth } from './auth';
import type { EventPayload } from './MyEventsPage';

const places = (e: EventPayload) => (e.remainingPlaces === 0 ? 'Full' : `${e.remainingPlaces} of ${e.capacity} places left`);

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
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Starts</th>
              <th>Location</th>
              <th>Places</th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link to={`/events/${e.id}`}>{e.title}</Link>
                </td>
                <td>{new Date(e.startsAt).toLocaleString()}</td>
                <td>{e.location}</td>
                <td>{places(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

  async function register(id: string) {
    setPending(true);
    setResult(null);
    try {
      await api(`/events/${id}/registrations`, { method: 'POST', body: {} });
      setResult({ ok: true, text: 'You are registered for this event.' });
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
      <p>{e.description}</p>
      <p>{e.location}</p>
      <p>{new Date(e.startsAt).toLocaleString()}</p>
      <p>{places(e)}</p>
      {/* F-04: shown even when Full; the server decides (BR-01). */}
      {user?.role === 'PARTICIPANT' && e.status === 'PUBLISHED' && (
        <button onClick={() => register(e.id)} disabled={pending}>
          {pending ? 'Registering...' : 'Register'}
        </button>
      )}
      {result && <p role={result.ok ? 'status' : 'alert'}>{result.text}</p>}
    </main>
  );
}
