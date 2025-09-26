const express = require('express');
const axios = require('axios');
const router = express.Router();

// Qwen3-VL-Plus Image Analysis API
router.post('/analyzeImage', async (req, res) => {
  try {
    const { imageUrl, text = "What is in this picture?" } = req.body;

    // Validate required parameters
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required'
      });
    }

    // Validate image URL format
    const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|bmp|webp)(\?.*)?$/i;
    if (!urlPattern.test(imageUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image URL format. Please provide a valid image URL.'
      });
    }

    console.log(`Analyzing image: ${imageUrl} with text: ${text}`);

    // Prepare the request payload for Qwen-VL-Plus (correct model name)
    const requestPayload = {
      model: "qwen-vl-plus", // Corrected model name
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            },
            {
              type: "text",
              text: text
            }
          ]
        }
      ]
    };

    // Get API key from environment variables
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'DASHSCOPE_API_KEY environment variable is not configured'
      });
    }

    // Retry mechanism with exponential backoff
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} to call Qwen-VL-Plus API`);
        
        // Make request to Qwen-VL-Plus API using international endpoint for better reliability
        const response = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
          requestPayload,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 120000 // 120 seconds timeout (2 minutes) for production stability
          }
        );
        
        // If successful, break out of retry loop
        console.log('Qwen-VL-Plus API response received successfully');
        
        // Extract the analysis result
        const analysis = response.data.choices?.[0]?.message?.content;
        
        if (!analysis) {
          return res.status(500).json({
            success: false,
            error: 'No analysis result received from Qwen-VL-Plus API'
          });
        }

        // Return successful response
        return res.json({
          success: true,
          imageUrl: imageUrl,
          question: text,
          analysis: analysis,
          model: "qwen-vl-plus",
          attempt: attempt,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error.message);
        
        // Check if this is a retryable error
        const isRetryable = (
          error.code === 'ECONNABORTED' || // timeout
          error.code === 'ENOTFOUND' || // DNS issues
          error.code === 'ECONNRESET' || // connection reset
          (error.response && [429, 502, 503, 504].includes(error.response.status)) // rate limit or server errors
        );
        
        // If not retryable or last attempt, break
        if (!isRetryable || attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we reach here, all retries failed
    console.error('All retry attempts failed. Last error:', lastError);

    // Handle different types of errors from the last attempt
    if (lastError.response) {
      // API responded with error status
      const statusCode = lastError.response.status;
      const errorMessage = lastError.response.data?.error?.message || lastError.response.data?.message || 'API request failed';
      
      return res.status(statusCode).json({
        success: false,
        error: `Qwen-VL-Plus API error: ${errorMessage}`,
        statusCode: statusCode,
        retriesAttempted: maxRetries
      });
    } else if (lastError.request) {
      // Request was made but no response received
      return res.status(503).json({
        success: false,
        error: 'Unable to reach Qwen-VL-Plus API after multiple attempts. Please try again later.',
        retriesAttempted: maxRetries
      });
    } else if (lastError.code === 'ECONNABORTED' || lastError.message.includes('timeout')) {
      // Timeout error
      return res.status(408).json({
        success: false,
        error: 'Request timeout: The image analysis took too long to complete after multiple attempts. Please try with a smaller image or try again later.',
        code: 'TIMEOUT_ERROR',
        retriesAttempted: maxRetries
      });
    } else {
      // Something else happened
      return res.status(500).json({
        success: false,
        error: 'Internal server error during image analysis after multiple attempts',
        retriesAttempted: maxRetries
      });
    }

  } catch (error) {
    console.error('Unexpected error in Qwen-VL-Plus image analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected internal server error during image analysis'
    });
  }
});

// Health check endpoint for Qwen Vision API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Qwen-VL-Plus Image Analysis API',
    model: 'qwen-vl-plus',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    features: ['retry_mechanism', 'exponential_backoff', 'environment_variables'],
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;