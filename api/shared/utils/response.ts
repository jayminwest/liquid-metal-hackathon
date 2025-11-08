/**
 * Response formatting utilities
 */

import type { ApiResponse, ErrorResponse, SuccessResponse } from '../types/api';

/**
 * Create success response
 * @param data - Response data
 * @returns Formatted success response
 */
export function successResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create error response
 * @param error - Error message or Error object
 * @param details - Optional error details
 * @returns Formatted error response
 */
export function errorResponse(error: string | Error, details?: any): ErrorResponse {
  const message = typeof error === 'string' ? error : error.message;
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };
}

/**
 * Create generic API response
 * @param success - Success status
 * @param data - Response data (for success)
 * @param error - Error message (for failure)
 * @returns Formatted API response
 */
export function apiResponse<T>(
  success: boolean,
  data?: T,
  error?: string
): ApiResponse<T> {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Wrap async function with error handling
 * @param fn - Async function to wrap
 * @returns Wrapped function that returns ApiResponse
 */
export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<ApiResponse<T>> {
  return async (...args: Args): Promise<ApiResponse<T>> => {
    try {
      const data = await fn(...args);
      return successResponse(data);
    } catch (error) {
      return errorResponse(error as Error);
    }
  };
}
