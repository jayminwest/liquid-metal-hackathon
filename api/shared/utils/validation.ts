/**
 * Input validation utilities
 */

/**
 * Validate userId format
 * @param userId - User identifier to validate
 * @returns true if valid, false otherwise
 */
export function isValidUserId(userId: string | undefined | null): userId is string {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  // Must be non-empty, alphanumeric + hyphens/underscores
  return /^[a-zA-Z0-9_-]+$/.test(userId) && userId.length > 0 && userId.length <= 100;
}

/**
 * Validate session ID format
 * @param sessionId - Session identifier to validate
 * @returns true if valid, false otherwise
 */
export function isValidSessionId(sessionId: string | undefined | null): sessionId is string {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  return sessionId.length > 0 && sessionId.length <= 200;
}

/**
 * Validate bucket name format
 * @param bucketName - Bucket name to validate
 * @returns true if valid, false otherwise
 */
export function isValidBucketName(bucketName: string | undefined | null): bucketName is string {
  if (!bucketName || typeof bucketName !== 'string') {
    return false;
  }
  // Bucket names: lowercase, alphanumeric + hyphens
  return /^[a-z0-9-]+$/.test(bucketName) && bucketName.length > 0 && bucketName.length <= 100;
}

/**
 * Validate annotation ID format
 * @param annotationId - Annotation ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidAnnotationId(annotationId: string | undefined | null): annotationId is string {
  if (!annotationId || typeof annotationId !== 'string') {
    return false;
  }
  return annotationId.length > 0 && annotationId.length <= 500;
}

/**
 * Validate object key format
 * @param key - Object key to validate
 * @returns true if valid, false otherwise
 */
export function isValidObjectKey(key: string | undefined | null): key is string {
  if (!key || typeof key !== 'string') {
    return false;
  }
  // Keys can contain most characters, but not be empty
  return key.length > 0 && key.length <= 1000;
}

/**
 * Sanitize string input
 * @param input - String to sanitize
 * @param maxLength - Maximum length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input.trim().slice(0, maxLength);
}

/**
 * Validate required fields in object
 * @param obj - Object to validate
 * @param requiredFields - List of required field names
 * @returns Error message or null if valid
 */
export function validateRequiredFields(obj: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}
