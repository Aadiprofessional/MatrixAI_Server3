# MatrixAI Server API Reference

This document provides a comprehensive reference for all API endpoints in the MatrixAI Server application.

## Base URL
```
https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run/api
```

## Authentication
Most endpoints require a valid user ID (`uid`) parameter. Some endpoints may also require JWT tokens or API keys.

---

## User Management Endpoints

### 1. User Registration
**Endpoint:** `/user/signup`  
**Methods:** `ALL` (POST, GET, PUT, DELETE, etc.)  
**Description:** Register a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "name": "John Doe",
  "referralCode": "ABC123" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "uid": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe",
    "coins": 25
  }
}
```

### 2. User Login
**Endpoint:** `/user/login`  
**Methods:** `ALL`  
**Description:** Authenticate user and get access token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-string",
  "user": {
    "uid": "uuid-string",
    "email": "user@example.com",
    "coins": 100
  }
}
```

### 3. Reset Password
**Endpoint:** `/user/resetPassword`  
**Methods:** `ALL`  
**Description:** Reset user password

**Request Body:**
```json
{
  "email": "user@example.com",
  "newPassword": "newSecurePassword123",
  "confirmPassword": "newSecurePassword123"
}
```

### 4. Subtract Coins
**Endpoint:** `/user/subtractCoins`  
**Methods:** `ALL`  
**Description:** Deduct coins from user account for transactions

**Request Body:**
```json
{
  "uid": "uuid-string",
  "coinAmount": 30,
  "transaction_name": "video_generation"
}
```

### 5. Get User Coins
**Endpoint:** `/user/getUserCoins`  
**Methods:** `ALL`  
**Description:** Retrieve user's current coin balance

**Request Body:**
```json
{
  "uid": "uuid-string"
}
```

### 6. Get User Info
**Endpoint:** `/user/userinfo`  
**Methods:** `ALL`  
**Description:** Get detailed user information

**Request Body:**
```json
{
  "uid": "uuid-string"
}
```

**Response:**
```json
{
  "name": "John Doe",
  "age": 25,
  "gender": "male",
  "email": "user@example.com",
  "dp_url": "profile-image-url",
  "subscription_active": true
}
```

### 7. Get All Transactions
**Endpoint:** `/user/AllTransactions`  
**Methods:** `ALL`  
**Description:** Retrieve user's transaction history

**Request Body:**
```json
{
  "uid": "uuid-string"
}
```

### 8. Get Coupons
**Endpoint:** `/user/getCoupon`  
**Methods:** `ALL`  
**Description:** Get available coupons for user

**Request Body:**
```json
{
  "uid": "uuid-string"
}
```

### 9. Get User Orders
**Endpoint:** `/user/getUserOrder`  
**Methods:** `ALL`  
**Description:** Retrieve user's order history

**Request Body:**
```json
{
  "uid": "uuid-string"
}
```

### 10. Buy Subscription
**Endpoint:** `/user/BuySubscription`  
**Methods:** `ALL`  
**Description:** Purchase a subscription plan

**Request Body:**
```json
{
  "uid": "uuid-string",
  "plan": "Monthly",
  "totalPrice": 9.99,
  "couponId": "coupon-id", // Optional
  "paymentIntentId": "pi_xxx", // Optional
  "orderId": "order-id", // Optional
  "paymentMethod": "stripe", // Optional
  "forceFailure": false, // Optional
  "reason": "test" // Optional
}
```

### 11. Cancel Subscription
**Endpoint:** `/user/CancelSubscription`  
**Methods:** `ALL`  
**Description:** Cancel user subscription

**Request Body:**
```json
{
  "uid": "uuid-string",
  "plan": "Monthly",
  "totalPrice": 9.99,
  "paymentIntentId": "pi_xxx",
  "orderId": "order-id",
  "paymentMethod": "stripe"
}
```

### 12. Edit User
**Endpoint:** `/user/edituser`  
**Methods:** `ALL`  
**Description:** Update user profile information

