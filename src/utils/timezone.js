/**
 * Timezone utility functions for handling user timezone-aware timestamps
 * This module provides functions to generate timestamps based on user's timezone
 */

/**
 * Get current timestamp in user's timezone
 * @param {string} userTimezone - User's timezone (e.g., 'Asia/Hong_Kong', 'Asia/Kolkata', 'America/New_York')
 * @param {Date} customDate - Optional custom date to convert (defaults to current time)
 * @returns {string} ISO string timestamp in user's timezone
 */
function getUserTimezoneTimestamp(userTimezone = 'UTC', customDate = null) {
  try {
    const date = customDate || new Date();
    
    // If no timezone provided or invalid timezone, use UTC
    if (!userTimezone || userTimezone === 'UTC') {
      return date.toISOString();
    }
    
    // Create a date formatter for the user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const partsObj = {};
    parts.forEach(part => {
      partsObj[part.type] = part.value;
    });
    
    // Construct ISO-like string in user's timezone
    const timezoneTimestamp = `${partsObj.year}-${partsObj.month}-${partsObj.day}T${partsObj.hour}:${partsObj.minute}:${partsObj.second}.${date.getMilliseconds().toString().padStart(3, '0')}`;
    
    // Get timezone offset for the user's timezone
    const tempDate = new Date(date.getTime());
    const utcTime = tempDate.getTime() + (tempDate.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime + (getTimezoneOffset(userTimezone, date) * 60000));
    
    // Return ISO string with timezone offset
    return targetTime.toISOString();
    
  } catch (error) {
    console.error('Error generating user timezone timestamp:', error);
    // Fallback to UTC if timezone conversion fails
    return (customDate || new Date()).toISOString();
  }
}

/**
 * Get timezone offset in minutes for a specific timezone
 * @param {string} timezone - Target timezone
 * @param {Date} date - Date to get offset for
 * @returns {number} Offset in minutes
 */
function getTimezoneOffset(timezone, date) {
  try {
    const utcDate = new Date(date.toLocaleString("en-US", {timeZone: "UTC"}));
    const targetDate = new Date(date.toLocaleString("en-US", {timeZone: timezone}));
    return (targetDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (error) {
    console.error('Error getting timezone offset:', error);
    return 0; // Default to UTC offset
  }
}

/**
 * Extract timezone from request headers or body
 * @param {Object} req - Express request object
 * @returns {string} User's timezone or UTC as fallback
 */
function extractUserTimezone(req) {
  // Check various sources for timezone information
  const timezone = 
    req.body?.timezone || 
    req.body?.userTimezone ||
    req.query?.timezone || 
    req.headers['x-user-timezone'] || 
    req.headers['timezone'] ||
    'UTC';
    
  // Validate timezone
  if (isValidTimezone(timezone)) {
    console.log(`Using timezone from request: ${timezone}`);
    return timezone;
  }
  
  console.warn(`Invalid timezone provided: ${timezone}, falling back to UTC`);
  return 'UTC';
}

/**
 * Validate if a timezone string is valid
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} True if valid timezone
 */
function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get common timezone mappings for easier user input
 * @returns {Object} Mapping of common timezone names to IANA timezone identifiers
 */
function getCommonTimezones() {
  return {
    // Asia
    'hongkong': 'Asia/Hong_Kong',
    'hk': 'Asia/Hong_Kong',
    'india': 'Asia/Kolkata',
    'ist': 'Asia/Kolkata',
    'china': 'Asia/Shanghai',
    'beijing': 'Asia/Shanghai',
    'shanghai': 'Asia/Shanghai',
    'japan': 'Asia/Tokyo',
    'tokyo': 'Asia/Tokyo',
    'singapore': 'Asia/Singapore',
    'thailand': 'Asia/Bangkok',
    'bangkok': 'Asia/Bangkok',
    
    // Americas
    'est': 'America/New_York',
    'eastern': 'America/New_York',
    'pst': 'America/Los_Angeles',
    'pacific': 'America/Los_Angeles',
    'cst': 'America/Chicago',
    'central': 'America/Chicago',
    'mst': 'America/Denver',
    'mountain': 'America/Denver',
    
    // Europe
    'london': 'Europe/London',
    'uk': 'Europe/London',
    'paris': 'Europe/Paris',
    'berlin': 'Europe/Berlin',
    'rome': 'Europe/Rome',
    'madrid': 'Europe/Madrid',
    
    // Others
    'utc': 'UTC',
    'gmt': 'UTC'
  };
}

/**
 * Normalize timezone input to IANA timezone identifier
 * @param {string} timezoneInput - User provided timezone
 * @returns {string} Normalized IANA timezone identifier
 */
function normalizeTimezone(timezoneInput) {
  if (!timezoneInput) return 'UTC';
  
  const input = timezoneInput.toLowerCase().trim();
  const commonTimezones = getCommonTimezones();
  
  // Check if it's a common timezone alias
  if (commonTimezones[input]) {
    return commonTimezones[input];
  }
  
  // Check if it's already a valid IANA timezone
  if (isValidTimezone(timezoneInput)) {
    return timezoneInput;
  }
  
  // Fallback to UTC
  return 'UTC';
}

/**
 * Create a timestamp with timezone information for database storage
 * @param {Object} req - Express request object
 * @param {Date} customDate - Optional custom date
 * @returns {Object} Object containing timestamp and timezone info
 */
function createTimezoneAwareTimestamp(req, customDate = null) {
  const userTimezone = extractUserTimezone(req);
  const normalizedTimezone = normalizeTimezone(userTimezone);
  
  // Check if user provided their current time in the request
  let dateToUse = customDate;
  if (req && req.body) {
    if (req.body.currentTime) {
      // User provided their current time
      dateToUse = new Date(req.body.currentTime);
      console.log(`Using user-provided current time: ${req.body.currentTime}`);
    } else if (req.body.userTime) {
      // Alternative field name for user time
      dateToUse = new Date(req.body.userTime);
      console.log(`Using user-provided time: ${req.body.userTime}`);
    }
  }
  
  const timestamp = getUserTimezoneTimestamp(normalizedTimezone, dateToUse);
  
  return {
    timestamp: timestamp,
    timezone: normalizedTimezone,
    original_timezone_input: userTimezone,
    user_provided_time: req?.body?.currentTime || req?.body?.userTime || null
  };
}

module.exports = {
  getUserTimezoneTimestamp,
  getTimezoneOffset,
  extractUserTimezone,
  isValidTimezone,
  getCommonTimezones,
  normalizeTimezone,
  createTimezoneAwareTimestamp
};