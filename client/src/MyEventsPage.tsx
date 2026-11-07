import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { api, ApiError } from './api';

type EventPayload = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  capacity: number;
  remainingPlaces: number;
  status: 'DRAFT' | 'PUBLISHED';
};

export function MyEventsPage() {
  const saved = (useLocation().state as { saved?: string } | null)?.saved;
  const [events, setEvents] = useState<EventPayload[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

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

  async function publish(id: string) {
    setPublishing(id);
    setPublishError(null);
    try {
      await api(`/events/${id}/publish`, { method: 'POST', body: {} });
      await load();
    } catch (err) {
      setPublishError(`Publish failed: ${(err as ApiError).message}`);
    } finally {
      setPublishing(null);
    }
  }

  if (error?.status === 401) return <Navigate to="/login" replace />;

  return (
    <main>
      <h1>My events</h1>
      <Link to="/organizer/events/new">Create event</Link>
      {saved && <p role="status">Draft "{saved}" saved.</p>}
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
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Starts</th>
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
                <td>{e.location}</td>
                <td>
                  {e.remainingPlaces} of {e.capacity}
                </td>
                <td>{e.status}</td>
                <td>
                  {e.status === 'DRAFT' && (
                    <button onClick={() => publish(e.id)} disabled={publishing === e.id}>
                      {publishing === e.id ? 'Publishing...' : 'Publish'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
