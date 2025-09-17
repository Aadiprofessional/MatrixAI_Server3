const express = require('express');
const {
  createPaymentIntent,
  getPaymentStatus,
  confirmPaymentIntent,
  cancelPaymentIntent,
  getPaymentMethods
} = require('../controllers/paymentController');
const {
  paymentRequestLogger,
  paymentErrorHandler,
  asyncErrorHandler,
  checkPaymentServiceHealth
} = require('../middleware/paymentErrorHandler');
const {
  paymentRateLimit,
  strictPaymentRateLimit,
  enforceHTTPS,
  validatePaymentRequest,
  validatePaymentIntentId,
  securityHeaders,
  ensureRequestId,
  auditPaymentOperation
} = require('../middleware/pciDssValidation');

const router = express.Router();

// Apply essential security middleware (simplified for compatibility)
router.use(ensureRequestId);
router.use(paymentRequestLogger);

// Apply rate limiting only in production
if (process.env.NODE_ENV === 'production') {
  router.use(paymentRateLimit);
}

// Airwallex Payment Routes - PCI-DSS SAQ A Compliant
// This implementation uses hosted payment pages and does not handle cardholder data

/**
 * @route   POST /api/payment/airwallex/create-intent
 * @desc    Create a new payment intent with Airwallex
 * @access  Public
 * @body    {
 *            amount: number (required),
 *            currency: string (required, 3-letter ISO code),
 *            merchant_order_id?: string,
 *            order?: object,
 *            descriptor?: string,
 *            metadata?: object,
 *            return_url?: string,
 *            payment_method_options?: object
 *          }
 * @returns {
 *            success: boolean,
 *            message: string,
 *            data: {
 *              id: string,
 *              amount: number,
 *              currency: string,
 *              status: string,
 *              client_secret: string,
 *              created_at: string,
 *              updated_at: string,
 *              merchant_order_id?: string,
 *              next_action?: object
 *            }
 *          }
 */
router.post('/airwallex/create-intent', 
  process.env.NODE_ENV === 'production' ? strictPaymentRateLimit : (req, res, next) => next(),
  validatePaymentRequest,
  asyncErrorHandler(createPaymentIntent)
);

/**
 * @route   GET /api/payment/airwallex/status/:paymentIntentId
 * @desc    Get payment intent status from Airwallex
 * @access  Public
 * @param   paymentIntentId - The payment intent ID (format: int_xxxxx)
 * @returns {
 *            success: boolean,
 *            message: string,
 *            data: {
 *              id: string,
 *              status: string,
 *              amount: number,
 *              currency: string,
 *              created_at: string,
 *              updated_at: string,
 *              merchant_order_id?: string,
 *              latest_payment_attempt?: object,
 *              next_action?: object,
 *              available_payment_method_types?: array
 *            }
 *          }
 */
router.get('/airwallex/status/:paymentIntentId', 
  asyncErrorHandler(getPaymentStatus)
);

/**
 * @route   POST /api/payment/airwallex/confirm/:paymentIntentId
 * @desc    Confirm a payment intent
 * @access  Public
 * @param   paymentIntentId - The payment intent ID
 * @body    Confirmation data (varies by payment method)
 * @returns {
 *            success: boolean,
 *            message: string,
 *            data: object
 *          }
 */
router.post('/airwallex/confirm/:paymentIntentId', 
  asyncErrorHandler(confirmPaymentIntent)
);

/**
 * @route   POST /api/payment/airwallex/cancel/:paymentIntentId
 * @desc    Cancel a payment intent
 * @access  Public
 * @param   paymentIntentId - The payment intent ID
 * @body    {
 *            cancellation_reason?: string (default: 'requested_by_customer')
 *          }
 * @returns {
 *            success: boolean,
 *            message: string,
 *            data: object
 *          }
 */
router.post('/airwallex/cancel/:paymentIntentId', 
  asyncErrorHandler(cancelPaymentIntent)
);

/**
 * @route   GET /api/payment/airwallex/payment-methods
 * @desc    Get available payment methods
 * @access  Public
 * @query   Various filter parameters (optional)
 * @returns {
 *            success: boolean,
 *            message: string,
 *            data: object
 *          }
 */
router.get('/airwallex/payment-methods', asyncErrorHandler(getPaymentMethods));

// Health check endpoint for payment service
router.get('/health', asyncErrorHandler(async (req, res) => {
  const health = await checkPaymentServiceHealth();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503;
  res.status(statusCode).json({
    ...health,
    service: 'payment-service',
    version: '1.0.0'
  });
}));

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    service: 'MatrixAI Payment API',
    provider: 'Airwallex',
    version: '1.0.0',
    description: 'Payment processing API with Airwallex integration',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    endpoints: [
      {
        method: 'POST',
        path: '/api/payment/airwallex/create-intent',
        description: 'Create a new payment intent',
        requiredFields: ['amount', 'currency'],
        optionalFields: ['merchant_order_id', 'order', 'descriptor', 'metadata', 'return_url', 'payment_method_options']
      },
      {
        method: 'GET',
        path: '/api/payment/airwallex/status/:paymentIntentId',
        description: 'Get payment intent status',
        parameters: ['paymentIntentId']
      },
      {
        method: 'POST',
        path: '/api/payment/airwallex/confirm/:paymentIntentId',
        description: 'Confirm a payment intent',
        parameters: ['paymentIntentId']
      },
      {
        method: 'POST',
        path: '/api/payment/airwallex/cancel/:paymentIntentId',
        description: 'Cancel a payment intent',
        parameters: ['paymentIntentId'],
        optionalFields: ['cancellation_reason']
      },
      {
        method: 'GET',
        path: '/api/payment/airwallex/payment-methods',
        description: 'Get available payment methods'
      }
    ],
    authentication: {
      type: 'Airwallex API Key',
      description: 'Server-side authentication with Airwallex using client credentials'
    },
    errorCodes: {
      'MISSING_REQUIRED_FIELDS': 'Required fields are missing from the request',
      'INVALID_AMOUNT': 'Amount must be greater than 0',
      'INVALID_CURRENCY': 'Currency must be a valid 3-letter ISO code',
      'MISSING_PAYMENT_INTENT_ID': 'Payment intent ID is required',
      'INVALID_PAYMENT_INTENT_ID': 'Invalid payment intent ID format',
      'PAYMENT_INTENT_NOT_FOUND': 'Payment intent not found',
      'AIRWALLEX_API_ERROR': 'Error from Airwallex API',
      'AUTHENTICATION_ERROR': 'Payment service authentication failed',
      'SERVICE_UNAVAILABLE': 'Payment service is temporarily unavailable',
      'INTERNAL_ERROR': 'Internal server error'
    },
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD', 'SGD', 'HKD', 'CNY', 'JPY'],
    documentation: 'https://www.airwallex.com/docs/api'
  });
});

// Apply payment error handler middleware
router.use(paymentErrorHandler);

module.exports = router;