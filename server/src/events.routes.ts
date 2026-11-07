import { Router } from 'express';
import { z } from 'zod';
import { requireRole, requireSession } from './auth/middleware.js';
import { jsonBody } from './lib/body.js';
import { asyncHandler, validationError, zodDetails } from './lib/errors.js';
import { prisma } from './lib/prisma.js';
import { createEvent, getEvent, listMyEvents, parseCreateEvent, publishEvent } from './events.service.js';

const idSchema = z.string().uuid();
const publishSchema = z.object({}).strict();

function parseId(id: string) {
  if (!idSchema.safeParse(id).success) throw validationError([{ field: 'id', message: 'Invalid event ID' }]);
  return id;
}

const organizer = [requireSession, requireRole('ORGANIZER')];

export const eventsRouter = Router();

eventsRouter.post(
  '/events',
  organizer,
  jsonBody,
  asyncHandler(async (req, res) => {
    const input = parseCreateEvent(req.body);
    res.status(201).json(await createEvent(prisma, res.locals.user.id, input, new Date()));
  }),
);

// Declared before /events/:id so "mine" is never read as an ID.
eventsRouter.get(
  '/events/mine',
  organizer,
  asyncHandler(async (_req, res) => {
    res.json({ events: await listMyEvents(prisma, res.locals.user.id) });
  }),
);

eventsRouter.get(
  '/events/:id',
  requireSession,
  asyncHandler(async (req, res) => {
    res.json(await getEvent(prisma, res.locals.user.id, parseId(req.params.id)));
  }),
);

eventsRouter.post(
  '/events/:id/publish',
  organizer,
  jsonBody,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const body = publishSchema.safeParse(req.body);
    if (!body.success) throw validationError(zodDetails(body.error));
    res.json(await publishEvent(prisma, res.locals.user.id, id, new Date()));
  }),
);
