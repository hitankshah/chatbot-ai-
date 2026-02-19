const logger = require('./logger');

class APIError extends Error {
  constructor(message, status = 500, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();

    logger.error('API Error', {
      message,
      status,
      details,
      stack: this.stack,
    });
  }
}

class ValidationError extends APIError {
  constructor(message, details = {}) {
    super(message, 400, details);
  }
}

class AuthenticationError extends APIError {
  constructor(message = 'Authentication failed', details = {}) {
    super(message, 401, details);
  }
}

class AuthorizationError extends APIError {
  constructor(message = 'Access denied', details = {}) {
    super(message, 403, details);
  }
}

class NotFoundError extends APIError {
  constructor(resource = 'Resource', details = {}) {
    super(`${resource} not found`, 404, details);
  }
}

class ConflictError extends APIError {
  constructor(message, details = {}) {
    super(message, 409, details);
  }
}

class RateLimitError extends APIError {
  constructor(message = 'Too many requests', details = {}) {
    super(message, 429, details);
  }
}

class InternalError extends APIError {
  constructor(message = 'Internal server error', details = {}) {
    super(message, 500, details);
  }
}

// Safe error response formatter
function formatErrorResponse(error) {
  if (error instanceof APIError) {
    return {
      error: error.message,
      status: error.status,
      timestamp: error.timestamp,
      ...(process.env.NODE_ENV !== 'production' && { details: error.details }),
    };
  }

  // Unknown error
  logger.error('Unknown error', {
    message: error.message,
    stack: error.stack,
  });

  return {
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
    status: 500,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  formatErrorResponse,
};
