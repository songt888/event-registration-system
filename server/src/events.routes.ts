import { Router } from 'express';
import { z } from 'zod';
import { requireRole, requireSession } from './auth/middleware.js';
import { jsonBody } from './lib/body.js';
import { asyncHandler, validationError, zodDetails } from './lib/errors.js';
import { prisma } from './lib/prisma.js';
import {
  cancelEvent,
  closeEvent,
  createEvent,
  editEvent,
  getEvent,
  listMyEvents,
  listPublishedEvents,
  parseCreateEvent,
  parseEditEvent,
  publishEvent,
} from './events.service.js';

const idSchema = z.string().uuid();
const emptySchema = z.object({}).strict();

function parseEmpty(body: unknown) {
  const result = emptySchema.safeParse(body);
  if (!result.success) throw validationError(zodDetails(result.error));
}

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

eventsRouter.get(
  '/events',
  requireSession,
  asyncHandler(async (_req, res) => {
    res.json({ events: await listPublishedEvents(prisma) });
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
    parseEmpty(req.body);
    res.json(await publishEvent(prisma, res.locals.user.id, id, new Date()));
  }),
);

eventsRouter.patch(
  '/events/:id',
  organizer,
  jsonBody,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    res.json(await editEvent(prisma, res.locals.user.id, id, parseEditEvent(req.body), new Date()));
  }),
);

eventsRouter.post(
  '/events/:id/close',
  organizer,
  jsonBody,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    parseEmpty(req.body);
    res.json(await closeEvent(prisma, res.locals.user.id, id));
  }),
);

eventsRouter.post(
  '/events/:id/cancel',
  organizer,
  jsonBody,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    parseEmpty(req.body);
    res.json(await cancelEvent(prisma, res.locals.user.id, id, new Date()));
  }),
);
