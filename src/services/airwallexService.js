const axios = require('axios');
const { PaymentLogger, AirwallexError } = require('../middleware/paymentErrorHandler');

class AirwallexService {
  constructor() {
    this.baseURL = process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com/api/v1';
    this.clientId = process.env.AIRWALLEX_CLIENT_ID;
    this.apiKey = process.env.AIRWALLEX_API_KEY;
    this.merchantAccountId = process.env.AIRWALLEX_MERCHANT_ACCOUNT_ID;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isAuthenticating = false;
  }

  /**
   * Authenticate with Airwallex API and cache the access token
   * @returns {Promise<string>} Access token
   */
  async authenticate() {
    // If already authenticating, wait for it to complete
    if (this.isAuthenticating) {
      while (this.isAuthenticating) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.accessToken;
    }

    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      PaymentLogger.info('Using cached Airwallex token');
      return this.accessToken;
    }

    this.isAuthenticating = true;

    try {
      PaymentLogger.info('Authenticating with Airwallex API');
      
      if (!this.clientId || !this.apiKey) {
        throw new Error('Airwallex credentials not configured. Please set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY environment variables.');
      }

      const response = await axios.post(`${this.baseURL}/authentication/login`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.clientId,
          'x-api-key': this.apiKey
        },
        timeout: 30000
      });

      if (response.data && response.data.token) {
        this.accessToken = response.data.token;
        // Set token expiry to 50 minutes (tokens typically expire in 1 hour)
        this.tokenExpiry = Date.now() + (50 * 60 * 1000);
        
        PaymentLogger.info('Airwallex authentication successful', {
          tokenLength: this.accessToken ? this.accessToken.length : 0,
          expiresIn: '50 minutes'
        });
        return this.accessToken;
      } else {
        throw new Error('Invalid response from Airwallex authentication API');
      }
    } catch (error) {
      PaymentLogger.error('Airwallex authentication failed', error, {
        clientId: this.clientId ? this.clientId.substring(0, 8) + '...' : 'missing',
        baseURL: this.baseURL
      });
      
      if (error.response) {
        throw new AirwallexError(
          error.response.data?.message || 'Authentication failed',
          error.response.data?.code || 'AUTHENTICATION_ERROR',
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        throw new AirwallexError(
          'Network error during Airwallex authentication',
          'NETWORK_ERROR',
          503
        );
      } else {
        throw new AirwallexError(
          `Authentication error: ${error.message}`,
          'AUTHENTICATION_SETUP_ERROR',
          500
        );
      }
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Make authenticated API request to Airwallex
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise<Object>} API response
   */
  async makeAuthenticatedRequest(method, endpoint, data = null) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const token = await this.authenticate();
      
      PaymentLogger.info('Making authenticated request', {
        requestId,
        method: method.toUpperCase(),
        endpoint,
        hasData: !!data
      });
      
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      
      PaymentLogger.info('Request successful', {
        requestId,
        status: response.status,
        endpoint
      });
      
      return response.data;
    } catch (error) {
      PaymentLogger.error('Request failed', error, {
        requestId,
        method: method.toUpperCase(),
        endpoint
      });
      
      if (error.response) {
        // If token expired, clear cache and retry once
        if (error.response.status === 401) {
          PaymentLogger.info('Token expired, clearing cache and retrying', { requestId });
          this.accessToken = null;
          this.tokenExpiry = null;
          
          try {
            // Retry once with new token
            const newToken = await this.authenticate();
            config.headers['Authorization'] = `Bearer ${newToken}`;
            
            const retryResponse = await axios(config);
            PaymentLogger.info('Retry successful', { requestId });
            return retryResponse.data;
          } catch (retryError) {
            PaymentLogger.error('Retry failed', retryError, { requestId });
            throw new AirwallexError(
              'Authentication failed after retry',
              'AUTHENTICATION_RETRY_FAILED',
              401,
              retryError.response?.data
            );
          }
        }
        
        throw new AirwallexError(
          error.response.data?.message || 'API request failed',
          error.response.data?.code || 'API_ERROR',
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        throw new AirwallexError(
          'Network error during Airwallex API request',
          'NETWORK_ERROR',
          503
        );
      } else {
        throw new AirwallexError(
          `Request error: ${error.message}`,
          'REQUEST_SETUP_ERROR',
          500
        );
      }
    }
  }

  /**
   * Create a payment intent
   * @param {Object} paymentData - Payment intent data
   * @returns {Promise<Object>} Payment intent response
   */
  async createPaymentIntent(paymentData) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // PCI-DSS Compliance: Log only non-sensitive data
      PaymentLogger.info('Creating Airwallex payment intent', {
        requestId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        uid: paymentData.uid,
        plan: paymentData.plan
      });
      
      // Validate required fields
      if (!paymentData.amount || !paymentData.currency) {
        throw new Error('Amount and currency are required for payment intent');
      }

      // Add required request_id and merchant_order_id if not provided
      const requestData = {
        request_id: paymentData.request_id || requestId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        merchant_order_id: paymentData.merchant_order_id || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order: paymentData.order || { type: 'payment_intent' },
        merchant_account_id: this.merchantAccountId,
        ...paymentData
      };

      const response = await this.makeAuthenticatedRequest('POST', '/pa/payment_intents/create', requestData);
      
      PaymentLogger.info('Payment intent created successfully', {
        requestId,
        paymentIntentId: response.id || response.request_id,
        status: response.status
      });
      return response;
    } catch (error) {
      PaymentLogger.error('Failed to create payment intent', error, { requestId });
      throw error;
    }
  }

  /**
   * Get payment intent status
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment intent details
   */
  async getPaymentIntentStatus(paymentIntentId) {
    const requestId = `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      PaymentLogger.info('Getting payment intent status', {
        requestId,
        paymentIntentId
      });
      
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }

      const response = await this.makeAuthenticatedRequest('GET', `/pa/payment_intents/${paymentIntentId}`);
      
      PaymentLogger.info('Payment intent status retrieved', {
        requestId,
        paymentIntentId,
        status: response.status
      });
      return response;
    } catch (error) {
      PaymentLogger.error('Failed to get payment intent status', error, {
        requestId,
        paymentIntentId
      });
      throw error;
    }
  }

  /**
   * Confirm a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} confirmationData - Confirmation data
   * @returns {Promise<Object>} Confirmation response
   */
  async confirmPaymentIntent(paymentIntentId, confirmationData) {
    const requestId = `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      PaymentLogger.info('Confirming payment intent', {
        requestId,
        paymentIntentId
      });
      
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }

      const response = await this.makeAuthenticatedRequest('POST', `/pa/payment_intents/${paymentIntentId}/confirm`, confirmationData);
      
      PaymentLogger.info('Payment intent confirmed successfully', {
        requestId,
        paymentIntentId,
        status: response.status
      });
      return response;
    } catch (error) {
      PaymentLogger.error('Failed to confirm payment intent', error, {
        requestId,
        paymentIntentId
      });
      throw error;
    }
  }

  /**
   * Cancel a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {string} cancellationReason - Reason for cancellation
   * @returns {Promise<Object>} Cancellation response
   */
  async cancelPaymentIntent(paymentIntentId, cancellationReason = 'requested_by_customer') {
    const requestId = `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      PaymentLogger.info('Cancelling payment intent', {
        requestId,
        paymentIntentId,
        cancellationReason
      });
      
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }

      const response = await this.makeAuthenticatedRequest('POST', `/pa/payment_intents/${paymentIntentId}/cancel`, {
        cancellation_reason: cancellationReason
      });
      
      PaymentLogger.info('Payment intent cancelled successfully', {
        requestId,
        paymentIntentId,
        status: response.status
      });
      return response;
    } catch (error) {
      PaymentLogger.error('Failed to cancel payment intent', error, {
        requestId,
        paymentIntentId
      });
      throw error;
    }
  }

  /**
   * Get available payment methods
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Available payment methods
   */
  async getPaymentMethods(params = {}) {
    const requestId = `methods_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      PaymentLogger.info('Getting available payment methods', {
        requestId,
        params: Object.keys(params)
      });
      
      const queryString = new URLSearchParams(params).toString();
      const endpoint = `/pa/config/payment_method_types${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.makeAuthenticatedRequest('GET', endpoint);
      
      PaymentLogger.info('Payment methods retrieved successfully', {
        requestId,
        methodCount: response.items?.length || 0
      });
      return response;
    } catch (error) {
      PaymentLogger.error('Failed to get payment methods', error, { requestId });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new AirwallexService();