import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

type Detail = { field: string; message: string };

// Known failures carry an HTTP status and an error code (system SDS 4.2).
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Detail[],
  ) {
    super(message);
  }
}

export const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Please sign in.');
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'You do not have access to this.');
export const validationError = (details: Detail[] = []) =>
  new AppError(400, 'VALIDATION_ERROR', 'The request is invalid.', details);

export function zodDetails(err: ZodError): Detail[] {
  return err.issues.flatMap((issue) =>
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => ({ field: key, message: 'Unknown field' }))
      : [{ field: issue.path.join('.') || 'body', message: issue.message }],
  );
}

// Express 4 does not catch rejected promises; this passes them to the error handler.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let appError: AppError;
  if (err instanceof AppError) appError = err;
  else if (err instanceof ZodError) appError = validationError(zodDetails(err));
  else if (err?.type === 'entity.parse.failed') appError = validationError(); // malformed JSON body
  else {
    console.error(err); // server-side only; never sent to the client (NFR-07)
    appError = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  }
  const { status, code, message, details } = appError;
  res.status(status).json({ error: details ? { code, message, details } : { code, message } });
};
