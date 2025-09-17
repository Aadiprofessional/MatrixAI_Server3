# Payment API Documentation

## PCI-DSS Compliance Overview

**Compliance Level:** SAQ A (Self-Assessment Questionnaire A)  
**Integration Type:** Hosted Payment Pages  
**Merchant Category:** Level 4 (< 20,000 e-commerce transactions annually)  
**Last Updated:** December 9, 2025

### Security Standards

This payment system is designed to comply with PCI-DSS SAQ A requirements:

- ✅ **No Cardholder Data Storage**: All payment data is processed through Airwallex hosted payment pages
- ✅ **Secure Transmission**: All API endpoints enforce HTTPS with security headers
- ✅ **Input Validation**: Comprehensive validation and sanitization of all payment requests
- ✅ **Audit Logging**: Complete audit trail with sanitized logging (no CHD exposure)
- ✅ **Rate Limiting**: Protection against abuse and automated attacks
- ✅ **Authentication**: Required API authentication for all payment operations

---

## Base URL

```
Production: https://your-domain.com/api/payments
Development: https://localhost:3000/api/payments
```

## Authentication

All payment API endpoints require authentication. Include your API key in the request headers:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## Security Headers

All responses include the following security headers for PCI-DSS compliance:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

---

## Endpoints

### 1. Create Payment Intent

Creates a new payment intent for processing through Airwallex hosted payment pages.

**Endpoint:** `POST /create-intent`

**PCI-DSS Compliance:** ✅ SAQ A - No cardholder data processed

#### Request

```http
POST /api/payments/create-intent
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "amount": 2999,
  "currency": "USD",
  "description": "Premium subscription",
  "metadata": {
    "user_id": "user_123",
    "plan_type": "premium"
  }
}
```

#### Request Parameters

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `amount` | integer | Yes | Amount in smallest currency unit (cents) | Min: 50, Max: 999999999 |
| `currency` | string | Yes | ISO 4217 currency code | Must be supported currency |
| `description` | string | No | Payment description | Max 255 characters |
| `metadata` | object | No | Additional metadata | Max 10 key-value pairs |

#### Response

```json
{
  "success": true,
  "data": {
    "payment_intent_id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_abc123",
    "amount": 2999,
    "currency": "USD",
    "status": "requires_payment_method",
    "created_at": "2025-12-09T10:30:00Z",
    "hosted_payment_url": "https://checkout.airwallex.com/..."
  },
  "request_id": "req_abc123def456"
}
```

#### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Amount must be at least 50 cents",
    "details": {
      "field": "amount",
      "provided": 25
    }
  },
  "request_id": "req_abc123def456"
}
```

### 2. Get Payment Status

Retrieves the current status of a payment intent.

**Endpoint:** `GET /status/:payment_intent_id`

**PCI-DSS Compliance:** ✅ SAQ A - No cardholder data returned

#### Request

```http
GET /api/payments/status/pi_1234567890
Authorization: Bearer YOUR_API_KEY
```

#### Response

```json
{
  "success": true,
  "data": {
    "payment_intent_id": "pi_1234567890",
    "status": "succeeded",
    "amount": 2999,
    "currency": "USD",
    "created_at": "2025-12-09T10:30:00Z",
    "updated_at": "2025-12-09T10:35:00Z",
    "metadata": {
      "user_id": "user_123",
      "plan_type": "premium"
    }
  },
  "request_id": "req_def456ghi789"
}
```

### 3. Confirm Payment Intent

Confirms a payment intent after customer completes payment on hosted page.

**Endpoint:** `POST /confirm/:payment_intent_id`

**PCI-DSS Compliance:** ✅ SAQ A - Confirmation only, no CHD processing

#### Request

```http
POST /api/payments/confirm/pi_1234567890
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "return_url": "https://yourapp.com/payment/success"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "payment_intent_id": "pi_1234567890",
    "status": "succeeded",
    "confirmation_method": "automatic",
    "confirmed_at": "2025-12-09T10:35:00Z"
  },
  "request_id": "req_ghi789jkl012"
}
```

### 4. Cancel Payment Intent

Cancels a payment intent that hasn't been completed.

**Endpoint:** `POST /cancel/:payment_intent_id`

**PCI-DSS Compliance:** ✅ SAQ A - Cancellation only

#### Request

```http
POST /api/payments/cancel/pi_1234567890
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "cancellation_reason": "requested_by_customer"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "payment_intent_id": "pi_1234567890",
    "status": "canceled",
    "canceled_at": "2025-12-09T10:40:00Z",
    "cancellation_reason": "requested_by_customer"
  },
  "request_id": "req_jkl012mno345"
}
```

### 5. Health Check

Checks the health status of the payment service.

**Endpoint:** `GET /health`

#### Request

```http
GET /api/payments/health
```

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2025-12-09T10:45:00Z",
  "version": "1.0.0",
  "pci_compliance": {
    "level": "SAQ A",
    "last_assessment": "2025-12-09",
    "next_review": "2026-12-09"
  }
}
```

