import { useEffect, useState } from 'react';

export function App() {
  const [api, setApi] = useState('checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body: { status: string }) => setApi(body.status))
      .catch(() => setApi('unreachable'));
  }, []);

  return (
    <main>
      <h1>Event Registration</h1>
      <p>API: {api}</p>
    </main>
  );
}