**Request Body:**
```json
{
  "uid": "uuid-string",
  "name": "Updated Name",
  "age": 26,
  "gender": "female",
  "dp_url": "new-profile-image-url"
}
```

### 13. Get Help
**Endpoint:** `/user/getHelp`  
**Methods:** `ALL`  
**Description:** Submit a help request

**Request Body:**
```json
{
  "uid": "uuid-string",
  "issue": "Payment Issue",
  "description": "Detailed description of the issue", // Optional
  "orderId": "order-id" // Optional
}
```

### 14. Submit Feedback
**Endpoint:** `/user/submitFeedback`  
**Methods:** `ALL`  
**Description:** Submit user feedback

**Request Body:**
```json
{
  "uid": "uuid-string",
  "issue": "Feature Request",
  "description": "Detailed feedback description" // Optional
}
```

### 15. Get Subscription Plans
**Endpoint:** `/user/getSubscriptionPlans`  
**Methods:** `ALL`  
**Description:** Retrieve available subscription plans

**Query Parameters:**
```
uid=uuid-string (Optional)
```

---

## Video Generation Endpoints

### 1. Get Video History
**Endpoint:** `/video/getVideoHistory`  
**Methods:** `ALL`  
**Description:** Retrieve user's video generation history with pagination

**Request Body:**
```json
{
  "uid": "uuid-string",
  "page": 1, // Optional, default: 1
  "itemsPerPage": 10 // Optional, default: 10
}
```

**Response:**
```json
{
  "videos": [
    {
      "video_id": "uuid-string",
      "prompt_text": "A beautiful sunset",
      "video_url": "https://storage-url/video.mp4",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "totalItems": 25,
  "currentPage": 1,
  "totalPages": 3
}
```

### 2. Remove Video
**Endpoint:** `/video/removeVideo`  
**Methods:** `ALL`  
**Description:** Delete a video from user's history

**Request Body:**
```json
{
  "uid": "uuid-string",
  "videoId": "uuid-string"
}
```

### 3. Create Video
**Endpoint:** `/video/createVideo`  
**Methods:** `POST`  
**Description:** Generate a new video from text or image

**Content-Type:** `multipart/form-data`

**Form Data:**
```
uid: uuid-string (required)
promptText: "A beautiful sunset over mountains" (optional)
imageUrl: "https://example.com/image.jpg" (optional)
template: "premium_template_name" (optional)
image: [file upload] (optional)
```

**Response:**
```json
{
  "message": "Video generation started successfully",
  "videoId": "uuid-string",
  "status": "processing"
}
```

### 4. Get Video Status
**Endpoint:** `/video/getVideoStatus`  
**Methods:** `ALL`  
**Description:** Check the status of video generation

**Request Body:**
```json
{
  "uid": "uuid-string",
  "videoId": "uuid-string"
}
```

