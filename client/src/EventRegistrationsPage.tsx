import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { api, ApiError } from './api';
import type { EventPayload } from './MyEventsPage';

type Row = { id: string; status: string; createdAt: string; participant: { name: string; email: string } };

export function EventRegistrationsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventPayload | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    Promise.all([api<EventPayload>(`/events/${id}`), api<{ registrations: Row[] }>(`/events/${id}/registrations`)])
      .then(([e, r]) => {
        setEvent(e);
        setRows(r.registrations);
      })
      .catch((err) => setError(err as ApiError));
  }, [id]);

  if (error?.status === 401) return <Navigate to="/login" replace />;
  if (error?.status === 404) return <main><p>Not found</p></main>;
  if (error) return <main><p role="alert">{error.status === 403 ? 'You do not have access to this' : error.message}</p></main>;
  if (!event || !rows) return <main><p>Loading...</p></main>;

  return (
    <main>
      <h1>
        {event.title}: {rows.length} registrations
      </h1>
      {rows.length === 0 ? (
        <p>No registrations yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Registered at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.participant.name}</td>
                <td>{r.participant.email}</td>
                <td><span className={`led led-${r.status.toLowerCase()}`}>{r.status}</span></td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
