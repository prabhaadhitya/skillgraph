/**
 * Custom error class for API errors with HTTP status, code, and optional details.
 */
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} code - Error code identifier (e.g. 'VALIDATION_ERROR', 'NOT_FOUND')
   * @param {string} message - Human readable message
   * @param {any} [details] - Optional error details
   */
  constructor(status = 500, code = 'INTERNAL_ERROR', message = 'Internal server error', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
