/**
 * Payment-specific error handling middleware
 * Provides comprehensive error handling and logging for payment operations
 * PCI-DSS Compliant - No cardholder data is logged or stored
 */

class PaymentError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class AirwallexError extends PaymentError {
  constructor(message, code, statusCode = 400, airwallexResponse = null) {
    super(message, code, statusCode);
    this.name = 'AirwallexError';
    this.provider = 'Airwallex';
    this.airwallexResponse = airwallexResponse;
  }
}

/**
 * Logger utility for payment operations
 */
class PaymentLogger {
  static log(level, message, data = {}) {
    // PCI-DSS Compliance: Sanitize data to ensure no cardholder data is logged
    const sanitizedData = this.sanitizeLogData(data);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: 'PaymentService',
      message,
      ...sanitizedData
    };

    console.log(`[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.service}] ${message}`, 
      Object.keys(sanitizedData).length > 0 ? sanitizedData : '');
  }

  /**
   * PCI-DSS Compliance: Sanitize log data to prevent cardholder data exposure
   * @param {Object} data - Data to be logged
   * @returns {Object} Sanitized data
   */
  static sanitizeLogData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = [
      'card_number', 'cardNumber', 'card', 'pan',
      'cvv', 'cvc', 'security_code', 'expiry_date',
      'expiry_month', 'expiry_year', 'cardholder_name',
      'client_secret' // Partially sensitive
    ];
    
    const sanitized = { ...data };
    
    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        if (key === 'client_secret') {
          // Show only first 8 characters for client_secret
          sanitized[key] = typeof sanitized[key] === 'string' ? 
            sanitized[key].substring(0, 8) + '...' : '[REDACTED]';
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeLogData(sanitized[key]);
      }
    });
    
    return sanitized;
  }

  static info(message, data = {}) {
    this.log('info', message, data);
  }

  static warn(message, data = {}) {
    this.log('warn', message, data);
  }

  static error(message, error = null, data = {}) {
    const errorData = {
      ...data,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
          statusCode: error.statusCode
        }
      })
    };
    this.log('error', message, errorData);
  }

  static debug(message, data = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      this.log('debug', message, data);
    }
  }
}

/**
 * Error classification utility
 */
class ErrorClassifier {
  static classifyError(error) {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return {
        type: 'NETWORK_ERROR',
        statusCode: 503,
        userMessage: 'Payment service is temporarily unavailable. Please try again later.',
        retryable: true
      };
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        type: 'TIMEOUT_ERROR',
        statusCode: 504,
        userMessage: 'Payment request timed out. Please try again.',
        retryable: true
      };
    }

    // Authentication errors
    if (error.message.includes('authentication') || error.message.includes('unauthorized') || error.statusCode === 401) {
      return {
        type: 'AUTHENTICATION_ERROR',
        statusCode: 500,
        userMessage: 'Payment service configuration error. Please contact support.',
        retryable: false
      };
    }

    // Validation errors
    if (error.statusCode === 400 || error.message.includes('validation') || error.message.includes('invalid')) {
      return {
        type: 'VALIDATION_ERROR',
        statusCode: 400,
        userMessage: error.message || 'Invalid payment data provided.',
        retryable: false
      };
    }

    // Rate limiting
    if (error.statusCode === 429) {
      return {
        type: 'RATE_LIMIT_ERROR',
        statusCode: 429,
        userMessage: 'Too many payment requests. Please wait and try again.',
        retryable: true
      };
    }

    // Payment provider errors
    if (error.name === 'AirwallexError' || error.message.includes('Airwallex')) {
      return {
        type: 'PROVIDER_ERROR',
        statusCode: error.statusCode || 400,
        userMessage: 'Payment processing error. Please try again or contact support.',
        retryable: error.statusCode >= 500
      };
    }

    // Default classification
    return {
      type: 'UNKNOWN_ERROR',
      statusCode: 500,
      userMessage: 'An unexpected error occurred. Please try again later.',
      retryable: true
    };
  }
}

/**
 * Main payment error handling middleware
 */
const paymentErrorHandler = (error, req, res, next) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Classify the error
  const classification = ErrorClassifier.classifyError(error);

  // Log the error with context
  PaymentLogger.error('Payment operation failed', error, {
    requestId: req.headers['x-request-id'] || 'unknown',
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    classification,
    body: req.method === 'POST' ? req.body : undefined
  });

  // Prepare error response
  const errorResponse = {
    error: classification.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    message: classification.userMessage,
    code: classification.type,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || undefined
  };

  // Add retry information for retryable errors
  if (classification.retryable) {
    errorResponse.retryable = true;
    errorResponse.retryAfter = classification.type === 'RATE_LIMIT_ERROR' ? 60 : 5; // seconds
  }

  // Add additional details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      originalError: error.message,
      stack: error.stack,
      details: error.details || null
    };
  }

  // Send error response
  res.status(classification.statusCode).json(errorResponse);
};

/**
 * Request logging middleware for payment operations
 */
const paymentRequestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to headers for tracking
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  PaymentLogger.info('Payment request received', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    PaymentLogger.info('Payment request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      success: res.statusCode < 400
    });

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Async error wrapper for payment route handlers
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Health check for payment service dependencies
 */
const checkPaymentServiceHealth = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check environment variables
    const requiredEnvVars = ['AIRWALLEX_CLIENT_ID', 'AIRWALLEX_API_KEY', 'AIRWALLEX_BASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    health.checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      details: missingEnvVars.length > 0 ? { missingVariables: missingEnvVars } : null
    };

    // Check Airwallex API connectivity (basic ping)
    try {
      const axios = require('axios');
      const response = await axios.get(`${process.env.AIRWALLEX_BASE_URL}/health`, {
        timeout: 5000
      });
      health.checks.airwallex = {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    } catch (error) {
      health.checks.airwallex = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Overall health status
    const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
    health.status = allHealthy ? 'healthy' : 'degraded';

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
  }

  return health;
};

module.exports = {
  PaymentError,
  AirwallexError,
  PaymentLogger,
  ErrorClassifier,
  paymentErrorHandler,
  paymentRequestLogger,
  asyncErrorHandler,
  checkPaymentServiceHealth
};