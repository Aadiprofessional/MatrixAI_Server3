# Airwallex Payment Integration Setup

This guide explains how to set up and use the Airwallex payment integration in the MatrixAI Server.

## 🚀 Quick Start

### 1. Environment Configuration

Copy the environment variables from `env.example` to your actual environment file:

```bash
# Airwallex Payment Configuration
AIRWALLEX_CLIENT_ID=your_airwallex_client_id_here
AIRWALLEX_API_KEY=your_airwallex_api_key_here
AIRWALLEX_BASE_URL=https://api.airwallex.com/api/v1
```

**Note:** Use `https://api.airwallex.com/api/v1` for production and `https://api-demo.airwallex.com/api/v1` for sandbox/testing.

### 2. Get Airwallex Credentials

1. Sign up for an Airwallex account at [https://www.airwallex.com](https://www.airwallex.com)
2. Navigate to your dashboard and go to **Settings > API Keys**
3. Create a new API key pair (Client ID and API Key)
4. Copy the credentials to your environment configuration

### 3. Start the Server

```bash
# Development mode
NODE_ENV=development npm start

# The server will start on http://localhost:3000
```

### 4. Test the Integration

```bash
# Run the test suite
node test-payment.js
```

## 📋 Available Endpoints

### Payment Operations

- **POST** `/api/payment/airwallex/create-intent` - Create a payment intent
- **GET** `/api/payment/airwallex/status/:paymentIntentId` - Get payment status
- **POST** `/api/payment/airwallex/confirm/:paymentIntentId` - Confirm payment
- **POST** `/api/payment/airwallex/cancel/:paymentIntentId` - Cancel payment
- **GET** `/api/payment/airwallex/payment-methods` - Get available payment methods

### Health & Documentation

- **GET** `/api/payment/health` - Payment service health check
- **GET** `/api/payment/docs` - API documentation

## 💳 Example Usage

### Create Payment Intent

```bash
curl -X POST http://localhost:3000/api/payment/airwallex/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "return_url": "https://example.com/return",
    "merchant_order_id": "order_123"
  }'
```

### Get Payment Status

```bash
curl http://localhost:3000/api/payment/airwallex/status/int_abc123
```

## 🔧 Features

✅ **Authentication & Token Caching** - Automatic token management with expiry handling

✅ **Comprehensive Error Handling** - Detailed error classification and user-friendly messages

✅ **Request/Response Logging** - Full audit trail with request IDs

✅ **CORS Configuration** - Properly configured for Airwallex domains

✅ **Health Monitoring** - Service health checks with dependency validation

✅ **Retry Logic** - Automatic retry for expired tokens and network issues

✅ **Input Validation** - Comprehensive validation for all payment parameters

## 🛡️ Security Features

- Environment variable protection for sensitive credentials
- Request ID tracking for audit trails
- Comprehensive error logging without exposing sensitive data
- Token caching with automatic expiry management
- Input validation and sanitization

## 🐛 Troubleshooting

### Common Issues

1. **"Airwallex credentials not configured"**
   - Ensure `AIRWALLEX_CLIENT_ID` and `AIRWALLEX_API_KEY` are set in your environment

2. **"Authentication failed"**
   - Verify your credentials are correct
   - Check if you're using the right base URL (sandbox vs production)

3. **"Network error"**
   - Check your internet connection
   - Verify the Airwallex API is accessible from your server

4. **"Invalid payment intent ID format"**
   - Ensure the payment intent ID follows the correct format

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=true
NODE_ENV=development
```

## 📚 API Documentation

For detailed API documentation, visit `/api/payment/docs` when the server is running, or refer to the [Airwallex API Documentation](https://www.airwallex.com/docs/api).

## 🔄 Testing

The integration includes a comprehensive test suite that validates:

- Health check functionality
- Payment intent creation
- Payment status retrieval
- Payment methods fetching
- Error handling scenarios
- Input validation

Run tests with: `node test-payment.js`

---

**Need help?** Check the server logs for detailed error information and request IDs for debugging.