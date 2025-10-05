const { createClient } = require('@supabase/supabase-js');

/**
 * Initialize Supabase client with environment variables and optimized settings for large data operations
 * @returns {Object} Supabase client instance
 */
function getSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  
  // Optimized configuration for large data operations and translation workloads
  const options = {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false, // Disable auto refresh for performance
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-client-info': 'matrixai-server@1.0.0',
      },
    },
    // Optimized for large payloads and translation operations
    realtime: {
      params: {
        eventsPerSecond: 5, // Reduce realtime load
      },
    },
    // Custom fetch with optimized timeouts for large data operations
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout for very large operations
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal', // Reduce response payload
          'Accept-Encoding': 'gzip, deflate', // Enable compression
          'Connection': 'keep-alive', // Reuse connections
          'Cache-Control': 'no-cache' // Prevent caching issues
        },
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    },
  };
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
}

module.exports = { getSupabaseClient };