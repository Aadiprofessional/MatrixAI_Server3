# Image Prompt API Documentation

This document describes the Image Prompt API endpoints for managing image URLs and prompts in the MatrixAI Server.

## Table of Contents
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Testing](#testing)

## Database Setup

First, run the SQL script to create the required table in your Supabase database:

```sql
-- Execute the contents of create_image_prompts_table.sql
-- This will create the image_prompts table with proper indexes and RLS policies
```

The table structure:
```sql
CREATE TABLE image_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

All endpoints are prefixed with `/api/image-prompt/`

### 1. Save Image Prompt
**POST** `/api/image-prompt/saveImagePrompt`

Save a new image URL and prompt to the database.

**Request Body:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "prompt": "A beautiful landscape with mountains",
  "user_id": "123e4567-e89b-12d3-a456-426614174000" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image prompt saved successfully",
  "data": {
    "id": "uuid-here",
    "image_url": "https://example.com/image.jpg",
    "prompt": "A beautiful landscape with mountains",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

### 2. Get All Image Prompts
**GET** `/api/image-prompt/getAllImagePrompts`

Retrieve all image-prompt records with optional filtering and pagination.

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `limit` (optional, default: 50): Number of records to return
- `offset` (optional, default: 0): Number of records to skip

**Example:** `/api/image-prompt/getAllImagePrompts?user_id=123&limit=10&offset=0`

**Response:**
```json
{
  "success": true,
  "message": "Image prompts retrieved successfully",
  "data": [
    {
      "id": "uuid-here",
      "image_url": "https://example.com/image.jpg",
      "prompt": "A beautiful landscape",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 10,
    "offset": 0
  }
}
```

### 3. Get Image Prompt by ID
**GET** `/api/image-prompt/getImagePrompt/:id`

Retrieve a specific image-prompt record by its ID.

**Response:**
```json
{
  "success": true,
  "message": "Image prompt retrieved successfully",
  "data": {
    "id": "uuid-here",
    "image_url": "https://example.com/image.jpg",
    "prompt": "A beautiful landscape",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

### 4. Update Image Prompt
**PUT** `/api/image-prompt/updateImagePrompt/:id`

Update an existing image-prompt record.

**Request Body:**
```json
{
  "image_url": "https://example.com/new-image.jpg", // Optional
  "prompt": "Updated prompt text" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image prompt updated successfully",
  "data": {
    "id": "uuid-here",
    "image_url": "https://example.com/new-image.jpg",
    "prompt": "Updated prompt text",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:05:00Z"
  }
}
```

### 5. Delete Image Prompt
**DELETE** `/api/image-prompt/deleteImagePrompt/:id`

Delete a specific image-prompt record by its ID.

**Response:**
```json
{
  "success": true,
  "message": "Image prompt deleted successfully",
  "deleted_id": "uuid-here"
}
```

## Usage Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const API_BASE = 'https://your-server.com/api/image-prompt';

// Save a new image prompt
async function saveImagePrompt() {
  try {
    const response = await axios.post(`${API_BASE}/saveImagePrompt`, {
      image_url: 'https://example.com/image.jpg',
      prompt: 'A beautiful sunset over the ocean',
      user_id: 'user-uuid-here'
    });
    console.log('Saved:', response.data);
    return response.data.data.id;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Get all image prompts
async function getAllImagePrompts() {
  try {
    const response = await axios.get(`${API_BASE}/getAllImagePrompts?limit=10`);
    console.log('Retrieved:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Delete an image prompt
async function deleteImagePrompt(id) {
  try {
    const response = await axios.delete(`${API_BASE}/deleteImagePrompt/${id}`);
    console.log('Deleted:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}
```

### cURL Examples
```bash
# Save image prompt
curl -X POST "https://your-server.com/api/image-prompt/saveImagePrompt" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "prompt": "A beautiful landscape",
    "user_id": "123e4567-e89b-12d3-a456-426614174000"
  }'

# Get all image prompts
curl "https://your-server.com/api/image-prompt/getAllImagePrompts?limit=10&offset=0"

# Get specific image prompt
curl "https://your-server.com/api/image-prompt/getImagePrompt/uuid-here"

# Update image prompt
curl -X PUT "https://your-server.com/api/image-prompt/updateImagePrompt/uuid-here" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Updated prompt text"
  }'

# Delete image prompt
curl -X DELETE "https://your-server.com/api/image-prompt/deleteImagePrompt/uuid-here"
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "details": "Additional error details if available"
}
```

### Common Error Codes:
- **400 Bad Request**: Missing required fields or invalid data
- **404 Not Found**: Record not found
- **500 Internal Server Error**: Database or server error

### Validation Rules:
- `image_url`: Must be a valid URL format
- `prompt`: Required, cannot be empty
- `user_id`: Optional, must be a valid UUID if provided

## Testing

Run the test suite to verify all endpoints:

```bash
# Make sure your server is running first
node test_image_prompt_api.js
```

The test file will:
1. Create a new image prompt
2. Retrieve all image prompts
3. Get the specific image prompt by ID
4. Update the image prompt
5. Delete the image prompt
6. Test error scenarios

## Security Features

- **Row Level Security (RLS)**: Users can only access their own records
- **Input Validation**: All inputs are validated before database operations
- **SQL Injection Protection**: Using parameterized queries via Supabase client
- **URL Validation**: Image URLs are validated for proper format

## Database Indexes

The following indexes are created for optimal performance:
- `idx_image_prompts_user_id`: For filtering by user
- `idx_image_prompts_created_at`: For sorting by creation date

## Notes

- All timestamps are stored in UTC with timezone information
- The `updated_at` field is automatically updated on record modifications
- UUIDs are automatically generated for new records
- The API supports both development and production environments