/**
 * Frontend Timezone Detection and API Integration
 * Add this code to your frontend to automatically detect user timezone
 * and include it in API requests for accurate timestamp logging
 */

// 1. Function to get user's timezone
function getUserTimezone() {
  try {
    // Get user's timezone using Intl.DateTimeFormat
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('Detected user timezone:', timezone);
    return timezone;
  } catch (error) {
    console.warn('Could not detect timezone, falling back to UTC:', error);
    return 'UTC';
  }
}

// 2. Function to create API request with timezone
function createAPIRequest(url, data, options = {}) {
  // Add timezone to the request data
  const requestData = {
    ...data,
    timezone: getUserTimezone()
  };
  
  // Default options
  const defaultOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Also add timezone in headers as backup
      'X-User-Timezone': getUserTimezone()
    },
    body: JSON.stringify(requestData)
  };
  
  // Merge with provided options
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  console.log('Making API request with timezone:', requestData.timezone);
  return fetch(url, finalOptions);
}

// 3. Example usage for image creation
async function createImageWithTimezone(uid, promptText, imageCount = 1) {
  try {
    const response = await createAPIRequest('/api/image/createImage', {
      uid: uid,
      promptText: promptText,
      imageCount: imageCount
    });
    
    const result = await response.json();
    console.log('Image creation response:', result);
    return result;
  } catch (error) {
    console.error('Error creating image:', error);
    throw error;
  }
}

// 4. Example usage for other APIs
async function getAllImagesWithTimezone(uid, page = 1, limit = 100) {
  try {
    const response = await createAPIRequest('/api/image/getAllImages', {
      uid: uid,
      page: page,
      limit: limit
    });
    
    const result = await response.json();
    console.log('Get all images response:', result);
    return result;
  } catch (error) {
    console.error('Error getting images:', error);
    throw error;
  }
}

// 5. Quick fix for existing code - replace your current API calls
// BEFORE (your current code):
// fetch('/api/image/createImage', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ uid, promptText, imageCount })
// })

// AFTER (with timezone):
// createAPIRequest('/api/image/createImage', { uid, promptText, imageCount })

// 6. Test function to verify timezone detection
function testTimezoneDetection() {
  const timezone = getUserTimezone();
  const now = new Date();
  
  console.log('=== TIMEZONE TEST ===');
  console.log('Detected timezone:', timezone);
  console.log('Current time in detected timezone:', now.toLocaleString('en-US', { timeZone: timezone }));
  console.log('Current time in UTC:', now.toISOString());
  console.log('Current time in India (Asia/Kolkata):', now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  console.log('Current time in Hong Kong (Asia/Hong_Kong):', now.toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
  console.log('====================');
  
  return timezone;
}

// 7. Auto-run test when script loads
console.log('Frontend timezone detection loaded');
testTimezoneDetection();

// Export functions for use in your application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getUserTimezone,
    createAPIRequest,
    createImageWithTimezone,
    getAllImagesWithTimezone,
    testTimezoneDetection
  };
}

// Make functions available globally in browser
if (typeof window !== 'undefined') {
  window.TimezoneAPI = {
    getUserTimezone,
    createAPIRequest,
    createImageWithTimezone,
    getAllImagesWithTimezone,
    testTimezoneDetection
  };
}