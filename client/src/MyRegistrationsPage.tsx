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
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    api<{ registrations: MyRegistration[] }>('/registrations/mine').then((d) => setList(d.registrations), setError);
  }, []);

  if (error?.status === 401) return <Navigate to="/login" replace />;
  return (
    <main>
      <h1>My registrations</h1>
      {error ? (
        <p role="alert">{error.status === 403 ? 'You do not have access to this' : error.message}</p>
      ) : !list ? (
        <p>Loading...</p>
      ) : list.length === 0 ? (
        <p>You have no registrations yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Starts</th>
              <th>Location</th>
              <th>Status</th>
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
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
