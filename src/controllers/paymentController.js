const airwallexService = require('../services/airwallexService');
const { PaymentError, AirwallexError, PaymentLogger } = require('../middleware/paymentErrorHandler');
const PaymentMetadataService = require('../services/paymentMetadataService');
const axios = require('axios');

/**
 * Create a payment intent with Airwallex
 * POST /api/payment/airwallex/create-intent
 */
const createPaymentIntent = async (req, res) => {
  const requestId = req.headers['x-request-id'];
  
  try {
    PaymentLogger.info('Creating payment intent', { requestId, body: req.body });

    const {
      amount,
      currency,
      uid,
      plan,
      merchant_order_id,
      order,
      descriptor,
      metadata,
      return_url,
      payment_method_options
    } = req.body;

    // Validate required fields
    if (!amount || !currency || !uid || !plan) {
      throw new PaymentError(
        'Amount, currency, uid, and plan are required fields',
        'MISSING_REQUIRED_FIELDS',
        400
      );
    }

    // Validate amount is positive
    if (amount <= 0) {
      throw new PaymentError(
        'Amount must be greater than 0',
        'INVALID_AMOUNT',
        400
      );
    }

    // Validate currency format (3-letter ISO code)
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new PaymentError(
        'Currency must be a valid 3-letter ISO code (e.g., USD, EUR, SGD)',
        'INVALID_CURRENCY',
        400
      );
    }

    // Generate order ID for tracking
    const orderId = merchant_order_id || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare enhanced metadata with subscription details
    const enhancedMetadata = {
      uid,
      plan,
      totalPrice: amount,
      orderId,
      paymentMethod: 'airwallex',
      ...(metadata && metadata)
    };

    // Prepare payment intent data
    const paymentIntentData = {
      amount,
      currency,
      request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      merchant_order_id: orderId,
      metadata: enhancedMetadata,
      ...(order && { order }),
      ...(descriptor && { descriptor }),
      ...(return_url && { return_url }),
      ...(payment_method_options && { payment_method_options })
    };

    // Create payment intent via Airwallex service
    const paymentIntent = await airwallexService.createPaymentIntent(paymentIntentData);

    PaymentLogger.info('Payment intent created successfully', {
      requestId,
      paymentIntentId: paymentIntent.id,
      amount,
      currency
    });

    // Store payment metadata in database for later use when payment status is checked
    const paymentMetadata = {
      uid,
      plan,
      totalPrice: parseFloat(amount),
      orderId,
      paymentMethod: 'airwallex',
      requestId
    };
    
    try {
      await PaymentMetadataService.storePaymentMetadata(paymentIntent.id, paymentMetadata);
      PaymentLogger.info('Payment metadata stored for later processing', {
        requestId,
        paymentIntentId: paymentIntent.id,
        metadata: paymentMetadata
      });
    } catch (metadataError) {
      PaymentLogger.error('Failed to store payment metadata:', {
        error: metadataError.message,
        paymentIntentId: paymentIntent.id,
        requestId
      });
      // Continue with payment creation even if metadata storage fails
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
        created_at: paymentIntent.created_at,
        updated_at: paymentIntent.updated_at,
        merchant_order_id: paymentIntent.merchant_order_id,
        next_action: paymentIntent.next_action
      },
      requestId
    });

  } catch (error) {
    // Handle specific Airwallex errors
    if (error.response && error.response.data) {
      throw new AirwallexError(
        error.response.data.message || 'Failed to create payment intent',
        error.response.data.code || 'AIRWALLEX_ERROR',
        error.response.status || 400,
        error.response.data
      );
    }

    // Re-throw PaymentError instances
    if (error instanceof PaymentError) {
      throw error;
    }

    // Handle unexpected errors
    throw new PaymentError(
      'An unexpected error occurred while creating payment intent',
      'INTERNAL_ERROR',
      500,
      { originalError: error.message }
    );
  }
};

/**
 * Get payment intent status from Airwallex
 * GET /api/payment/airwallex/status/:paymentIntentId
 */
