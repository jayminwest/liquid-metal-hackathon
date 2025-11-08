/**
 * API response types
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}
