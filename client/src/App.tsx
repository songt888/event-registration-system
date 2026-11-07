import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { Layout } from './Layout';
import { LoginPage } from './LoginPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            {/* Event screens arrive with F-02 and F-03. */}
            <Route path="/events" element={<main><h1>Events</h1></main>} />
            <Route path="*" element={<main><p>Not found</p></main>} />
          </Route>
          <Route path="/" element={<Navigate to="/events" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
