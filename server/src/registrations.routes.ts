import { Router } from 'express';
import { z } from 'zod';
import { requireRole, requireSession } from './auth/middleware.js';
import { jsonBody } from './lib/body.js';
import { asyncHandler, validationError, zodDetails } from './lib/errors.js';
import { listEventRegistrations, registerForEvent } from './registrations.service.js';

const idSchema = z.string().uuid();
const emptyBody = z.object({}).strict();

export const registrationsRouter = Router();

// D-13 order: session (401), role (403), then input (400), then the service.
registrationsRouter.post(
  '/events/:id/registrations',
  requireSession,
  requireRole('PARTICIPANT'),
  jsonBody,
  asyncHandler(async (req, res) => {
    const details = [];
    if (!idSchema.safeParse(req.params.id).success) details.push({ field: 'id', message: 'Invalid event ID' });
    const body = emptyBody.safeParse(req.body);
    if (!body.success) details.push(...zodDetails(body.error));
    if (details.length) throw validationError(details);

    res.status(201).json(await registerForEvent(res.locals.user.id, req.params.id, new Date()));
  }),
);

registrationsRouter.get(
  '/events/:id/registrations',
  requireSession,
  requireRole('ORGANIZER'),
  asyncHandler(async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) throw validationError([{ field: 'id', message: 'Invalid event ID' }]);
    res.json(await listEventRegistrations(res.locals.user.id, req.params.id));
  }),
);
