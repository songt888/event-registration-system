import { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { api, ApiError } from './api';
import type { EventPayload } from './MyEventsPage';

type Row = { id: string; status: string; createdAt: string; checkedInAt: string | null; participant: { name: string; email: string } };

export function EventRegistrationsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventPayload | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<ApiError | null>(null);

  const load = useCallback(
    () =>
      // AC-69: wait for both answers; the registrations request decides access, so its error wins over the event's 404.
      Promise.allSettled([api<EventPayload>(`/events/${id}`), api<{ registrations: Row[] }>(`/events/${id}/registrations`)]).then(
        ([e, r]) => {
          if (r.status === 'rejected') return setError(r.reason as ApiError);
          if (e.status === 'rejected') return setError(e.reason as ApiError);
          setEvent(e.value);
          setRows(r.value.registrations);
        },
      ),
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  // F-10: the button shows whatever the time; the API decides the D-36 window and its message is shown.
  async function checkIn(registrationId: string) {
    setPending(registrationId);
    setCheckInError(null);
    try {
      await api(`/registrations/${registrationId}/check-in`, { method: 'POST', body: {} });
      await load();
    } catch (err) {
      setCheckInError(err instanceof ApiError ? err : new ApiError(0, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    } finally {
      setPending(null);
    }
  }

  if (error?.status === 401 || checkInError?.status === 401) return <Navigate to="/login" replace />;
  if (error?.status === 404) return <main><p>Not found</p></main>;
  if (error) return <main><p role="alert">{error.status === 403 ? 'You do not have access to this' : error.message}</p></main>;
  if (!event || !rows) return <main><p>Loading...</p></main>;

  return (
    <main>
      <h1>
        {event.title}: {rows.length} registrations
      </h1>
      {checkInError && <p role="alert">{checkInError.message}</p>}
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
              <th>Check-in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.participant.name}</td>
                <td>{r.participant.email}</td>
                <td><span className={`led led-${r.status.toLowerCase()}`}>{r.status}</span></td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  {r.checkedInAt ? (
                    <>Checked in {new Date(r.checkedInAt).toLocaleString()}</>
                  ) : (
                    r.status === 'ACTIVE' && (
                      <button type="button" disabled={pending === r.id} onClick={() => void checkIn(r.id)}>
                        Check in
                      </button>
                    )
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
