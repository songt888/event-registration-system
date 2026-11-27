import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from './api';
import type { EventPayload } from './MyEventsPage';

const FIELDS = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'startsAt', label: 'Starts at (your local time)', type: 'datetime-local' },
  { name: 'capacity', label: 'Capacity', type: 'number' },
] as const;

type Form = Record<(typeof FIELDS)[number]['name'], string>;

const EMPTY: Form = { title: '', description: '', location: '', startsAt: '', capacity: '' };

// datetime-local shows local time without a zone.
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// F-02 create at /organizer/events/new; F-08 edit at /organizer/events/:id/edit.
export function CreateEventPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [initial, setInitial] = useState<Form | null>(id ? null : EMPTY);
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    api<EventPayload>(`/events/${id}`).then(
      (e) => {
        const loaded = { ...e, startsAt: toLocalInput(e.startsAt), capacity: String(e.capacity) };
        setInitial(loaded);
        setForm(loaded);
      },
      (err: ApiError) => setError(err.message),
    );
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !initial) return;
    setError(null);
    // AC-70: an empty Capacity would be sent as 0; say it is required instead (the API rule is unchanged).
    if (form.capacity.trim() === '') return setFieldErrors({ capacity: 'Capacity is required.' });
    setSubmitting(true);
    setFieldErrors({});
    const body = {
      ...form,
      // datetime-local is the browser's local time; toISOString sends that instant in UTC with a zone.
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
      capacity: Number(form.capacity),
    };
    try {
      if (id) {
        // F-08: only the changed fields are sent.
        const changed = Object.fromEntries(FIELDS.filter(({ name }) => form[name] !== initial[name]).map(({ name }) => [name, body[name]]));
        await api(`/events/${id}`, { method: 'PATCH', body: changed });
      } else {
        await api('/events', { method: 'POST', body });
      }
      navigate('/organizer/events', { state: { saved: form.title, edited: !!id } });
    } catch (err) {
      const apiErr = err as ApiError;
      setFieldErrors(Object.fromEntries((apiErr.details ?? []).map((d) => [d.field, d.message])));
      setError(apiErr.message);
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>{id ? 'Edit event' : 'Create event'}</h1>
      {id && !initial && !error && <p>Loading event...</p>}
      <form onSubmit={onSubmit} noValidate>
        {FIELDS.map(({ name, label, type }) => {
          const fieldError = fieldErrors[name];
          const errorId = `${name}-error`;
          const errorAttributes = {
            'aria-invalid': fieldError ? true : undefined,
            'aria-describedby': fieldError ? errorId : undefined,
          };
          return (
            <div key={name}>
              <label htmlFor={name}>{label}</label>
              {type === 'textarea' ? (
                <textarea id={name} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} {...errorAttributes} />
              ) : (
                <input id={name} type={type} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} {...errorAttributes} />
              )}
              {fieldError && <p id={errorId} role="alert">{fieldError}</p>}
            </div>
          );
        })}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting || !initial}>
          {submitting ? 'Saving...' : id ? 'Save' : 'Save draft'}
        </button>
      </form>
    </main>
  );
}
