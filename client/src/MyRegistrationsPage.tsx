import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, ApiError } from './api';

type MyRegistration = {
  id: string;
  status: string;
  createdAt: string;
  event: { id: string; title: string; location: string; startsAt: string };
};

// F-05 screen: shows what GET /api/registrations/mine returns; the API decides ownership (BR-05).
export function MyRegistrationsPage() {
  const [list, setList] = useState<MyRegistration[] | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<ApiError | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    api<{ registrations: MyRegistration[] }>('/registrations/mine').then((d) => setList(d.registrations), setError);
  }, []);

  async function cancel(id: string) {
    setCancelling(true);
    setCancelError(null);
    try {
      const { registration } = await api<{ registration: MyRegistration }>(
        `/registrations/${id}/cancel`, { method: 'POST', body: {} },
      );
      setList((current) => current?.map((row) => row.id === id ? registration : row) ?? null);
      const refreshed = await api<{ registrations: MyRegistration[] }>('/registrations/mine');
      setList(refreshed.registrations);
    } catch (err) {
      if (err instanceof ApiError) setCancelError(err);
      else setCancelError(new ApiError(0, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    } finally {
      setCancelling(false);
    }
  }

  if (cancelError?.status === 401 || error?.status === 401) return <Navigate to="/login" replace />;
  return (
    <main>
      <h1>My registrations</h1>
      {cancelError && <p role="alert">{cancelError.message}</p>}
      {error ? (
        <p role="alert">{error.status === 403 ? 'You do not have access to this' : error.message}</p>
      ) : !list ? (
        <p>Loading...</p>
      ) : list.length === 0 ? (
        <p>You have no registrations yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Starts</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/events/${r.event.id}`}>{r.event.title}</Link>
                  </td>
                  <td>{new Date(r.event.startsAt).toLocaleString()}</td>
                  <td>{r.event.location}</td>
                  <td><span className={`led led-${r.status.toLowerCase()}`}>{r.status}</span></td>
                  <td>
                    {r.status === 'ACTIVE' && (
                      <button type="button" disabled={cancelling} onClick={() => void cancel(r.id)}>Cancel</button>
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
