import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api, ApiError } from './api';
import type { EventPayload } from './MyEventsPage';

const places = (e: EventPayload) => (e.remainingPlaces === 0 ? 'Full' : `${e.remainingPlaces} of ${e.capacity} places left`);

function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    setData(null);
    setError(null);
    api<T>(path).then(setData, setError);
  }, [path]);
  return { data, error };
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

export function EventDetailPage() {
  const { data: e, error } = useApi<EventPayload>(`/events/${useParams().id}`);
  if (error?.status === 401) return <Navigate to="/login" replace />;
  if (error) return <main>{error.status === 404 ? <p>Not found</p> : <p role="alert">{error.message}</p>}</main>;
  if (!e) return <main><p>Loading event...</p></main>;
  return (
    <main>
      <h1>{e.title}</h1>
      <p>{e.description}</p>
      <p>{e.location}</p>
      <p>{new Date(e.startsAt).toLocaleString()}</p>
      <p>{places(e)}</p>
    </main>
  );
}