const getPaymentStatus = async (req, res) => {
  const requestId = req.headers['x-request-id'];
  
  try {
    const { paymentIntentId } = req.params;
    
    PaymentLogger.info('Getting payment status', { requestId, paymentIntentId });
    
    if (!paymentIntentId) {
      throw new PaymentError(
        'Payment intent ID is required',
        'MISSING_PAYMENT_INTENT_ID',
        400
      );
    }
    
    // Validate payment intent ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(paymentIntentId)) {
      throw new PaymentError(
        'Invalid payment intent ID format',
        'INVALID_PAYMENT_INTENT_ID',
        400
      );
    }
    
    // Get payment status via Airwallex service
    const paymentStatus = await airwallexService.getPaymentIntentStatus(paymentIntentId);
    
    // PCI-DSS Compliance: Log only non-sensitive status information
    PaymentLogger.info('Payment status retrieved successfully', {
      requestId,
      paymentIntentId,
      status: paymentStatus.data ? paymentStatus.data.status : paymentStatus.status
    });
    
    // Retrieve stored payment metadata from database
    let storedMetadata = null;
    try {
      const metadataRecord = await PaymentMetadataService.getPaymentMetadata(paymentIntentId);
      if (metadataRecord) {
        storedMetadata = {
          uid: metadataRecord.uid,
          plan: metadataRecord.plan,
          totalPrice: metadataRecord.total_price,
          orderId: metadataRecord.order_id,
          paymentMethod: metadataRecord.payment_method,
          requestId: metadataRecord.request_id,
          createdAt: metadataRecord.created_at
        };
      }
    } catch (metadataError) {
      PaymentLogger.error('Failed to retrieve payment metadata:', {
        error: metadataError.message,
        paymentIntentId,
        requestId
      });
    }
    
    const status = paymentStatus.data ? paymentStatus.data.status : paymentStatus.status;
    
    if (status === 'SUCCEEDED') {
      PaymentLogger.info('Payment succeeded, triggering BuySubscription API', {
        requestId,
        paymentIntentId,
        hasStoredMetadata: !!storedMetadata
      });
      
      if (storedMetadata) {
        try {
          // Update metadata status to processing
          try {
            await PaymentMetadataService.updatePaymentMetadataStatus(paymentIntentId, 'processing');
          } catch (updateError) {
            PaymentLogger.warn('Failed to update metadata status to processing:', {
              error: updateError.message,
              paymentIntentId,
              requestId
            });
          }

          // Make synchronous call to BuySubscription API with stored metadata
          const buySubscriptionResponse = await axios.post(`${process.env.BASE_URL || 'https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run'}/api/user/BuySubscription`, {
            uid: storedMetadata.uid,
            plan: storedMetadata.plan,
            totalPrice: storedMetadata.totalPrice,
            paymentIntentId,
            orderId: storedMetadata.orderId,
            paymentMethod: storedMetadata.paymentMethod
          }, {
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (buySubscriptionResponse.data && buySubscriptionResponse.data.success) {
            PaymentLogger.info('BuySubscription API completed successfully after payment success', {
              requestId,
              paymentIntentId,
              subscriptionResult: buySubscriptionResponse.data
            });
            
            // Update metadata status to completed
            try {
              await PaymentMetadataService.updatePaymentMetadataStatus(paymentIntentId, 'completed');
            } catch (updateError) {
              PaymentLogger.warn('Failed to update metadata status to completed:', {
                error: updateError.message,
                paymentIntentId,
                requestId
              });
            }
          } else {
            PaymentLogger.error('BuySubscription API returned unsuccessful response', {
              requestId,
              paymentIntentId,
              response: buySubscriptionResponse.data
            });
          }
        } catch (subscriptionError) {
          // Handle axios errors properly with more robust error extraction
          const errorDetails = {
            name: subscriptionError?.name || subscriptionError?.constructor?.name || 'UnknownError',
            message: subscriptionError?.message || subscriptionError?.toString() || 'Unknown error occurred',
            stack: subscriptionError?.stack || 'No stack trace available',
            code: subscriptionError?.code || 'NO_CODE',
            statusCode: subscriptionError?.response?.status || subscriptionError?.status || 'NO_STATUS'
          };
          
          // Add response-specific error details
          if (subscriptionError?.response) {
            errorDetails.httpStatus = subscriptionError.response.status;
            errorDetails.httpStatusText = subscriptionError.response.statusText;
            errorDetails.responseData = subscriptionError.response.data;
            errorDetails.responseHeaders = subscriptionError.response.headers;
          } else if (subscriptionError?.request) {
            errorDetails.requestIssue = 'No response received from BuySubscription API';
            errorDetails.requestDetails = {
              method: subscriptionError.request.method,
              url: subscriptionError.request.url,
              timeout: subscriptionError.request.timeout
            };
          } else {
            errorDetails.setupError = 'Error setting up the request';
          }
          
          // Add additional error context
          if (subscriptionError?.cause) {
            errorDetails.cause = subscriptionError.cause;
          }
          
          // Log the raw error object for debugging
          errorDetails.rawErrorType = typeof subscriptionError;
          errorDetails.rawErrorKeys = Object.keys(subscriptionError || {});
          
          PaymentLogger.error('Failed to call BuySubscription API after payment success', {
            requestId,
            paymentIntentId,
            error: errorDetails,
            storedMetadata: {
              uid: storedMetadata.uid,
              plan: storedMetadata.plan,
              totalPrice: storedMetadata.totalPrice,
              paymentMethod: storedMetadata.paymentMethod
            }
          });

          // Update metadata status to failed
          try {
            await PaymentMetadataService.updatePaymentMetadataStatus(paymentIntentId, 'failed', {
              error_message: subscriptionError?.message || 'BuySubscription API call failed',
              error_code: subscriptionError?.code || 'UNKNOWN_ERROR'
            });
          } catch (updateError) {
            PaymentLogger.warn('Failed to update metadata status to failed:', {
              error: updateError.message,
              paymentIntentId,
              requestId
            });
          }
          // Continue with payment status response even if subscription call fails
        }
      } else {
        PaymentLogger.warn('Cannot trigger BuySubscription - no stored metadata found', {
          requestId,
          paymentIntentId,
          message: 'Payment metadata was not found in storage. This may indicate the payment intent was created before the new workflow was implemented.'
        });
      }
    } else if (paymentStatus.status === 'FAILED' || paymentStatus.status === 'CANCELLED') {
      PaymentLogger.info(`Payment ${paymentStatus.status.toLowerCase()}, saving to database`, {
        requestId,
        paymentIntentId,
        status: paymentStatus.status,
        hasStoredMetadata: !!storedMetadata
      });
      
      if (storedMetadata) {
        // Update metadata status
        try {
          await PaymentMetadataService.updatePaymentMetadataStatus(
            paymentIntentId, 
            paymentStatus.status === 'FAILED' ? 'failed' : 'cancelled'
          );
        } catch (updateError) {
          PaymentLogger.warn('Failed to update metadata status for failed/cancelled payment:', {
            error: updateError.message,
            paymentIntentId,
            requestId
          });
        }

        try {
          // Call the appropriate endpoint based on status
          const endpoint = paymentStatus.status === 'CANCELLED' ? 'CancelSubscription' : 'BuySubscription';
          
          const failedPaymentResponse = await axios.post(`${process.env.API_URL || 'http://localhost:3002'}/api/user/${endpoint}`, {
            uid: storedMetadata.uid,
            plan: storedMetadata.plan,
            totalPrice: storedMetadata.totalPrice,
            paymentIntentId,
            orderId: storedMetadata.orderId,
            paymentMethod: storedMetadata.paymentMethod,
            forceFailure: paymentStatus.status === 'FAILED' // This will trigger the error handler to save failed payment
          }, {
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          PaymentLogger.info(`${paymentStatus.status.toLowerCase()} payment saved to database`, {
            requestId,
            paymentIntentId,
            endpoint,
            responseStatus: failedPaymentResponse.status
          });
        } catch (saveError) {
          // Handle axios errors properly with more robust error extraction
          const errorDetails = {
            name: saveError?.name || saveError?.constructor?.name || 'UnknownError',
            message: saveError?.message || saveError?.toString() || 'Unknown error occurred',
            stack: saveError?.stack || 'No stack trace available',
            code: saveError?.code || 'NO_CODE',
            statusCode: saveError?.response?.status || saveError?.status || 'NO_STATUS'
          };
          
          // Add response-specific error details
          if (saveError?.response) {
            errorDetails.httpStatus = saveError.response.status;
            errorDetails.httpStatusText = saveError.response.statusText;
            errorDetails.responseData = saveError.response.data;
            errorDetails.responseHeaders = saveError.response.headers;
          } else if (saveError?.request) {
            errorDetails.requestIssue = 'No response received from API';
            errorDetails.requestDetails = {
              method: saveError.request.method,
              url: saveError.request.url,
              timeout: saveError.request.timeout
            };
          } else {
            errorDetails.setupError = 'Error setting up the request';
          }
          
          // Add additional error context
          if (saveError?.cause) {
            errorDetails.cause = saveError.cause;
          }
          
          // Log the raw error object for debugging
          errorDetails.rawErrorType = typeof saveError;
          errorDetails.rawErrorKeys = Object.keys(saveError || {});
          
          PaymentLogger.error(`Error saving ${paymentStatus.status.toLowerCase()} payment to database`, {
            requestId,
            paymentIntentId,
            error: errorDetails,
            storedMetadata: {
              uid: storedMetadata.uid,
              plan: storedMetadata.plan,
              totalPrice: storedMetadata.totalPrice,
              paymentMethod: storedMetadata.paymentMethod
            }
          });
        }
      } else {
        PaymentLogger.warn(`Cannot process ${paymentStatus.status.toLowerCase()} payment - no stored metadata found`, {
          requestId,
          paymentIntentId,
          message: 'Payment metadata was not found in storage. This may indicate the payment intent was created before the new workflow was implemented.'
        });
      }
    }
    
    res.json({
      success: true,
      data: paymentStatus,
      message: 'Payment status retrieved successfully',
      requestId
    });
    
  } catch (error) {
    // Handle specific Airwallex errors
    if (error.response && error.response.data) {
      throw new AirwallexError(
        error.response.data.message || 'Failed to retrieve payment status',
        error.response.data.code || 'AIRWALLEX_ERROR',
        error.response.status || 400,
        error.response.data
      );
    }
    
    // Re-throw PaymentError instances
    if (error instanceof PaymentError) {
      throw error;
    }
    
    // Handle unexpected errors
    throw new PaymentError(
      'An unexpected error occurred while retrieving payment status',
      'INTERNAL_ERROR',
      500,
      { originalError: error.message }
    );
  }
};

/**
 * Confirm a payment intent
 * POST /api/payment/airwallex/confirm/:paymentIntentId
 */
const confirmPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const confirmationData = req.body;
    
    console.log(`Confirming payment intent: ${paymentIntentId}`);
    console.log('Confirmation data:', JSON.stringify(confirmationData, null, 2));

    // Validate payment intent ID
    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment intent ID is required',
        code: 'MISSING_PAYMENT_INTENT_ID'
      });
    }

    // Confirm payment intent via Airwallex service
    const result = await airwallexService.confirmPaymentIntent(paymentIntentId, confirmationData);

    console.log('Payment intent confirmed successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Payment intent confirmed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error confirming payment intent:', error.message);
    console.error('Error stack:', error.stack);

    // Handle specific Airwallex API errors
    if (error.message.includes('Airwallex API error')) {
      return res.status(400).json({
        error: 'Payment Service Error',
        message: error.message,
        code: 'AIRWALLEX_API_ERROR'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to confirm payment intent',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Cancel a payment intent
 * POST /api/payment/airwallex/cancel/:paymentIntentId
 */
const cancelPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const { cancellation_reason } = req.body;
    
    console.log(`Cancelling payment intent: ${paymentIntentId}`);

    // Validate payment intent ID
    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment intent ID is required',
        code: 'MISSING_PAYMENT_INTENT_ID'
      });
    }

    // Cancel payment intent via Airwallex service
    const result = await airwallexService.cancelPaymentIntent(paymentIntentId, cancellation_reason);

    console.log('Payment intent cancelled successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Payment intent cancelled successfully',
      data: result
    });

  } catch (error) {
    console.error('Error cancelling payment intent:', error.message);
    console.error('Error stack:', error.stack);

    // Handle specific Airwallex API errors
    if (error.message.includes('Airwallex API error')) {
      return res.status(400).json({
        error: 'Payment Service Error',
        message: error.message,
        code: 'AIRWALLEX_API_ERROR'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to cancel payment intent',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Get available payment methods
 * GET /api/payment/airwallex/payment-methods
 */
const getPaymentMethods = async (req, res) => {
  try {
    console.log('Getting available payment methods');
    
    // Get query parameters for filtering
    const queryParams = req.query;

    // Get payment methods via Airwallex service
    const paymentMethods = await airwallexService.getPaymentMethods(queryParams);

    console.log('Payment methods retrieved successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Payment methods retrieved successfully',
      data: paymentMethods
    });

  } catch (error) {
    console.error('Error getting payment methods:', error.message);
    console.error('Error stack:', error.stack);

    // Handle specific Airwallex API errors
    if (error.message.includes('Airwallex API error')) {
      return res.status(400).json({
        error: 'Payment Service Error',
        message: error.message,
        code: 'AIRWALLEX_API_ERROR'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve payment methods',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  createPaymentIntent,
  getPaymentStatus,
  confirmPaymentIntent,
  cancelPaymentIntent,
  getPaymentMethods
};