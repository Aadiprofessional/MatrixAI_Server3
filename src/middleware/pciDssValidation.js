/**
 * PCI-DSS Compliance Validation Middleware
 * Ensures all payment operations comply with PCI-DSS requirements
 */

const { PaymentError, PaymentLogger } = require('./paymentErrorHandler');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * PCI-DSS Rate Limiting for Payment Endpoints
 * Prevents brute force attacks and excessive API calls
 * Relaxed limits to ensure normal operation
 */
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit to 1000 requests per windowMs
  message: {
    error: 'Too many payment requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    PaymentLogger.warn('Payment rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many payment requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict Rate Limiting for Sensitive Operations
 * More restrictive limits for payment intent creation
 * Relaxed for normal operation
 */
const strictPaymentRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Increased from 10 to 100 payment creations per 5 minutes
  message: {
    error: 'Too many payment creation attempts',
    code: 'PAYMENT_CREATION_RATE_LIMIT',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    PaymentLogger.warn('Strict payment rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many payment creation attempts',
      code: 'PAYMENT_CREATION_RATE_LIMIT',
      retryAfter: '5 minutes'
    });
  }
});

/**
 * HTTPS Enforcement Middleware
 * Ensures all payment operations are conducted over HTTPS
 */
const enforceHTTPS = (req, res, next) => {
  // Skip HTTPS check in development environment
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    PaymentLogger.warn('Insecure payment request blocked', {
      ip: req.ip,
      protocol: req.protocol,
      headers: {
        'x-forwarded-proto': req.get('x-forwarded-proto'),
        'user-agent': req.get('User-Agent')
      }
    });

    return res.status(403).json({
      success: false,
      error: 'HTTPS is required for payment operations',
      code: 'HTTPS_REQUIRED'
    });
  }

  next();
};

/**
 * Payment Request Validation Middleware
 * Validates payment request structure and data types
 * Simplified for better compatibility
 */
const validatePaymentRequest = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { amount, currency, uid, plan } = req.body;

    // Validate required fields - only check if they exist, not their values
    if (!amount || !currency || !uid || !plan) {
      throw new PaymentError(
        'Missing required payment fields: amount, currency, uid, plan',
        'MISSING_REQUIRED_FIELDS',
        400
      );
    }

    // Basic amount validation - just check if it's positive
    if (typeof amount !== 'number' || amount <= 0) {
      throw new PaymentError(
        'Invalid amount: must be a positive number',
        'INVALID_AMOUNT',
        400
      );
    }

    // Basic currency format validation
    if (typeof currency !== 'string' || currency.length !== 3) {
      throw new PaymentError(
        'Invalid currency: must be a 3-letter currency code',
        'INVALID_CURRENCY',
        400
      );
    }

    // Skip strict currency validation - let Airwallex handle it
    // This allows for more flexibility in supported currencies

    // Basic UID validation - just check if it's a string
    if (typeof uid !== 'string' || uid.length < 1) {
      throw new PaymentError(
        'Invalid UID: must be a non-empty string',
        'INVALID_UID',
        400
      );
    }

    // Basic plan validation - just check if it's a string
    if (typeof plan !== 'string' || plan.length < 1) {
      throw new PaymentError(
        'Invalid plan: must be a non-empty string',
        'INVALID_PLAN',
        400
      );
    }

    // Sanitize and normalize data
    req.body.amount = Math.round(amount * 100) / 100; // Round to 2 decimal places
    req.body.currency = currency.toUpperCase();
    req.body.uid = uid.trim();
    req.body.plan = plan.trim();

    PaymentLogger.info('Payment request validation passed', {
      requestId,
      amount: req.body.amount,
      currency: req.body.currency,
      uid: req.body.uid,
      plan: req.body.plan
    });

    next();
  } catch (error) {
    PaymentLogger.error('Payment request validation failed', error, { requestId });
    
    if (error instanceof PaymentError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        requestId
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid payment request',
      code: 'VALIDATION_ERROR',
      requestId
    });
  }
};

/**
 * Payment Intent ID Validation Middleware
 * Validates payment intent ID format for status/confirm/cancel operations
 */
const validatePaymentIntentId = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      throw new PaymentError(
        'Payment intent ID is required',
        'MISSING_PAYMENT_INTENT_ID',
        400
      );
    }

    // Validate payment intent ID format (Airwallex format)
    if (!/^[a-zA-Z0-9_-]{10,100}$/.test(paymentIntentId)) {
      throw new PaymentError(
        'Invalid payment intent ID format',
        'INVALID_PAYMENT_INTENT_ID',
        400
      );
    }

    PaymentLogger.info('Payment intent ID validation passed', {
      requestId,
      paymentIntentId
    });

    next();
  } catch (error) {
    PaymentLogger.error('Payment intent ID validation failed', error, { requestId });
    
    if (error instanceof PaymentError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        requestId
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid payment intent ID',
      code: 'VALIDATION_ERROR',
      requestId
    });
  }
};

/**
 * Security Headers Middleware
 * Applies PCI-DSS compliant security headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.airwallex.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://checkout.airwallex.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.airwallex.com", "https://checkout.airwallex.com"],
      frameSrc: ["https://checkout.airwallex.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * Request ID Middleware
 * Ensures all payment requests have a unique request ID for tracking
 */
const ensureRequestId = (req, res, next) => {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Add request ID to response headers for client tracking
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  
  next();
};

/**
 * PCI-DSS Compliance Audit Middleware
 * Logs all payment operations for compliance auditing
 */
const auditPaymentOperation = (req, res, next) => {
  const requestId = req.headers['x-request-id'];
  const startTime = Date.now();

  // Log request start
  PaymentLogger.info('Payment operation started', {
    requestId,
    method: req.method,
    endpoint: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    PaymentLogger.info('Payment operation completed', {
      requestId,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      success: data.success !== false,
      timestamp: new Date().toISOString()
    });

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  paymentRateLimit,
  strictPaymentRateLimit,
  enforceHTTPS,
  validatePaymentRequest,
  validatePaymentIntentId,
  securityHeaders,
  ensureRequestId,
  auditPaymentOperation
};