import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from './api';

const FIELDS = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'startsAt', label: 'Starts at (your local time)', type: 'datetime-local' },
  { name: 'capacity', label: 'Capacity', type: 'number' },
] as const;

type Form = Record<(typeof FIELDS)[number]['name'], string>;

export function CreateEventPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>({ title: '', description: '', location: '', startsAt: '', capacity: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await api('/events', {
        method: 'POST',
        body: {
          ...form,
          // datetime-local is the browser's local time; toISOString sends that instant in UTC with a zone.
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
          capacity: Number(form.capacity),
        },
      });
      navigate('/organizer/events', { state: { saved: form.title } });
    } catch (err) {
      const apiErr = err as ApiError;
      setFieldErrors(Object.fromEntries((apiErr.details ?? []).map((d) => [d.field, d.message])));
      setError(apiErr.message);
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Create event</h1>
      <form onSubmit={onSubmit} noValidate>
        {FIELDS.map(({ name, label, type }) => (
          <div key={name}>
            <label htmlFor={name}>{label}</label>
            {type === 'textarea' ? (
              <textarea id={name} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
            ) : (
              <input id={name} type={type} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
            )}
            {fieldErrors[name] && <p role="alert">{fieldErrors[name]}</p>}
          </div>
        ))}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save draft'}
        </button>
      </form>
    </main>
  );
}
