# Timezone-Aware API Documentation

## Overview
All APIs now support timezone-aware timestamps. You can send the user's timezone and/or current time in the request body, and the server will automatically handle timezone conversion and storage.

## How to Use

### Option 1: Send Timezone Only
Add the user's timezone to your request body:

```json
{
  "uid": "user-id",
  "timezone": "Asia/Kolkata",
  // ... other parameters
}
```

### Option 2: Send Current Time Only
Add the user's current time to your request body:

```json
{
  "uid": "user-id", 
  "currentTime": "2025-09-30T05:09:00.000Z",
  // ... other parameters
}
```

### Option 3: Send Both (Recommended)
Send both timezone and current time for maximum accuracy:

```json
{
  "uid": "user-id",
  "timezone": "Asia/Kolkata",
  "currentTime": "2025-09-30T05:09:00.000Z",
  // ... other parameters
}
```

## Supported Timezone Formats

### Standard IANA Timezone Names
- `Asia/Kolkata` (India)
- `Asia/Hong_Kong` (Hong Kong)
- `Asia/Singapore` (Singapore)
- `America/New_York` (Eastern US)
- `Europe/London` (UK)
- `UTC` (Universal Time)

### Common Aliases (Automatically Converted)
- `india` → `Asia/Kolkata`
- `hongkong` → `Asia/Hong_Kong`
- `singapore` → `Asia/Singapore`
- `est` → `America/New_York`
- `pst` → `America/Los_Angeles`

## API Endpoints Updated

### 1. Create Image API
**Endpoint:** `POST /api/image/createImage`

**Request Body:**
```json
{
  "uid": "0a147ebe-af99-481b-bcaf-ae70c9aeb8d8",
  "promptText": "Beautiful sunset over mountains",
  "imageCount": 1,
  "timezone": "Asia/Kolkata",
  "currentTime": "2025-09-30T05:09:00.000Z"
}
```

### 2. Get All Images API
**Endpoint:** `POST /api/image/getAllImages`

**Request Body:**
```json
{
  "uid": "0a147ebe-af99-481b-bcaf-ae70c9aeb8d8",
  "page": 1,
  "limit": 10,
  "timezone": "Asia/Kolkata",
  "currentTime": "2025-09-30T05:09:00.000Z"
}
```

### 3. User Transaction APIs
All transaction-related APIs now support timezone:

```json
{
  "uid": "user-id",
  "amount": 10,
  "timezone": "Asia/Hong_Kong",
  "currentTime": "2025-09-30T07:50:00.000Z"
}
```

## Frontend Implementation

### JavaScript Example
```javascript
// Get user's timezone automatically
function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Get current time in ISO format
function getCurrentTime() {
  return new Date().toISOString();
}

// Create image with timezone
async function createImageWithTimezone(uid, promptText, imageCount = 1) {
  const requestBody = {
    uid: uid,
    promptText: promptText,
    imageCount: imageCount,
    timezone: getUserTimezone(), // Automatically detected
    currentTime: getCurrentTime() // Current time
  };
  
  const response = await fetch('/api/image/createImage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  return await response.json();
}
```

### React Hook Example
```javascript
import { useState, useEffect } from 'react';

function useTimezone() {
  const [timezone, setTimezone] = useState('UTC');
  
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  
  const getCurrentTime = () => new Date().toISOString();
  
  return { timezone, getCurrentTime };
}

// Usage in component
function ImageCreator() {
  const { timezone, getCurrentTime } = useTimezone();
  
  const createImage = async (promptText) => {
    const response = await fetch('/api/image/createImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: userUid,
        promptText,
        imageCount: 1,
        timezone: timezone,
        currentTime: getCurrentTime()
      })
    });
    
    return await response.json();
  };
  
  // ... rest of component
}
```

## Database Storage

The server will store timestamps with timezone information:

```sql
-- Example record in user_transaction table
INSERT INTO user_transaction (
  uid, 
  amount, 
  transaction_type, 
  created_at, 
  timezone
) VALUES (
  '0a147ebe-af99-481b-bcaf-ae70c9aeb8d8',
  -10,
  'image_generation',
  '2025-09-30 05:09:00+05:30', -- India time
  'Asia/Kolkata'
);
```

## Backward Compatibility

- If no timezone is provided, the system defaults to UTC
- Existing APIs continue to work without timezone information
- Old records without timezone information are treated as UTC

## Testing

Use the provided test script to verify timezone functionality:

```bash
node test_timezone_api.js
```

This will show:
- Current time in different timezones
- Example API calls
- Frontend implementation examples

## Common Timezone Examples

| Location | Timezone | Example Time |
|----------|----------|--------------|
| India | `Asia/Kolkata` | 2025-09-30 05:09:00 |
| Hong Kong | `Asia/Hong_Kong` | 2025-09-30 07:39:00 |
| Singapore | `Asia/Singapore` | 2025-09-30 07:39:00 |
| Japan | `Asia/Tokyo` | 2025-09-30 08:39:00 |
| Australia (Sydney) | `Australia/Sydney` | 2025-09-30 09:39:00 |
| UK | `Europe/London` | 2025-09-30 00:39:00 |
| US East Coast | `America/New_York` | 2025-09-29 19:39:00 |
| US West Coast | `America/Los_Angeles` | 2025-09-29 16:39:00 |

## Error Handling

If an invalid timezone is provided:
- The system logs a warning
- Falls back to UTC
- Continues processing the request
- Returns success with UTC timestamp

## Performance Notes

- Timezone detection is cached per request
- Minimal performance impact
- All timezone operations are handled server-side
- No additional database queries required