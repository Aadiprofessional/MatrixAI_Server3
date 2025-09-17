// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const audioRoutes = require('./src/routes/audioRoutes.js');
const videoRoutes = require('./src/routes/videoRoutes.js');
const imageRoutes = require('./src/routes/imageRoutes.js');
const userRoutes = require('./src/routes/userRoutes.js');
const adminRoutes = require('./src/routes/adminRoutes.js');
const emailRoutes = require('./src/routes/emailRoutes.js');
const contentRoutes = require('./src/routes/contentRoutes.js');
const humanizeRoutes = require('./src/routes/humanizeRoutes.js');
const detectionRoutes = require('./src/routes/detectionRoutes.js');
const paymentRoutes = require('./src/routes/paymentRoutes.js');
const presentationRoutes = require('./src/routes/presentationRoutes.js');
const documentRoutes = require('./src/routes/documentRoutes.js');

// Set up environment variables with fallback configuration
const setupEnvironment = () => {
  const fallbackEnv = {
    ENVIRONMENT: 'production',
    NODE_ENV: 'production',
    SUPABASE_URL: 'https://ddtgdhehxhgarkonvpfq.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_supabase_service_role_key',
    DEEPGRAM_API_URL: process.env.DEEPGRAM_API_URL || 'https://api.deepgram.com/v1/listen',
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || 'your_deepgram_api_key',
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY || 'your_dashscope_api_key',
    DASHSCOPEVIDEO_API_KEY: process.env.DASHSCOPEVIDEO_API_KEY || 'your_dashscope_video_api_key',
    AZURE_KEY: process.env.AZURE_KEY || 'your_azure_text_translation_key',
    AZURE_API_REGION: process.env.AZURE_API_REGION || 'eastus',
    DASHSCOPEIMAGE_API_KEY: process.env.DASHSCOPEIMAGE_API_KEY || 'your_dashscope_image_api_key',
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || 'your_rapidapi_key',
    BASE_URL: process.env.BASE_URL || 'https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run',
    AIRWALLEX_CLIENT_ID: process.env.AIRWALLEX_CLIENT_ID || 'your_airwallex_client_id',
    AIRWALLEX_API_KEY: process.env.AIRWALLEX_API_KEY || 'your_airwallex_api_key',
    AIRWALLEX_BASE_URL: process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com/api/v1'
  };

  Object.keys(fallbackEnv).forEach(key => {
    if (!process.env[key]) {
      process.env[key] = fallbackEnv[key];
    }
  });
};

// Initialize environment
setupEnvironment();

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'https://matrix-4hv.pages.dev', 'http://localhost:3001', 'http://localhost:3002', 'https://matrixaiglobal.com', 'https://www.matrixaiglobal.com', 'https://matrixai.asia'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'Accept', 'Origin', 'Cache-Control', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Enable CORS middleware for Express
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'MatrixAI Server',
    version: '1.0.0',
    platform: 'Express.js'
  });
});

// Routes
app.use('/api/audio', audioRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/humanize', humanizeRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/presentation', presentationRoutes);
app.use('/api/document', documentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: [
      '/health',
      '/api/audio/uploadAudioUrl',
      '/api/audio/getAudioStatus', 
      '/api/audio/getAudioFile',
      '/api/audio/getAllAudioFiles',
      '/api/video/createVideo',
      '/api/video/getVideoStatus',
      '/api/video/getAllVideos',
      '/api/image/createImage',
      '/api/image/getImageStatus',
      '/api/image/getAllImages',
      '/api/user/subtractCoins',
      '/api/user/getUserCoins',
      '/api/user/userinfo',
      '/api/user/AllTransactions',
      '/api/user/getCoupon',
      '/api/user/getUserOrder',
      '/api/user/BuySubscription',
      '/api/user/edituser',
      '/api/admin/getAllUsers',
      '/api/admin/getAllGeneratedImage',
      '/api/email/send',
      '/api/email/logs',
      '/api/content/generateContent',
      '/api/content/getGeneratedContent',
      '/api/content/getContent/:contentId',
      '/api/content/deleteContent/:contentId',
      '/api/detection/createDetection',
      '/api/detection/getUserDetections',
      '/api/detection/getDetection',
      '/api/detection/deleteDetection',
      '/api/document/extractText',
      '/api/document/htmlToDocx',
      '/api/document/csvToXlsx'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    service: 'MatrixAI Server',
    platform: 'Express.js'
  });
});

module.exports = app;