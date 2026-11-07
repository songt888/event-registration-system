import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { CreateEventPage } from './CreateEventPage';
import { EventRegistrationsPage } from './EventRegistrationsPage';
import { EventDetailPage, EventsPage } from './EventsPage';
import { MyEventsPage } from './MyEventsPage';
import { Layout } from './Layout';
import { LoginPage } from './LoginPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/organizer/events" element={<MyEventsPage />} />
            <Route path="/organizer/events/new" element={<CreateEventPage />} />
            <Route path="/organizer/events/:id/registrations" element={<EventRegistrationsPage />} />
            <Route path="*" element={<main><p>Not found</p></main>} />
          </Route>
          <Route path="/" element={<Navigate to="/events" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
