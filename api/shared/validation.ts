/**
 * Input validation utilities for security-critical operations
 */

/**
 * Validates bucket name for path traversal and invalid characters
 */
export function validateBucketName(bucket_name: string): void {
  if (!bucket_name || typeof bucket_name !== 'string') {
    throw new Error('Invalid bucket_name: must be a non-empty string');
  }

  // Check for path traversal attempts
  if (bucket_name.includes('..') || bucket_name.includes('/') || bucket_name.includes('\\')) {
    throw new Error('Invalid bucket_name: path traversal detected');
  }

  // Check for reasonable length (prevent abuse)
  if (bucket_name.length > 255) {
    throw new Error('Invalid bucket_name: exceeds maximum length of 255 characters');
  }

  // Check for valid characters (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(bucket_name)) {
    throw new Error('Invalid bucket_name: must contain only alphanumeric characters, hyphens, and underscores');
  }
}

/**
 * Validates object key for path traversal and invalid characters
 */
export function validateObjectKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid key: must be a non-empty string');
  }

  // Check for path traversal attempts
  if (key.includes('..')) {
    throw new Error('Invalid key: path traversal detected');
  }

  // Check for reasonable length
  if (key.length > 1024) {
    throw new Error('Invalid key: exceeds maximum length of 1024 characters');
  }
}

/**
 * Validates session ID format
 */
export function validateSessionId(session_id: string): void {
  if (!session_id || typeof session_id !== 'string') {
    throw new Error('Invalid session_id: must be a non-empty string');
  }

  // Check for reasonable length
  if (session_id.length > 255) {
    throw new Error('Invalid session_id: exceeds maximum length');
  }
}

/**
 * Validates annotation ID format
 */
export function validateAnnotationId(annotation_id: string): void {
  if (!annotation_id || typeof annotation_id !== 'string') {
    throw new Error('Invalid annotation_id: must be a non-empty string');
  }

  // Check for reasonable length
  if (annotation_id.length > 255) {
    throw new Error('Invalid annotation_id: exceeds maximum length');
  }
}

/**
 * Validates SQL query for basic injection patterns
 * Note: This is a basic check. Use parameterized queries for full protection.
 */
export function validateSQLQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid query: must be a non-empty string');
  }

  // Check for length to prevent abuse
  if (query.length > 10000) {
    throw new Error('Invalid query: exceeds maximum length');
  }

  // Basic check for dangerous SQL patterns
  const dangerousPatterns = [
    /;\s*drop\s+/i,
    /;\s*delete\s+from\s+/i,
    /;\s*truncate\s+/i,
    /;\s*alter\s+/i,
    /;\s*create\s+/i,
    /;\s*exec\s*\(/i,
    /xp_cmdshell/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      throw new Error('Invalid query: potentially dangerous SQL detected');
    }
  }
}

/**
 * Validates database ID format
 */
export function validateDatabaseId(database_id: string): void {
  if (!database_id || typeof database_id !== 'string') {
    throw new Error('Invalid database_id: must be a non-empty string');
  }

  // Check for path traversal
  if (database_id.includes('..') || database_id.includes('/') || database_id.includes('\\')) {
    throw new Error('Invalid database_id: path traversal detected');
  }

  // Check for reasonable length
  if (database_id.length > 255) {
    throw new Error('Invalid database_id: exceeds maximum length');
  }
}

/**
 * Validates content length to prevent abuse
 */
export function validateContentLength(content: string, maxLength: number = 10 * 1024 * 1024): void {
  if (typeof content !== 'string') {
    throw new Error('Invalid content: must be a string');
  }

  if (content.length > maxLength) {
    throw new Error(`Invalid content: exceeds maximum length of ${maxLength} bytes`);
  }
}

/**
 * Sanitizes error messages for production
 */
export function sanitizeError(error: any, context: string): Error {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // In development, show full error details
    return new Error(`${context}: ${error?.message || 'Unknown error'}`);
  } else {
    // In production, show generic error without exposing internal details
    console.error(`[Error] ${context}:`, error);
    return new Error(context);
  }
}
