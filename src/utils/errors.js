class BaseError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class StorageError extends BaseError {
  constructor(message, details = {}) {
    super(message, 503);
    this.details = details;
  }
}

class RateLimitError extends BaseError {
  constructor(message) {
    super(message, 429);
  }
}

class ValidationError extends BaseError {
  constructor(message, details = {}) {
    super(message, 400);
    this.details = details;
  }
}

class RenderingError extends BaseError {
  constructor(message, details = {}) {
    super(message, 500);
    this.details = details;
  }
}

module.exports = {
  BaseError,
  StorageError,
  RateLimitError,
  ValidationError,
  RenderingError
}; 