**Response:**
```json
{
  "message": "Video generation completed",
  "status": "completed",
  "videoUrl": "https://storage-url/video.mp4",
  "promptText": "A beautiful sunset",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 5. Generate Subtitles
**Endpoint:** `/video/generateSubtitles`  
**Methods:** `POST`  
**Description:** Generate subtitles for a video

**Request Body:**
```json
{
  "video_url": "https://storage-url/video.mp4",
  "word_data": [
    {
      "start": 0.0,
      "end": 1.5,
      "word": "Hello"
    },
    {
      "start": 1.5,
      "end": 2.8,
      "word": "World"
    }
  ],
  "uid": "uuid-string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video subtitle generation completed successfully",
  "data": {
    "task_id": "uuid-string",
    "video_url": "https://storage-url/video-with-subtitles.mp4",
    "processing_time": "45.2s"
  }
}
```

---

## AI Detection Endpoints

### 1. Create Detection
**Endpoint:** `/detection/createDetection`  
**Methods:** `POST`  
**Description:** Analyze text for AI-generated content using GPTZero

**Request Body:**
```json
{
  "uid": "uuid-string",
  "text": "Text content to analyze for AI detection",
  "title": "My Analysis", // Optional, default: "Untitled"
  "tags": ["academic", "research"], // Optional, default: []
  "coinCost": 40, // Optional, always deducts 40 coins
  "language": "en" // Optional, default: "en"
}
```

**Response:**
```json
{
  "message": "Detection created successfully",
  "detection": {
    "id": "uuid-string",
    "title": "My Analysis",
    "text": "Text content to analyze",
    "predicted_class": "human",
    "confidence_score": 0.85,
    "confidence_category": "High",
    "is_human": true,
    "fake_percentage": 15,
    "ai_words": 5,
    "text_words": 100,
    "sentences": [...],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. Get User Detections
**Endpoint:** `/detection/getUserDetections`  
**Methods:** `GET`  
**Description:** Retrieve user's detection history with pagination and search

**Query Parameters:**
```
uid=uuid-string (required)
page=1 (optional)
itemsPerPage=10 (optional)
searchQuery=search-term (optional)
```

**Response:**
```json
{
  "message": "Detection history retrieved successfully",
  "detections": [
    {
      "id": "uuid-string",
      "title": "My Analysis",
      "text": "Text content...",
      "is_human": true,
      "fake_percentage": 15,
      "predicted_class": "human",
      "confidence_score": 0.85,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "totalItems": 25,
  "currentPage": 1,
  "totalPages": 3
}
```

### 3. Get Detection
**Endpoint:** `/detection/getDetection`  
**Methods:** `GET`  
**Description:** Retrieve a specific detection by ID

**Query Parameters:**
```
uid=uuid-string (required)
detectionId=uuid-string (required)
```

**Response:**
```json
{
  "message": "Detection retrieved successfully",
  "detection": {
    "id": "uuid-string",
    "title": "My Analysis",
    "text": "Full text content...",
    "predicted_class": "human",
    "confidence_score": 0.85,
    "sentences": [...],
    "paragraphs": [...],
    "full_response": {...}
  }
}
```

### 4. Delete Detection
**Endpoint:** `/detection/deleteDetection`  
**Methods:** `DELETE`  
**Description:** Delete a detection from user's history

**Request Body:**
```json
{
  "uid": "uuid-string",
  "detectionId": "uuid-string"
}
```

**Response:**
```json
{
  "message": "Detection deleted successfully",
  "id": "uuid-string",
  "title": "My Analysis"
}
```

---

## AI Image Generation Endpoints

### 1. Generate Image from Description
**Endpoint:** `/ai-image/generateImageFromDescription`  
**Methods:** `POST`  
**Description:** Generate images or charts from text descriptions using AI

**Request Body:**
```json
{
  "uid": "uuid-string",
  "description": "A beautiful landscape with mountains and a lake",
  "coinCost": 1 // Optional, default: 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image generated successfully",
  "imageUrl": "https://storage-url/ai_generated_image.png",
  "imageId": "uuid-string",
  "description": "A beautiful landscape with mountains and a lake",
  "coinsDeducted": 1
}
```

### 2. Get User AI Images
**Endpoint:** `/ai-image/getUserAIImages`  
**Methods:** `GET`  
**Description:** Retrieve user's AI-generated images

**Query Parameters:**
```
uid=uuid-string (required)
```

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid-string",
      "description": "A beautiful landscape",
      "image_url": "https://storage-url/image.png",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Text Humanization Endpoints

### 1. Create Humanization
**Endpoint:** `/humanize/createHumanization`  
**Methods:** `POST`  
**Description:** Humanize AI-generated text using StealthGPT

**Request Body:**
```json
{
  "uid": "uuid-string",
  "prompt": "AI-generated text to humanize",
  "title": "My Humanization", // Optional
  "tags": ["academic", "essay"], // Optional
  "language": "en", // Optional, default: "en"
  "tone": "Standard", // Optional: "Standard", "HighSchool", "College", "PhD"
  "mode": "Medium", // Optional: "Low", "Medium", "High"
  "detector": "turnitin", // Optional: "turnitin", "originality", "zerogpt", etc.
  "rephrase": true, // Optional, default: true
  "business": false, // Optional, default: false
  "isMultilingual": false // Optional, default: false
}
```

**Response:**
```json
{
  "message": "Humanization created successfully",
  "humanization": {
    "id": "uuid-string",
    "title": "My Humanization",
    "original_text": "AI-generated text to humanize",
    "humanized_text": "Humanized version of the text",
    "createdAt": "2024-01-01T00:00:00Z",
    "tone": "Standard",
    "mode": "Medium",
    "detector": "turnitin",
    "coinCost": 40
  }
}
```

### 2. Get User Humanizations
**Endpoint:** `/humanize/getUserHumanizations`  
**Methods:** `GET`  
**Description:** Retrieve user's humanization history with pagination and search

**Query Parameters:**
```
uid=uuid-string (required)
page=1 (optional)
itemsPerPage=10 (optional)
searchQuery=search-term (optional)
```

**Response:**
```json
{
  "message": "Humanization history retrieved successfully",
  "humanizations": [
    {
      "id": "uuid-string",
      "title": "My Humanization",
      "original_text": "Original AI text...",
      "humanized_text": "Humanized version...",
      "createdAt": "2024-01-01T00:00:00Z",
      "language": "en"
    }
  ],
  "totalItems": 15,
  "currentPage": 1,
  "totalPages": 2
}
```

### 3. Get Humanization
**Endpoint:** `/humanize/getHumanization`  
**Methods:** `GET`  
**Description:** Retrieve a specific humanization by ID

**Query Parameters:**
```
uid=uuid-string (required)
humanizationId=uuid-string (required)
```

**Response:**
```json
{
  "message": "Humanization retrieved successfully",
  "humanization": {
    "id": "uuid-string",
    "title": "My Humanization",
    "original_text": "Full original text...",
    "humanized_text": "Full humanized text...",
    "createdAt": "2024-01-01T00:00:00Z",
    "language": "en"
  }
}
```

### 4. Delete Humanization
**Endpoint:** `/humanize/deleteHumanization`  
**Methods:** `DELETE`  
**Description:** Delete a humanization from user's history

**Request Body:**
```json
{
  "uid": "uuid-string",
  "humanizationId": "uuid-string"
}
```

**Response:**
```json
{
  "message": "Humanization deleted successfully",
  "id": "uuid-string",
  "title": "My Humanization"
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "message": "Validation error message",
  "error": "Detailed error information"
}
```

### 401 Unauthorized
```json
{
  "message": "Authentication required",
  "error": "Invalid or missing credentials"
}
```

### 402 Payment Required
```json
{
  "message": "Insufficient coins",
  "error": "Not enough coins to complete this operation"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found",
  "error": "The requested resource does not exist"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "error": "Detailed error message"
}
```

---

## Rate Limiting and Coin Costs

### Coin Costs by Feature:
- **Video Generation:** 30 coins (standard), 55 coins (premium templates)
- **AI Detection:** 40 coins (fixed)
- **Text Humanization:** 40 coins (fixed)
- **AI Image Generation:** 1 coin (configurable)

### Word Limits:
- **AI Detection:** Maximum 2000 words
- **Text Humanization:** Maximum 2000 words
- **AI Image Generation:** Maximum 1000 characters for description

### File Upload Limits:
- **Video Creation:** Maximum 50MB for image uploads
- **Supported Image Formats:** JPEG, PNG, WebP, GIF

---

## Notes

1. All endpoints support CORS for cross-origin requests
2. Most endpoints accept both JSON and form-data content types
3. UUIDs must be in valid UUID v4 format
4. Timestamps are in ISO 8601 format (UTC)
5. Pagination starts from page 1
6. Search queries are case-insensitive and support partial matching
7. File uploads use multipart/form-data encoding
8. All monetary amounts are in USD
9. Subscription plans include: Monthly, Yearly, Addon, Tester
10. Video generation supports text-to-video and image-to-video modes