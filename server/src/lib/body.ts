import express, { type RequestHandler } from 'express';
import { validationError } from './errors.js';

// State-changing requests accept only JSON objects (system SDS 4.1). Mounted per route, after the session guard,
// so a request without a valid session gets 401 before its body is checked.
const requireJsonType: RequestHandler = (req, _res, next) => {
  next(req.is('application/json') ? undefined : validationError([{ field: 'body', message: 'Content-Type must be application/json' }]));
};

export const jsonBody: RequestHandler[] = [requireJsonType, express.json({ strict: true })];
