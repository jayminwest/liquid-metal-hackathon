/**
 * User context extraction middleware
 * Extracts userId from X-User-ID header or ?userId query parameter
 */

import type { Context, Next } from 'hono';
import type { AppContext } from '../types/context';
import { isValidUserId } from '../utils/validation';
import { errorResponse } from '../utils/response';

/**
 * User context middleware
 * Extracts userId from request and adds to context.user
 */
export async function userContext(
  c: Context<AppContext>,
  next: Next
): Promise<Response | void> {
  // Try to get userId from header first
  let userId = c.req.header('X-User-ID');

  // Fall back to query parameter
  if (!userId) {
    userId = c.req.query('userId');
  }

  // Validate userId
  if (!isValidUserId(userId)) {
    return c.json(errorResponse('Missing or invalid userId. Provide X-User-ID header or ?userId query parameter'), 400);
  }

  // Add userId to context
  c.set('user', { userId });

  await next();
}

/**
 * Optional user context middleware
 * Extracts userId if present, but doesn't require it
 */
export async function optionalUserContext(
  c: Context<AppContext>,
  next: Next
): Promise<void> {
  // Try to get userId from header or query
  let userId = c.req.header('X-User-ID') || c.req.query('userId');

  // If valid, add to context
  if (userId && isValidUserId(userId)) {
    c.set('user', { userId });
  }

  await next();
}
