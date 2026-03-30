/**
 * Custom sanitization middleware for Express 5 compatibility
 * Prevents NoSQL injection attacks
 */

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    // Remove MongoDB operators and special characters
    return value.replace(/[${}]/g, '');
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    const sanitized = {};
    for (const key in value) {
      // Skip MongoDB operators
      if (key.startsWith('$')) continue;
      sanitized[key] = sanitizeValue(value[key]);
    }
    return sanitized;
  }
  return value;
};

const sanitizeMiddleware = (req, res, next) => {
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize params
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }

  next();
};

module.exports = sanitizeMiddleware;
