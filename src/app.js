const express = require('express');
const cors = require('cors');

// Load environment variables from .env file
require('dotenv').config();
const audioRoutes = require('./routes/audioRoutes.js');
const contentRoutes = require('./routes/contentRoutes.js');
const emailRoutes = require('./routes/emailRoutes.js');
const humanizeRoutes = require('./routes/humanizeRoutes.js');
const imageRoutes = require('./routes/imageRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const videoRoutes = require('./routes/videoRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const detectionRoutes = require('./routes/detectionRoutes.js');
const presentationRoutes = require('./routes/presentationRoutes.js');
const documentRoutes = require('./routes/documentRoutes.js');
const aiImageGenerationRoutes = require('./routes/aiImageGenerationRoutes.js');
const pdfRoutes = require('./routes/pdfRoutes.js');

// Import payment routes
let paymentRoutes;
try {
  paymentRoutes = require('./routes/paymentRoutes.js');
} catch (error) {
  console.error('Error importing payment routes:', error);
  // Fallback to empty router
  paymentRoutes = express.Router();
}

const app = express();

// Set up environment variables with fallback configuration
const setupEnvironment = () => {
  // Default values for development - these will be overridden by actual environment variables if present
  const fallbackEnv = {
    ENVIRONMENT: 'production',
    NODE_ENV: 'production',
    FC_ACCOUNT_ID: '',
    FC_ACCESS_KEY_ID: '',
    FC_ACCESS_KEY_SECRET: '',
    FC_REGION: 'cn-hangzhou',
    FC_SERVICE_NAME: 'matrixai-server',
    BASE_URL: 'https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run',
    SUPABASE_URL: 'https://ddtgdhehxhgarkonvpfq.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key',
    DEEPGRAM_API_URL: process.env.DEEPGRAM_API_URL || 'https://api.deepgram.com/v1/listen',
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || 'your_deepgram_api_key',
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY || 'your_dashscope_api_key',
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || 'your_rapidapi_key',
    DASHSCOPEVIDEO_API_KEY: process.env.DASHSCOPEVIDEO_API_KEY || 'your_dashscope_video_api_key',
    AZURE_KEY: process.env.AZURE_KEY || 'your_azure_text_translation_key',
    AZURE_API_REGION: process.env.AZURE_API_REGION || 'eastus',
    DASHSCOPEIMAGE_API_KEY: process.env.DASHSCOPEIMAGE_API_KEY || 'your_dashscope_image_api_key',
    // Airwallex configuration
    AIRWALLEX_CLIENT_ID: process.env.AIRWALLEX_CLIENT_ID || 'your_airwallex_client_id',
    AIRWALLEX_API_KEY: process.env.AIRWALLEX_API_KEY || 'your_airwallex_api_key',
    AIRWALLEX_BASE_URL: process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com/api/v1',
    AIRWALLEX_MERCHANT_ACCOUNT_ID: process.env.AIRWALLEX_MERCHANT_ACCOUNT_ID || 'your_airwallex_merchant_account_id'
  };

  // Set fallback environment variables if not already set
  Object.keys(fallbackEnv).forEach(key => {
    if (!process.env[key]) {
      process.env[key] = fallbackEnv[key];
    }
  });
};

// Initialize environment
setupEnvironment();

// CORS configuration for frontend integration
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'https://matrix-4hv.pages.dev', 
    'https://matrixai.asia', 
    'https://matrixaiglobal.com', 
    'https://www.matrixaiglobal.com',
    // Add additional origins for payment integration if needed
    'https://checkout.airwallex.com',
    'https://api.airwallex.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-API-Key', 
    'Accept', 
    'Origin', 
    'Cache-Control',
    // Add headers for payment processing
    'X-Payment-Intent-Id',
    'X-Client-Secret'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Enable CORS for development and payment integration
// For production serverless deployment, CORS is handled by s.yaml
if (process.env.NODE_ENV === 'development' || process.env.ENVIRONMENT === 'development') {
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  console.log('CORS enabled for development environment');
} else {
  // For production, CORS is handled by Function Compute (s.yaml)
  console.log('Production environment - CORS handled by serverless configuration');
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for generated videos
const path = require('path');
app.use('/generated_videos', express.static(path.join(__dirname, '../generated_videos')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'MatrixAI Server',
    version: '1.0.0',
    platform: 'Alibaba Cloud Function Compute'
  });
});

// Debug endpoint to check environment variables
app.get('/debug/env', (req, res) => {
  console.log('Debug endpoint called - checking environment variables');
  
  res.json({
    environment: process.env.ENVIRONMENT || 'undefined',
    nodeEnv: process.env.NODE_ENV || 'undefined',
    supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    deepgramConfigured: !!(process.env.DEEPGRAM_API_URL && process.env.DEEPGRAM_API_KEY),
    dashscopeConfigured: !!(process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPEVIDEO_API_KEY),
    dashscopeImageConfigured: !!(process.env.DASHSCOPEIMAGE_API_KEY),
    fcConfigured: !!(process.env.FC_ACCOUNT_ID && process.env.FC_ACCESS_KEY_ID),
    baseUrl: process.env.BASE_URL || 'undefined'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'MatrixAI Server API',
    version: '1.0.0',
    platform: 'Alibaba Cloud Function Compute',
    endpoints: {
      audio: '/api/audio/*',
      email: '/api/email/*',
      humanize: '/api/humanize/*',
      payment: '/api/payment/*',
      admin: '/api/admin/*',
      detection: '/api/detection/*',
      'ai-image': '/api/ai-image/*',
      health: '/health',
      debug: '/debug/env'
    },
    documentation: 'https://github.com/your-username/MatrixAI_Server'
  });
});

// Register route modules
app.use('/api/audio', audioRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/humanize', humanizeRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/user', userRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/presentation', presentationRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/ai-image', aiImageGenerationRoutes);
app.use('/api/pdf', pdfRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: ['/health', '/api', '/debug/env', '/api/audio/*', '/api/email/*', '/api/humanize/*', '/api/image/*', '/api/user/*', '/api/video/*', '/api/payment/*', '/api/admin/*', '/api/detection/*']
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    service: 'MatrixAI Server'
  });
});

module.exports = app;