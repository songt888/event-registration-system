import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from './api';

export type EventPayload = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  registrationDeadline: string | null;
  capacity: number;
  remainingPlaces: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED';
};

export function MyEventsPage() {
  const navigate = useNavigate();
  const state = (useLocation().state as { saved?: string; edited?: boolean } | null) ?? {};
  const { saved } = state;
  const [events, setEvents] = useState<EventPayload[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setEvents(null);
    setError(null);
    try {
      setEvents((await api<{ events: EventPayload[] }>('/events/mine')).events);
    } catch (err) {
      setError(err as ApiError);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: 'publish' | 'close' | 'cancel') {
    setPublishing(id);
    setPublishError(null);
    try {
      await api(`/events/${id}/${action}`, { method: 'POST', body: {} });
      if (saved) navigate('.', { replace: true, state: null });
      setConfirming(null);
      await load();
    } catch (err) {
      setPublishError(action === 'publish' ? `Publish failed: ${(err as ApiError).message}` : (err as ApiError).message);
    } finally {
      setPublishing(null);
    }
  }

  const upcoming = (e: EventPayload) => new Date(e.startsAt) > new Date();

  if (error?.status === 401) return <Navigate to="/login" replace />;

  return (
    <main>
      <h1>My events</h1>
      {!error && (
        <Link to="/organizer/events/new" className="button">
          Create event
        </Link>
      )}
      {saved && <p role="status">{state.edited ? `Event "${saved}" saved.` : `Draft "${saved}" saved.`}</p>}
      {publishError && <p role="alert">{publishError}</p>}
      {error ? (
        <div>
          <p role="alert">{error.message}</p>
          <button onClick={load}>Try again</button>
        </div>
      ) : !events ? (
        <p>Loading...</p>
      ) : events.length === 0 ? (
        <p>No events yet</p>
      ) : (
        <div className="table-scroll events-table">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Starts</th>
                {/* F-09, AC-89: the deadline is visible on the page the organizer lands on after create. */}
                <th>Registration deadline</th>
                <th>Location</th>
                <th>Places left</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={`/events/${e.id}`}>{e.title}</Link>
                  </td>
                  <td>{new Date(e.startsAt).toLocaleString()}</td>
                  <td>{e.registrationDeadline ? new Date(e.registrationDeadline).toLocaleString() : ''}</td>
                  <td>{e.location}</td>
                  <td>
                    {e.remainingPlaces} of {e.capacity}
                  </td>
                  <td><span className={`led led-${e.status.toLowerCase()}`}>{e.status}</span></td>
                  <td className="actions">
                    <Link to={`/organizer/events/${e.id}/registrations`}>Registrations</Link>{' '}
                    {(e.status === 'DRAFT' || e.status === 'PUBLISHED') && upcoming(e) && (
                      <Link to={`/organizer/events/${e.id}/edit`}>Edit</Link>
                    )}{' '}
                    {e.status === 'DRAFT' && (
                      <button onClick={() => act(e.id, 'publish')} disabled={publishing === e.id}>
                        {publishing === e.id ? 'Publishing...' : 'Publish'}
                      </button>
                    )}
                    {e.status === 'PUBLISHED' && (
                      <button onClick={() => act(e.id, 'close')} disabled={publishing === e.id}>
                        Close
                      </button>
                    )}{' '}
                    {e.status !== 'CANCELLED' && (
                      <button onClick={() => setConfirming(e.id)} disabled={publishing === e.id}>
                        Cancel event
                      </button>
                    )}
                    {confirming === e.id && (
                      <button onClick={() => act(e.id, 'cancel')} disabled={publishing === e.id}>
                        Confirm cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