---

## Rate Limiting

To ensure system stability and PCI-DSS compliance, the following rate limits apply:

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `/create-intent` | 10 requests | 1 minute |
| `/status/*` | 100 requests | 1 minute |
| `/confirm/*` | 5 requests | 1 minute |
| `/cancel/*` | 5 requests | 1 minute |
| `/health` | 60 requests | 1 minute |

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1702123456
```

**Rate Limit Exceeded Response:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_AMOUNT` | 400 | Amount is invalid or out of range |
| `INVALID_CURRENCY` | 400 | Currency code is not supported |
| `INVALID_PAYMENT_INTENT` | 404 | Payment intent not found |
| `PAYMENT_ALREADY_CONFIRMED` | 400 | Payment intent already confirmed |
| `PAYMENT_ALREADY_CANCELED` | 400 | Payment intent already canceled |
| `AUTHENTICATION_REQUIRED` | 401 | Valid API key required |
| `INSUFFICIENT_PERMISSIONS` | 403 | API key lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Payment service temporarily unavailable |

---

## Security Best Practices

### For Developers

1. **API Key Security**
   - Store API keys securely (environment variables)
   - Never expose API keys in client-side code
   - Rotate API keys regularly

2. **HTTPS Only**
   - Always use HTTPS for API requests
   - Validate SSL certificates
   - Use TLS 1.2 or higher

3. **Input Validation**
   - Validate all input parameters
   - Sanitize user-provided data
   - Use parameterized queries

4. **Error Handling**
   - Don't expose sensitive information in error messages
   - Log errors securely without CHD
   - Implement proper retry logic

### For Merchants

1. **PCI-DSS Compliance**
   - This integration qualifies for SAQ A
   - Complete annual SAQ A questionnaire
   - Maintain compliance documentation

2. **Data Handling**
   - Never store cardholder data
   - Use hosted payment pages only
   - Implement secure logging practices

3. **Monitoring**
   - Monitor payment transactions
   - Set up fraud detection
   - Review audit logs regularly

---

## Webhooks

Webhook endpoints for payment status updates:

### Payment Intent Status Updates

**Endpoint:** Your configured webhook URL

**Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

**Payload Example:**

```json
{
  "event_type": "payment_intent.succeeded",
  "data": {
    "payment_intent_id": "pi_1234567890",
    "status": "succeeded",
    "amount": 2999,
    "currency": "USD",
    "metadata": {
      "user_id": "user_123"
    }
  },
  "created_at": "2025-12-09T10:35:00Z",
  "signature": "webhook_signature_here"
}
```

---

## Testing

### Test Environment

```
Base URL: https://localhost:3000/api/payments
Test API Key: test_sk_1234567890abcdef
```

### Test Cards (Airwallex Sandbox)

| Card Number | Brand | Result |
|-------------|-------|--------|
| `4035 5010 0000 0008` | Visa | Success |
| `4000 0000 0000 0002` | Visa | Declined |
| `4000 0000 0000 0119` | Visa | Processing Error |

### Sample Test Request

```bash
curl -X POST https://localhost:3000/api/payments/create-intent \
  -H "Authorization: Bearer test_sk_1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "USD",
    "description": "Test payment"
  }'
```

---

## Support

For technical support or compliance questions:

- **Documentation:** [Internal Wiki]
- **Security Issues:** security@yourcompany.com
- **PCI-DSS Questions:** compliance@yourcompany.com
- **API Support:** api-support@yourcompany.com

---

## Compliance Documentation

- [PCI-DSS SAQ A Questionnaire](./PCI_DSS_SAQ_A_QUESTIONNAIRE.md)
- [Attestation of Compliance](./PCI_DSS_AOC_SAQ_A.md)
- [Compliance Analysis](../PCI_DSS_COMPLIANCE_ANALYSIS.md)
- [Compliance Report](../PCI_DSS_COMPLIANCE_REPORT.md)

---

**Last Updated:** December 9, 2025  
**Version:** 1.0.0  
**PCI-DSS Compliance Level:** SAQ A