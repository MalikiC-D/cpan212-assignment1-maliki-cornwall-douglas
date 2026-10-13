import { HttpError } from '../lib/http-error.js';

// Every error response has the shape { error: { message, details? } }.
// Planned errors (HttpError) keep their status and message. Anything else is
// logged here and the client only sees a generic 500, never a stack trace.
// Express needs all four parameters to treat this as an error handler.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    const error = { message: err.message };
    if (err.status === 400 && err.details !== undefined) error.details = err.details;
    return res.status(err.status).json({ error });
  }

  console.error(err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
}
