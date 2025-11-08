/**
 * Global error handling middleware
 */

import type { Context, Next } from 'hono';
import { errorResponse } from '../utils/response';

/**
 * Error handling middleware
 * Catches errors and returns formatted error responses
 */
export async function errorHandler(
  c: Context,
  next: Next
): Promise<Response | void> {
  try {
    await next();
  } catch (error) {
    console.error('Request error:', error);

    const err = error as Error;
    const statusCode = getStatusCode(err);

    return c.json(
      errorResponse(err.message, {
        name: err.name,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      }),
      statusCode
    );
  }
}

/**
 * Determine HTTP status code from error
 */
function getStatusCode(error: Error): number {
  // Check for common error types
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'UnauthorizedError') return 401;
  if (error.name === 'ForbiddenError') return 403;
  if (error.name === 'NotFoundError') return 404;
  if (error.name === 'ConflictError') return 409;

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
