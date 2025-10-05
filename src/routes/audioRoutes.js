const express = require("express");
const { getSupabaseClient } = require("../config/database.js");
const { v4: uuidv4 } = require("uuid");
const axios = require('axios');
const { createTimezoneAwareTimestamp } = require('../utils/timezone');

const router = express.Router();

// Helper function to deduct coins using the subtractCoins API
const deductCoins = async (uid, coinAmount, transactionName, req = null) => {
  // Development mode bypass - if NODE_ENV is development or if BYPASS_COIN_DEDUCTION is set
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.BYPASS_COIN_DEDUCTION === 'true';
  
  if (isDevelopment) {
    console.log(`[DEV MODE] Bypassing coin deduction for ${transactionName} (${coinAmount} coins)`);
    return { success: true, message: 'Development mode - coin deduction bypassed' };
  }

  try {
    console.log(`[COIN DEDUCTION] Attempting to deduct ${coinAmount} coins for ${transactionName} (UID: ${uid})`);
    
    // Get timezone-aware timestamp for coin deduction
    const timestampInfo = req ? createTimezoneAwareTimestamp(req) : {
      timestamp: new Date().toISOString(),
      timezone: 'UTC',
      localTime: new Date().toISOString(),
      utcTime: new Date().toISOString()
    };
    
    const response = await axios.post('https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run/api/user/subtractCoins', {
      uid,
      coinAmount,
      transaction_name: transactionName,
      timestamp: timestampInfo.timestamp,
      timezone: timestampInfo.timezone,
    }, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[COIN DEDUCTION] Success: ${response.data?.message || 'Coins deducted successfully'}`);
    return response.data;
  } catch (err) {
    console.error('[COIN DEDUCTION] Failed:', err.response?.data || err.message);
    
    // More detailed error logging
    if (err.response) {
      console.error(`[COIN DEDUCTION] HTTP Status: ${err.response.status}`);
      console.error(`[COIN DEDUCTION] Response Data:`, err.response.data);
    } else if (err.request) {
      console.error('[COIN DEDUCTION] No response received from server');
    } else {
      console.error('[COIN DEDUCTION] Request setup error:', err.message);
    }
    
    // Return more specific error messages
    const errorMessage = err.response?.data?.message || 
                        (err.code === 'ECONNREFUSED' ? 'Failed to connect to coin deduction service' :
                         err.code === 'ETIMEDOUT' ? 'Coin deduction service timeout' :
                         'Failed to fetch user information');
    
    return { success: false, message: errorMessage };
  }
};

// Add retry mechanism with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Check if it's a rate limit error
      const isRateLimited = error.message.includes('429') || 
                           error.message.includes('rate limit') ||
                           error.message.includes('quota');
      
      if (isRateLimited) {
        // Longer delay for rate limit errors
        const delay = baseDelay * Math.pow(2, attempt - 1) * 2;
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Standard exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

// Transcribe audio using Deepgram API
const transcribeAudioWithDeepgram = async (audioUrl, language = "en-GB") => {
  return await retryWithBackoff(async () => {
    const DEEPGRAM_API_URL = process.env.DEEPGRAM_API_URL;
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

    if (!DEEPGRAM_API_URL || !DEEPGRAM_API_KEY) {
      throw new Error('Deepgram API configuration missing. Please check DEEPGRAM_API_URL and DEEPGRAM_API_KEY environment variables.');
    }

    console.log(`Starting Deepgram transcription for URL: ${audioUrl}, Language: ${language}`);

    // Increased timeout for production environment (2 minutes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(`${DEEPGRAM_API_URL}?smart_format=true&language=${language}&model=whisper`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: audioUrl,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Deepgram API error:", response.status, response.statusText, errorText);
        
        // Handle specific error codes
        if (response.status === 429) {
          throw new Error(`Deepgram API rate limit exceeded: ${errorText}`);
        } else if (response.status >= 500) {
          throw new Error(`Deepgram API server error: ${response.status} ${response.statusText}`);
        } else {
          throw new Error(`Deepgram API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log("Deepgram API response received, processing...");

      // Extract the transcript from the Deepgram response
      const transcript = data.results?.channels[0]?.alternatives[0]?.transcript || "";
      
      // Extract word-level data with timestamps
      const words = data.results?.channels[0]?.alternatives[0]?.words || [];
      
      console.log(`Transcription extracted: ${transcript.length} characters, ${words.length} words`);
      
      return {
        transcription: transcript,
        jsonResponse: words,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error("Deepgram API timeout after 120 seconds");
        throw new Error("Transcription timeout - audio file may be too large or Deepgram service is slow");
      }
      throw error;
    }
  }, 5, 3000); // Increased to 5 retries with 3 second base delay for production
};

// Background processing function
// Transcribe audio function directly processes the audio without background processing

// Upload audio URL for transcription
router.all('/uploadAudioUrl', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /uploadAudioUrl endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  
  // Extract parameters from either query or body
  const uid = req.body.uid || req.query.uid;
  const audioUrl = req.body.audioUrl || req.query.audioUrl;
  const videoUrl = req.body.videoUrl || req.query.videoUrl || req.body.video_file || req.query.video_file;
  const audio_name = req.body.audio_name || req.query.audio_name || 'audio_recording';
  const language = req.body.language || req.query.language || 'en-GB';
  const duration = req.body.duration || req.query.duration;
  try {
    // Validate input
    if (!uid || !audioUrl) {
      return res.status(400).json({ message: 'UID and audioUrl are required' });
    }

    // Calculate coin cost based on duration (2 coins per minute, minimum 2 coins)
    const durationInMinutes = Math.ceil((duration || 60) / 60); // Default to 1 minute if no duration
    const coinCost = Math.max(2, durationInMinutes * 2);
    console.log(`Audio duration: ${duration} seconds (${durationInMinutes} minutes), coin cost: ${coinCost}`);

    // Check and deduct coins before processing
    const coinResult = await deductCoins(uid, coinCost, 'Audio Transcription', req);
    if (!coinResult.success) {
      console.log('Coin deduction failed:', coinResult.message);
      return res.status(400).json({ 
        success: false,
        message: coinResult.message,
        coinCost: coinCost
      });
    }

    console.log('Coins deducted successfully, proceeding with transcription');

    // Generate a unique audioId
    const audioid = uuidv4();

    // Initialize Supabase client
    const supabase = getSupabaseClient();

    // Get timezone-aware timestamp for audio metadata
    const audioTimestampInfo = createTimezoneAwareTimestamp(req);
    
    // Save the audio metadata to the database with 'processing' status
    const { error: insertError } = await supabase
      .from('audio_metadata')
      .insert({
        uid,
        audioid,
        audio_name,
        audio_url: audioUrl,
        video_file: videoUrl, // Save videoUrl to video_file column if provided
        file_path: audioUrl, // Use the URL as the file path since it's a URL-based upload
        language,
        duration,
        status: 'processing',
        uploaded_at: audioTimestampInfo.timestamp,
        timezone: audioTimestampInfo.timezone
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.status(500).json({ message: 'Error saving audio metadata', error: insertError });
    }

    console.log('Starting transcription with Deepgram...');
    
    try {
      // Transcribe the audio using Deepgram directly
      const transcriptionResult = await transcribeAudioWithDeepgram(audioUrl, language || 'en-GB');

      if (!transcriptionResult.transcription) {
        throw new Error("Failed to transcribe audio - empty transcription returned");
      }

      console.log(`Transcription completed for audioid: ${audioid}, length: ${transcriptionResult.transcription.length}`);
      console.log('Saving transcription results to database...');

      // Update with transcription results
      const { error: transcriptionUpdateError } = await supabase
        .from('audio_metadata')
        .update({ 
          transcription: transcriptionResult.transcription,
          words_data: transcriptionResult.jsonResponse,
          status: 'completed'
        })
        .eq('uid', uid)
        .eq('audioid', audioid);

      if (transcriptionUpdateError) {
        console.error('Error updating transcription results:', transcriptionUpdateError);
        throw new Error('Failed to save transcription results');
      }

      console.log(`Successfully completed transcription for audioid: ${audioid}`);
      
      // Send response with completed transcription
      return res.status(201).json({
        success: true,
        audioid,
        audio_name,
        status: 'completed',
        transcription: transcriptionResult.transcription,
        message: 'Audio transcription completed successfully'
      });
    } catch (transcriptionError) {
      console.error(`Error in transcription for audioid: ${audioid}:`, transcriptionError);
      
      // Update status to failed
      await supabase
        .from('audio_metadata')
        .update({ 
          status: 'failed',
          error_message: transcriptionError.message
        })
        .eq('uid', uid)
        .eq('audioid', audioid);
      
      return res.status(500).json({ 
        success: false, 
        audioid, 
        status: 'failed',
        message: 'Audio transcription failed', 
        error: transcriptionError.message 
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get audio status and transcription
router.all('/getAudioStatus', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /getAudioStatus endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  
  // Extract parameters from either query or body
  const uid = req.body.uid || req.query.uid;
  const audioid = req.body.audioid || req.query.audioid;
  try {
    if (!uid || !audioid) {
      return res.status(400).json({ message: 'UID and audioid are required' });
    }

    const supabase = getSupabaseClient();

    // Retrieve the audio metadata from the database
    const { data: audioData, error: dbError } = await supabase
      .from('audio_metadata')
      .select('status, error_message')
      .eq('uid', uid)
      .eq('audioid', audioid)
      .single();

    if (dbError || !audioData) {
      return res.status(404).json({ message: 'Audio metadata not found' });
    }

    res.json({
      success: true,
      audioid,
      status: audioData.status,
      error_message: audioData.error_message || null
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get audio file details
router.all('/getAudioFile', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /getAudioFile endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  
  // Extract parameters from either query or body
  const uid = req.body.uid || req.query.uid;
  const audioid = req.body.audioid || req.query.audioid;
  try {
    if (!uid || !audioid) {
      return res.status(400).json({ message: 'UID and audioid are required' });
    }

    const supabase = getSupabaseClient();

    // Retrieve the full audio data from the database
    const { data: audioData, error: dbError } = await supabase
      .from('audio_metadata')
      .select('*')
      .eq('uid', uid)
      .eq('audioid', audioid)
      .single();

    if (dbError || !audioData) {
      return res.status(404).json({ message: 'Audio file not found' });
    }

    res.json({
      success: true,
      audioid,
      status: audioData.status,
      audioUrl: audioData.audio_url,
      video_file: audioData.video_file || null,
      transcription: audioData.transcription || null,
      words_data: audioData.words_data || null,
      translated_data: audioData.translated_data || {},
      language: audioData.language,
      duration: audioData.duration,
      audio_name: audioData.audio_name,
      xml_data: audioData.xml_data || null,
      uploaded_at: audioData.uploaded_at,
      error_message: audioData.error_message || null
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all audio files for a user
router.all('/getAllAudioFiles', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('Request to /getAllAudioFiles endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  
  // Extract parameters from either query or body
  const uid = req.body.uid || req.query.uid;
  try {
    if (!uid) {
      return res.status(400).json({ message: 'UID is required' });
    }

    const supabase = getSupabaseClient();

    // Retrieve all audio files for the user
    const { data: audioFiles, error: dbError } = await supabase
      .from('audio_metadata')
      .select('*')
      .eq('uid', uid);

    if (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({ message: 'Error retrieving audio files', error: dbError });
    }

    res.json({
      success: true,
      audioFiles: audioFiles || []
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get audio by UID (GET endpoint)
router.get('/getAudio/:uid', async (req, res) => {
  console.log('Request to /getAudio/:uid endpoint:', req.method);
  console.log('Request params:', req.params);
  console.log('Request query:', req.query);
  
  const { uid } = req.params;
  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'uploaded_at', 
    sortOrder = 'desc',
    search = '',
    dateFrom = '',
    dateTo = ''
  } = req.query;
  
  try {
    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    // Validate sort parameters
    const validSortFields = ['uploaded_at', 'audio_name', 'duration', 'audioid'];
    const validSortOrders = ['asc', 'desc'];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'uploaded_at';
    const finalSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    const supabase = getSupabaseClient();
    
    // Build the base query
    let query = supabase
      .from('audio_metadata')
      .select('audioid, duration, uploaded_at, audio_name, audio_url, language')
      .eq('uid', uid);

    // Add search filter if provided
    if (search && search.trim()) {
      query = query.ilike('audio_name', `%${search.trim()}%`);
    }

    // Add date range filters if provided
    if (dateFrom) {
      query = query.gte('uploaded_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('uploaded_at', dateTo);
    }

    // Get total count for pagination metadata
    let countQuery = supabase
      .from('audio_metadata')
      .select('audioid', { count: 'exact' })
      .eq('uid', uid);
    
    if (search && search.trim()) {
      countQuery = countQuery.ilike('audio_name', `%${search.trim()}%`);
    }
    if (dateFrom) {
      countQuery = countQuery.gte('uploaded_at', dateFrom);
    }
    if (dateTo) {
      countQuery = countQuery.lte('uploaded_at', dateTo);
    }
    
    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting total count:', countError);
      return res.status(500).json({ error: 'Failed to get total count' });
    }

    // Apply sorting, pagination and execute query
    const { data, error } = await query
      .order(finalSortBy, { ascending: finalSortOrder === 'asc' })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('Error retrieving audio metadata:', error);
      return res.status(500).json({ error: 'Failed to retrieve audio metadata' });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const response = {
      audioData: data,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? pageNum + 1 : null,
        prevPage: hasPrevPage ? pageNum - 1 : null
      },
      filters: {
        search: search || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        sortBy: finalSortBy,
        sortOrder: finalSortOrder
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Save XML data for audio
router.all('/sendXmlGraph', async (req, res) => {
  console.log('Request to /sendXmlGraph endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  
  // Extract parameters from either query or body
  const uid = req.body.uid || req.query.uid;
  const audioid = req.body.audioid || req.query.audioid;
  const xmlData = req.body.xmlData || req.query.xmlData;
  try {
    if (!uid || !audioid || !xmlData) {
      return res.status(400).json({ error: 'Missing required fields: uid, audioid, or xmlData' });
    }

    const supabase = getSupabaseClient();
    
    // Fetch the existing record using uid and audioid
    const { data: existingData, error: fetchError } = await supabase
      .from('audio_metadata')
      .select('file_path')
      .eq('uid', uid)
      .eq('audioid', audioid)
      .single();

    // Handle error in fetching the data
    if (fetchError && fetchError.code !== 'PGRST100') {
      return res.status(500).json({ error: fetchError.message });
    }

    // If the record exists, update it; otherwise, insert a new record
    let result;
    if (existingData) {
      result = await supabase
        .from('audio_metadata')
        .update({ xml_data: xmlData })
        .eq('uid', uid)
        .eq('audioid', audioid);
    } else {
      result = await supabase
        .from('audio_metadata')
        .insert([{ uid, audioid, file_path: '', xml_data: xmlData }]);
    }

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }

    res.json({ message: 'XML data saved successfully!', data: result.data });
  } catch (error) {
    console.error('Error in sendXmlGraph:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove an audio file and its metadata
router.all('/removeAudio', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /removeAudio endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  
  // Extract parameters from either query or body
  const uid = req.body.uid || req.query.uid;
  const audioid = req.body.audioid || req.query.audioid;
  try {
    if (!uid || !audioid) {
      return res.status(400).json({ error: 'UID and audioid are required' });
    }

    const supabase = getSupabaseClient();
    
    // Delete the audio metadata from the database
    const { error: dbError } = await supabase
      .from('audio_metadata')
      .delete()
      .eq('uid', uid)
      .eq('audioid', audioid);

    if (dbError) {
      console.error('Error deleting metadata:', dbError);
      return res.status(500).json({ error: 'Failed to delete audio metadata' });
    }

    // Delete the audio file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('user-uploads')
      .remove([`${uid}/audio/${audioid}_*`]);

    if (storageError) {
      console.error('Error deleting audio file:', storageError);
      return res.status(500).json({ error: 'Failed to delete audio file' });
    }

    return res.json({ message: 'Audio removed successfully' });
  } catch (error) {
    console.error('Error removing audio:', error);
    return res.status(500).json({ error: 'Failed to remove audio' });
  }
});

// Edit audio name
router.all('/editAudio', async (req, res) => {
  console.log('Request to /editAudio endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  
  // Extract parameters from either query or body
  const uid = req.body.uid || req.query.uid;
  const audioid = req.body.audioid || req.query.audioid;
  const updatedName = req.body.updatedName || req.query.updatedName;
  try {
    if (!uid || !audioid || !updatedName) {
      return res.status(400).json({ error: 'UID, audioid, and updated name are required' });
    }

    const supabase = getSupabaseClient();
    
    // Update the audio name in the database
    const { data, error } = await supabase
      .from('audio_metadata')
      .update({ audio_name: updatedName })
      .eq('uid', uid)
      .eq('audioid', audioid);

    if (error) {
      console.error('Error updating audio name:', error);
      return res.status(500).json({ error: 'Failed to update audio name' });
    }

    return res.json({ message: 'Audio name updated successfully', updatedAudio: data });
  } catch (error) {
    console.error('Error editing audio:', error);
    return res.status(500).json({ error: 'Failed to edit audio' });
  }
});

// Extract audio from video URL
router.all('/extractAudioFromVideo', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /extractAudioFromVideo endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  
  // Extract parameters from either query or body
  const uid = req.body.uid || req.query.uid;
  const videoUrl = req.body.videoUrl || req.query.videoUrl;
  const video_name = req.body.video_name || req.query.video_name || 'extracted_video';
  
  try {
    // Validate input
    if (!uid || !videoUrl) {
      return res.status(400).json({ message: 'UID and videoUrl are required' });
    }

    const supabase = getSupabaseClient();
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // Generate unique IDs
    const videoId = uuidv4();
    const audioId = uuidv4();
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Define file paths
    const videoFileName = `${videoId}_video.mp4`;
    const audioFileName = `${audioId}_audio.mp3`;
    const tempVideoPath = path.join(tempDir, videoFileName);
    const tempAudioPath = path.join(tempDir, audioFileName);
    
    console.log('Downloading video from URL:', videoUrl);
    
    // Download video file
    const videoResponse = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream'
    });
    
    const videoWriter = fs.createWriteStream(tempVideoPath);
    videoResponse.data.pipe(videoWriter);
    
    await new Promise((resolve, reject) => {
      videoWriter.on('finish', resolve);
      videoWriter.on('error', reject);
    });
    
    console.log('Video downloaded, extracting duration and audio...');
    
    // Get video duration using FFmpeg
    let videoDuration = null;
    try {
      const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv="p=0" "${tempVideoPath}"`;
      const { stdout: durationOutput } = await execPromise(durationCommand);
      videoDuration = parseFloat(durationOutput.trim());
      console.log('Video duration extracted:', videoDuration, 'seconds');
    } catch (durationError) {
      console.error('Duration extraction error:', durationError);
      // Continue without duration if extraction fails
    }
    
    // Extract audio using FFmpeg
    const ffmpegCommand = `ffmpeg -i "${tempVideoPath}" -vn -acodec mp3 -ab 192k -ar 44100 -y "${tempAudioPath}"`;
    
    try {
      await execPromise(ffmpegCommand);
      console.log('Audio extraction completed');
    } catch (ffmpegError) {
      console.error('FFmpeg error:', ffmpegError);
      // Clean up temp files
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
      return res.status(500).json({ message: 'Failed to extract audio from video', error: ffmpegError.message });
    }
    
    // Upload video file to Supabase Storage
    const videoFileBuffer = fs.readFileSync(tempVideoPath);
    const videoStoragePath = `users/${uid}/videoFile/${videoFileName}`;
    
    const { data: videoUploadData, error: videoUploadError } = await supabase.storage
      .from('user-uploads')
      .upload(videoStoragePath, videoFileBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });
    
    if (videoUploadError) {
      console.error('Video upload error:', videoUploadError);
      // Clean up temp files
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
      if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
      return res.status(500).json({ message: 'Failed to upload video file', error: videoUploadError });
    }
    
    // Upload audio file to Supabase Storage
    const audioFileBuffer = fs.readFileSync(tempAudioPath);
    const audioStoragePath = `users/${uid}/audioFile/${audioFileName}`;
    
    const { data: audioUploadData, error: audioUploadError } = await supabase.storage
      .from('user-uploads')
      .upload(audioStoragePath, audioFileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });
    
    if (audioUploadError) {
      console.error('Audio upload error:', audioUploadError);
      // Clean up temp files
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
      if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
      return res.status(500).json({ message: 'Failed to upload audio file', error: audioUploadError });
    }
    
    // Get public URLs
    const { data: videoPublicUrl } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(videoStoragePath);
    
    const { data: audioPublicUrl } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(audioStoragePath);
    
    // Clean up temp files
    if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
    if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    
    console.log('Video and audio processing completed successfully');
    
    // Return the URLs with duration
    res.json({
      success: true,
      message: 'Audio extracted from video successfully',
      videoUrl: videoPublicUrl.publicUrl,
      audioUrl: audioPublicUrl.publicUrl,
      videoId: videoId,
      audioId: audioId,
      video_name: video_name,
      duration: videoDuration
    });
    
  } catch (error) {
    console.error('Error extracting audio from video:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Azure Translator configuration
const azureEndpoint = 'https://api.cognitive.microsofttranslator.com';
const azureKey = process.env.AZURE_KEY;
const region = 'eastus';

// Enhanced HTTP agent for connection pooling and performance
const https = require('https');
const httpAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000,
});

// Helper function to translate text using Azure Translator with retry logic
const translateText = async (text, targetLanguage, sourceLanguage = 'en', maxRetries = 3) => {
  // Check for environment variables - try all possible environment variable names
  const translatorKey = process.env.AZURE_TRANSLATOR_KEY || process.env.AZURE_KEY || process.env.TRANSLATOR_KEY;
  const translatorEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || process.env.AZURE_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
  const translatorRegion = process.env.AZURE_TRANSLATOR_LOCATION || process.env.AZURE_REGION || process.env.AZURE_API_REGION || 'eastus';
  
  // Log API key (masked for security)
  const maskedKey = translatorKey ? `${translatorKey.substring(0, 4)}...${translatorKey.substring(translatorKey.length - 4)}` : 'undefined';
  console.log(`[TRANSLATION] Using API Key: ${maskedKey}`);
  console.log(`[TRANSLATION] Using Endpoint: ${translatorEndpoint}`);
  console.log(`[TRANSLATION] Using Region: ${translatorRegion}`);
  
  if (!translatorKey) {
    console.error('[TRANSLATION] ERROR: Azure Translator API key is not defined in environment variables');
    throw new Error('Azure Translator API key is missing');
  }
  
  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[TRANSLATION] Attempt ${attempt}/${maxRetries}: Translating "${text}" from ${sourceLanguage} to ${targetLanguage}`);
      
      const response = await axios.post(
        `${translatorEndpoint}/translate?api-version=3.0&from=${sourceLanguage}&to=${targetLanguage}`,
        [{ text }],
        {
          headers: {
            'Ocp-Apim-Subscription-Key': translatorKey,
            'Ocp-Apim-Subscription-Region': translatorRegion,
            'Content-Type': 'application/json'
          },
          timeout: 30000, // 30 second timeout
          httpsAgent: httpAgent,
          validateStatus: function (status) {
            return status >= 200 && status < 300; // default
          }
        }
      );
      
      const translatedText = response.data[0]?.translations[0]?.text || text;
      console.log(`[TRANSLATION] Success: "${text}" → "${translatedText}"`);
      return translatedText;
      
    } catch (error) {
      console.error(`[TRANSLATION] Attempt ${attempt}/${maxRetries} failed:`, error.response?.data || error.message);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error('[TRANSLATION] All retry attempts exhausted');
        throw new Error(`Translation failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Calculate exponential backoff delay (1s, 2s, 4s, etc.)
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`[TRANSLATION] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Helper function to translate large transcriptions by chunking them intelligently
const translateLargeTranscription = async (transcription, targetLanguage, sourceLanguage = 'en') => {
  // Increased chunk size for better efficiency (Azure supports up to 50K)
  const MAX_CHUNK_SIZE = 45000;
  
  // If transcription is small enough, use regular translation
  if (transcription.length <= MAX_CHUNK_SIZE) {
    return await translateText(transcription, targetLanguage, sourceLanguage);
  }
  
  console.log(`[TRANSCRIPTION] Large transcription detected (${transcription.length} chars). Chunking for translation...`);
  
  // Split transcription into chunks at sentence boundaries to preserve context
  const chunks = [];
  let currentChunk = '';
  
  // Split by sentences (periods, exclamation marks, question marks)
  const sentences = transcription.split(/([.!?]+\s+)/);
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    // If adding this sentence would exceed the limit, save current chunk and start new one
    if (currentChunk.length + sentence.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  console.log(`[TRANSCRIPTION] Split into ${chunks.length} chunks for translation`);
  
  // MEGA-OPTIMIZED parallel processing with high concurrency
  const maxConcurrency = 15; // Increased from 3 to 15 for maximum throughput
  const translatedChunks = [];
  
  for (let i = 0; i < chunks.length; i += maxConcurrency) {
    const batch = chunks.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async (chunk, index) => {
      const chunkIndex = i + index;
      console.log(`[TRANSCRIPTION] Translating chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} chars)`);
      
      try {
        const translated = await translateText(chunk, targetLanguage, sourceLanguage);
        console.log(`[TRANSCRIPTION] Chunk ${chunkIndex + 1} translated successfully`);
        return translated;
      } catch (error) {
        console.error(`[TRANSCRIPTION] Error translating chunk ${chunkIndex + 1}:`, error);
        return chunk; // Fallback to original text
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    translatedChunks.push(...batchResults);
  }
  
  // Reassemble the translated chunks
  const finalTranslation = translatedChunks.join(' ');
  console.log(`[TRANSCRIPTION] Large transcription translation completed. Final length: ${finalTranslation.length} chars`);
  
  return finalTranslation;
};

// Helper function to translate multiple texts in batch with retry logic
const translateBatch = async (texts, targetLanguage, sourceLanguage = 'en', maxRetries = 3) => {
  console.log(`[BATCH TRANSLATION] Starting batch translation of ${texts.length} items from ${sourceLanguage} to ${targetLanguage}`);
  console.log(`[BATCH TRANSLATION] First few items: ${texts.slice(0, 3).join(', ')}${texts.length > 3 ? '...' : ''}`);
  
  // Check for environment variables - try all possible environment variable names
  const translatorKey = process.env.AZURE_TRANSLATOR_KEY || process.env.AZURE_KEY || process.env.TRANSLATOR_KEY;
  const translatorEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || process.env.AZURE_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
  const translatorRegion = process.env.AZURE_TRANSLATOR_LOCATION || process.env.AZURE_REGION || process.env.AZURE_API_REGION || 'eastus';
  
  // Log environment variables for debugging
  console.log('[BATCH TRANSLATION] Environment variables check:');
  console.log(`AZURE_TRANSLATOR_KEY: ${process.env.AZURE_TRANSLATOR_KEY ? 'defined' : 'undefined'}`);
  console.log(`AZURE_KEY: ${process.env.AZURE_KEY ? 'defined' : 'undefined'}`);
  console.log(`TRANSLATOR_KEY: ${process.env.TRANSLATOR_KEY ? 'defined' : 'undefined'}`);
  
  // Log API key (masked for security)
  const maskedKey = translatorKey ? `${translatorKey.substring(0, 4)}...${translatorKey.substring(translatorKey.length - 4)}` : 'undefined';
  console.log(`[BATCH TRANSLATION] Using API Key: ${maskedKey}`);
  console.log(`[BATCH TRANSLATION] Using Endpoint: ${translatorEndpoint}`);
  console.log(`[BATCH TRANSLATION] Using Region: ${translatorRegion}`);
  
  if (!translatorKey) {
    console.error('[BATCH TRANSLATION] ERROR: Azure Translator API key is not defined in environment variables');
    throw new Error('Azure Translator API key is missing');
  }
  
  // Prepare the request body with multiple text entries
  const requestBody = texts.map(text => ({ text }));
  
  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[BATCH TRANSLATION] Attempt ${attempt}/${maxRetries}: Sending request to Azure Translator API with ${requestBody.length} items`);
      const startTime = Date.now();
      
      const response = await axios.post(
        `${translatorEndpoint}/translate?api-version=3.0&from=${sourceLanguage}&to=${targetLanguage}`,
        requestBody,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': translatorKey,
            'Ocp-Apim-Subscription-Region': translatorRegion,
            'Content-Type': 'application/json'
          },
          timeout: 60000, // Increased timeout to 60 seconds for large batches
          httpsAgent: httpAgent, // Use connection pooling
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          }
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`[BATCH TRANSLATION] Received response from Azure Translator API in ${duration}ms`);
      console.log(`[BATCH TRANSLATION] Response contains ${response.data.length} translated items`);
      
      if (response.data.length > 0) {
        console.log(`[BATCH TRANSLATION] Sample translation: "${texts[0]}" → "${response.data[0].translations[0]?.text || ''}"`);
      }
      
      // Return an array of translated texts
      return response.data.map(item => item.translations[0]?.text || '');
      
    } catch (error) {
      console.error(`[BATCH TRANSLATION] Attempt ${attempt}/${maxRetries} failed:`, error.response?.data || error.message);
      
      if (error.response) {
        console.error('[BATCH TRANSLATION] Status:', error.response.status);
        console.error('[BATCH TRANSLATION] Headers:', JSON.stringify(error.response.headers));
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error('[BATCH TRANSLATION] All retry attempts exhausted');
        throw new Error(`Batch translation failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Calculate exponential backoff delay (1s, 2s, 4s, etc.)
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`[BATCH TRANSLATION] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// ULTRA-HIGH PERFORMANCE parallel batch translation function
// Enhanced cache with LRU eviction and compression
const translationCache = new Map();
let cacheLastCleared = Date.now();
const MAX_CACHE_SIZE = 50000; // Increased cache size

const clearCacheIfNeeded = () => {
  const now = Date.now();
  if (now - cacheLastCleared > 3600000) { // 1 hour
    translationCache.clear();
    cacheLastCleared = now;
    console.log('[CACHE] Translation cache cleared after 1 hour');
  }
  
  // LRU eviction if cache gets too large
  if (translationCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(translationCache.keys()).slice(0, MAX_CACHE_SIZE * 0.2);
    keysToDelete.forEach(key => translationCache.delete(key));
    console.log(`[CACHE] LRU eviction: removed ${keysToDelete.length} entries`);
  }
};

const getCacheKey = (text, targetLanguage, sourceLanguage) => {
  return `${sourceLanguage}:${targetLanguage}:${text}`;
};

// MEGA-OPTIMIZED translation function for massive datasets
const translateBatchesUltraFast = async (texts, targetLanguage, sourceLanguage = 'en') => {
  clearCacheIfNeeded();
  
  const totalTexts = texts.length;
  console.log(`[ULTRA-FAST TRANSLATION] Starting MEGA-optimized translation of ${totalTexts} items`);
  
  // ULTRA-HIGH PERFORMANCE configuration for massive datasets
  const batchSize = 1000; // Increased from 500 to 1000 (Azure supports up to 1000 texts per request)
  const maxConcurrency = 25; // Increased from 10 to 25 for maximum throughput
  
  console.log(`[ULTRA-FAST TRANSLATION] MEGA config: batchSize=${batchSize}, maxConcurrency=${maxConcurrency}`);
  
  // INTELLIGENT DEDUPLICATION: Check cache and deduplicate texts
  const cachedResults = [];
  const uncachedTexts = [];
  const uncachedIndices = [];
  const textFrequency = new Map(); // Track frequency of each unique text
  const uniqueTexts = new Map(); // Map unique text to first occurrence index
  
  texts.forEach((text, index) => {
    const cacheKey = getCacheKey(text, targetLanguage, sourceLanguage);
    const cached = translationCache.get(cacheKey);
    
    if (cached) {
      cachedResults[index] = cached;
    } else {
      // Track frequency for deduplication
      textFrequency.set(text, (textFrequency.get(text) || 0) + 1);
      
      // Only add unique texts to uncached list
      if (!uniqueTexts.has(text)) {
        uniqueTexts.set(text, uncachedTexts.length);
        uncachedTexts.push(text);
      }
      uncachedIndices.push(index);
    }
  });
  
  const deduplicationRate = uncachedTexts.length > 0 ? 
    ((uncachedIndices.length - uncachedTexts.length) / uncachedIndices.length * 100).toFixed(1) : 0;
  console.log(`[DEDUPLICATION] Reduced ${uncachedIndices.length} texts to ${uncachedTexts.length} unique texts (${deduplicationRate}% reduction)`);
  
  const cacheHitRate = ((totalTexts - uncachedTexts.length) / totalTexts * 100).toFixed(1);
  console.log(`[ULTRA-FAST TRANSLATION] Cache hit rate: ${cacheHitRate}% (${totalTexts - uncachedTexts.length}/${totalTexts} cached)`);
  
  if (uncachedTexts.length === 0) {
    console.log(`[ULTRA-FAST TRANSLATION] All texts found in cache, returning immediately`);
    const results = new Array(totalTexts);
    texts.forEach((text, index) => {
      results[index] = cachedResults.get(text);
    });
    return results;
  }
  
  // Create optimized batches for uncached texts
  const batches = [];
  for (let i = 0; i < uncachedTexts.length; i += batchSize) {
    batches.push({
      texts: uncachedTexts.slice(i, i + batchSize),
      startIndex: i
    });
  }
  
  console.log(`[ULTRA-FAST TRANSLATION] Created ${batches.length} MEGA batches for ${uncachedTexts.length} uncached texts`);
  
  const startTime = Date.now();
  const translationResults = new Map();
  
  // ULTRA-HIGH CONCURRENCY processing with advanced semaphore
  const semaphore = {
    count: maxConcurrency,
    waiters: [],
    acquired: 0,
    maxAcquired: 0
  };
  
  const acquire = () => {
    return new Promise((resolve) => {
      if (semaphore.count > 0) {
        semaphore.count--;
        semaphore.acquired++;
        semaphore.maxAcquired = Math.max(semaphore.maxAcquired, semaphore.acquired);
        resolve();
      } else {
        semaphore.waiters.push(resolve);
      }
    });
  };
  
  const release = () => {
    semaphore.count++;
    semaphore.acquired--;
    if (semaphore.waiters.length > 0) {
      const waiter = semaphore.waiters.shift();
      semaphore.count--;
      semaphore.acquired++;
      waiter();
    }
  };
  
  const batchPromises = batches.map(async (batch, batchIndex) => {
    await acquire();
    
    try {
      console.log(`[ULTRA-FAST TRANSLATION] Processing MEGA batch ${batchIndex + 1}/${batches.length} (${batch.texts.length} items)`);
      const batchStartTime = Date.now();
      
      const translatedBatch = await translateBatch(batch.texts, targetLanguage, sourceLanguage);
      
      // Cache the results
      batch.texts.forEach((originalText, localIndex) => {
        const translatedText = translatedBatch[localIndex] || originalText;
        
        // Cache the translation
        const cacheKey = getCacheKey(originalText, targetLanguage, sourceLanguage);
        translationCache.set(cacheKey, translatedText);
        
        // Store in results map
        translationResults.set(originalText, translatedText);
      });
      
      const batchEndTime = Date.now();
      console.log(`[ULTRA-FAST TRANSLATION] MEGA batch ${batchIndex + 1} completed in ${batchEndTime - batchStartTime}ms`);
      
    } catch (error) {
      console.error(`[ULTRA-FAST TRANSLATION] MEGA batch ${batchIndex + 1} failed:`, error.message);
      
      // Fallback: use original texts
      batch.texts.forEach((originalText) => {
        translationResults.set(originalText, originalText);
      });
    } finally {
      release();
    }
  });
  
  await Promise.all(batchPromises);
  
  // INTELLIGENT RESULT RECONSTRUCTION with deduplication mapping
  const results = new Array(totalTexts);
  texts.forEach((text, index) => {
    // Check cached results first (array-based), then translation results (Map-based)
    const translated = cachedResults[index] || translationResults.get(text) || text;
    results[index] = translated;
  });
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  
  console.log(`[ULTRA-FAST TRANSLATION] MEGA-optimized processing completed in ${totalDuration}ms (${(totalDuration/1000).toFixed(2)} seconds)`);
  console.log(`[ULTRA-FAST TRANSLATION] Successfully processed ${totalTexts} items with ${cacheHitRate}% cache efficiency`);
  console.log(`[ULTRA-FAST TRANSLATION] Deduplication saved ${((totalTexts - uniqueTexts.length) / totalTexts * 100).toFixed(1)}% API calls`);
  console.log(`[ULTRA-FAST TRANSLATION] Max concurrent batches: ${semaphore.maxAcquired}/${maxConcurrency}`);
  console.log(`[ULTRA-FAST TRANSLATION] Cache size: ${translationCache.size} entries`);
  console.log(`[ULTRA-FAST TRANSLATION] Performance: ${(totalTexts / (totalDuration / 1000)).toFixed(0)} words/second`);
  
  return results;
};

// Translate audio text endpoint
router.all('/translateAudioText', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const requestStartTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] Request to /translateAudioText endpoint:`, req.method);
  console.log(`[${requestId}] Request body:`, req.body);
  
  const { uid, audioid, language } = req.body;
  
  // Set up request timeout for very large operations (5 minutes)
  const requestTimeout = setTimeout(() => {
    console.error(`[${requestId}] Request timeout after 5 minutes`);
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: 'Request timeout - translation taking too long',
        requestId
      });
    }
  }, 300000); // 5 minutes
  
  try {
    // Validate required parameters
    if (!uid || !audioid || !language) {
      return res.status(400).json({ 
        success: false,
        message: 'UID, audioid, and language are required' 
      });
    }

    // Deduct 1 coin for translation
    console.log('Deducting 2 coin for translation...');
    const coinResult = await deductCoins(uid, 3, 'Audio Translation');
    if (!coinResult.success) {
      console.log('Coin deduction failed:', coinResult.message);
      return res.status(400).json({ 
        success: false,
        message: coinResult.message
      });
    }

    console.log('Coins deducted successfully, proceeding with translation');

    const supabase = getSupabaseClient();

    // Fetch the audio metadata and word data
    const { data: audioData, error: fetchError } = await supabase
      .from('audio_metadata')
      .select('words_data, transcription, translated_data, language')
      .eq('uid', uid)
      .eq('audioid', audioid)
      .single();

    if (fetchError || !audioData) {
      console.error('Error fetching audio data:', fetchError);
      return res.status(404).json({ 
        success: false,
        message: 'Audio not found' 
      });
    }

    // Check if translation already exists for this language
    const existingTranslatedData = audioData.translated_data || {};
    if (existingTranslatedData[language]) {
      return res.json({
        success: true,
        message: 'Translation already exists for this language',
        translatedData: existingTranslatedData[language],
        language
      });
    }

    // Check if words_data exists
    if (!audioData.words_data || !Array.isArray(audioData.words_data)) {
      return res.status(400).json({ 
        success: false,
        message: 'No word data available for translation' 
      });
    }

    console.log(`Translating from ${audioData.language} to ${language}...`);
    
    // Translate words using optimized parallel processing
    const originalWords = audioData.words_data;
    const translatedWords = [];
    
    console.log(`[TRANSLATION] Starting optimized translation process for UID: ${uid}, AudioID: ${audioid}`);
    console.log(`[TRANSLATION] Total words to translate: ${originalWords.length}`);
    console.log(`[TRANSLATION] Target language: ${language}, Source language: ${audioData.language || 'en'}`);
    
    const sourceLanguage = audioData.language || 'en';
    const startTime = Date.now();
    
    try {
      // Check if we need streaming processing for very large datasets
      const isVeryLargeDataset = originalWords.length > 50000;
      
      if (isVeryLargeDataset) {
        console.log(`[TRANSLATION] Very large dataset detected (${originalWords.length} words). Using streaming processing...`);
        
        // Streaming processing for very large datasets
        const STREAM_CHUNK_SIZE = 10000; // Process 10k words at a time
        const chunks = [];
        
        for (let i = 0; i < originalWords.length; i += STREAM_CHUNK_SIZE) {
          chunks.push(originalWords.slice(i, i + STREAM_CHUNK_SIZE));
        }
        
        console.log(`[TRANSLATION] Split into ${chunks.length} streaming chunks of ${STREAM_CHUNK_SIZE} words each`);
        
        // Process chunks sequentially to manage memory
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunk = chunks[chunkIndex];
          const chunkStartTime = Date.now();
          
          console.log(`[TRANSLATION] Processing streaming chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} words)`);
          
          // Process this chunk with the same optimization logic
          const uniqueTextsMap = new Map();
          
          chunk.forEach((wordObj) => {
            const word = wordObj.word;
            const punctuatedWord = wordObj.punctuated_word || wordObj.word;
            
            uniqueTextsMap.set(word, word);
            if (punctuatedWord !== word) {
              uniqueTextsMap.set(punctuatedWord, punctuatedWord);
            }
          });
          
          const uniqueTexts = Array.from(uniqueTextsMap.keys());
          console.log(`[TRANSLATION] Chunk ${chunkIndex + 1}: ${chunk.length} words → ${uniqueTexts.length} unique texts`);
          
          // Translate this chunk
          const translatedTexts = await translateBatchesUltraFast(uniqueTexts, language, sourceLanguage);
          
          // Create translation map for this chunk
          const translationMap = new Map();
          uniqueTexts.forEach((text, index) => {
            translationMap.set(text, translatedTexts[index] || text);
          });
          
          // Build translated words for this chunk
          chunk.forEach((wordObj) => {
            const word = wordObj.word;
            const punctuatedWord = wordObj.punctuated_word || wordObj.word;
            
            const translatedWord = translationMap.get(word) || word;
            const translatedPunctuatedWord = translationMap.get(punctuatedWord) || translatedWord;
            
            translatedWords.push({
              end: wordObj.end,
              word: translatedWord,
              start: wordObj.start,
              confidence: wordObj.confidence,
              punctuated_word: translatedPunctuatedWord,
              original_word: wordObj.word,
              original_punctuated_word: wordObj.punctuated_word || wordObj.word
            });
          });
          
          const chunkEndTime = Date.now();
          console.log(`[TRANSLATION] Chunk ${chunkIndex + 1} completed in ${chunkEndTime - chunkStartTime}ms`);
          
          // Force garbage collection hint for very large datasets
          if (global.gc && chunkIndex % 5 === 0) {
            global.gc();
          }
        }
        
      } else {
        // Standard processing for smaller datasets
        console.log(`[TRANSLATION] Standard processing for ${originalWords.length} words`);
        
        // Create a unique set of texts to translate (eliminates duplicates)
        const uniqueTextsMap = new Map();
        const wordIndexMap = new Map();
        const punctuatedWordIndexMap = new Map();
        
        originalWords.forEach((wordObj, index) => {
          const word = wordObj.word;
          const punctuatedWord = wordObj.punctuated_word || wordObj.word;
          
          // Track unique words and their indices
          if (!uniqueTextsMap.has(word)) {
            uniqueTextsMap.set(word, word);
            wordIndexMap.set(word, []);
          }
          wordIndexMap.get(word).push(index);
          
          // Track unique punctuated words and their indices (only if different from word)
          if (punctuatedWord !== word && !uniqueTextsMap.has(punctuatedWord)) {
            uniqueTextsMap.set(punctuatedWord, punctuatedWord);
            punctuatedWordIndexMap.set(punctuatedWord, []);
          }
          if (punctuatedWord !== word) {
            if (!punctuatedWordIndexMap.has(punctuatedWord)) {
              punctuatedWordIndexMap.set(punctuatedWord, []);
            }
            punctuatedWordIndexMap.get(punctuatedWord).push(index);
          }
        });
        
        const uniqueTexts = Array.from(uniqueTextsMap.keys());
        console.log(`[TRANSLATION] Optimized: ${originalWords.length} total words reduced to ${uniqueTexts.length} unique texts`);
        console.log(`[TRANSLATION] Deduplication saved ${((originalWords.length * 2 - uniqueTexts.length) / (originalWords.length * 2) * 100).toFixed(1)}% of translation requests`);
        
        // Translate all unique texts using ultra-fast processing
        const translatedTexts = await translateBatchesUltraFast(uniqueTexts, language, sourceLanguage);
        
        // Create translation map
        const translationMap = new Map();
        uniqueTexts.forEach((text, index) => {
          translationMap.set(text, translatedTexts[index] || text);
        });
        
        console.log(`[TRANSLATION] Building final word structure...`);
        
        // Build the final translated words array
        originalWords.forEach((wordObj, index) => {
          const word = wordObj.word;
          const punctuatedWord = wordObj.punctuated_word || wordObj.word;
          
          const translatedWord = translationMap.get(word) || word;
          const translatedPunctuatedWord = translationMap.get(punctuatedWord) || translatedWord;
          
          translatedWords.push({
            end: wordObj.end,
            word: translatedWord,
            start: wordObj.start,
            confidence: wordObj.confidence,
            punctuated_word: translatedPunctuatedWord,
            original_word: wordObj.word,
            original_punctuated_word: wordObj.punctuated_word || wordObj.word
          });
        });
      }
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      console.log(`[TRANSLATION] Optimized translation process completed in ${totalDuration}ms (${(totalDuration/1000).toFixed(2)} seconds)`);
      console.log(`[TRANSLATION] Successfully translated ${translatedWords.length} words using ${uniqueTexts.length} API calls`);
      
    } catch (error) {
      console.error('[TRANSLATION] Error in optimized translation:', error);
      
      // Fallback to original words if translation fails
      console.log('[TRANSLATION] Falling back to original words due to error');
      originalWords.forEach(wordObj => {
        translatedWords.push({
          end: wordObj.end,
          word: wordObj.word,
          start: wordObj.start,
          confidence: wordObj.confidence,
          punctuated_word: wordObj.punctuated_word || wordObj.word,
          original_word: wordObj.word,
          original_punctuated_word: wordObj.punctuated_word || wordObj.word
        });
      });
      
      const endTime = Date.now();
      console.log(`[TRANSLATION] Process failed after ${endTime - startTime}ms`);
    }

    // Translate the full transcription in parallel with word processing using intelligent chunking
    let translatedTranscription = '';
    const transcriptionPromise = (async () => {
      try {
        console.log('[TRANSCRIPTION] Starting parallel transcription translation...');
        const result = await translateLargeTranscription(
          audioData.transcription, 
          language, 
          audioData.language || 'en'
        );
        console.log('[TRANSCRIPTION] Transcription translation completed');
        return result;
      } catch (error) {
        console.error('Error translating transcription:', error);
        return audioData.transcription; // Fallback to original
      }
    })();
    
    // Wait for transcription translation to complete
    translatedTranscription = await transcriptionPromise;

    // Prepare the translated data structure
    const newTranslatedData = {
      words: translatedWords,
      transcription: translatedTranscription,
      translated_at: new Date().toLocaleString('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(', ', 'T') + '.000Z',
      source_language: audioData.language || 'en',
      target_language: language
    };

    // Update the translated_data in the database with optimized retry logic
    const updatedTranslatedData = {
      ...existingTranslatedData,
      [language]: newTranslatedData
    };

    console.log(`[DATABASE UPDATE] Attempting to save ${translatedWords.length} translated words for language: ${language}`);
    
    // ULTRA-OPTIMIZED database update with chunking and advanced retry logic
    const updateWithRetry = async (retries = 5) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`[DATABASE UPDATE] Attempt ${attempt}/${retries} - Updating translated data...`);
          
          // For large datasets, use ultra-aggressive chunked updates to avoid timeouts
          if (translatedWords.length > 1000) {
            console.log(`[DATABASE UPDATE] Large dataset detected (${translatedWords.length} words), using ultra-aggressive chunked update strategy`);
            
            // Progressive chunk size reduction strategy based on attempt number
            let baseChunkSize = 500; // Start with 500 words
            if (attempt > 1) {
              baseChunkSize = Math.max(100, Math.floor(baseChunkSize / Math.pow(2, attempt - 1)));
            }
            
            console.log(`[DATABASE UPDATE] Using chunk size: ${baseChunkSize} words for attempt ${attempt}`);
            
            // Split into smaller chunks and update incrementally
            const chunks = [];
            for (let i = 0; i < translatedWords.length; i += baseChunkSize) {
              chunks.push(translatedWords.slice(i, i + baseChunkSize));
            }
            
            // Update in chunks with progress tracking and timeout protection
            let processedWords = 0;
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
              const chunk = chunks[chunkIndex];
              
              // Create minimal chunk data to reduce payload size
              const chunkTranslatedData = {
                ...existingTranslatedData,
                [language]: {
                  words: chunk.map(word => ({
                    original: word.word,
                    translated: word.translated,
                    start_time: word.start_time,
                    end_time: word.end_time
                  })),
                  transcription: translatedTranscription,
                  target_language: language,
                  chunk_info: {
                    chunk: chunkIndex + 1,
                    total_chunks: chunks.length,
                    words_in_chunk: chunk.length,
                    total_words: translatedWords.length,
                    attempt: attempt
                  }
                }
              };
              
              // Use timeout protection for each chunk
              const chunkStartTime = Date.now();
              try {
                const { error: chunkError } = await Promise.race([
                  supabase
                    .from('audio_metadata')
                    .update({ translated_data: chunkTranslatedData })
                    .eq('uid', uid)
                    .eq('audioid', audioid),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Chunk operation timeout')), 10000) // 10 second timeout per chunk
                  )
                ]);
                
                if (chunkError) {
                  throw chunkError;
                }
                
                processedWords += chunk.length;
                const chunkTime = Date.now() - chunkStartTime;
                console.log(`[DATABASE UPDATE] Chunk ${chunkIndex + 1}/${chunks.length} saved in ${chunkTime}ms (${processedWords}/${translatedWords.length} words)`);
                
                // Adaptive delay based on chunk processing time and attempt number
                const baseDelay = Math.min(300, Math.max(50, chunkTime / 5));
                const attemptMultiplier = Math.pow(1.5, attempt - 1);
                const delay = Math.floor(baseDelay * attemptMultiplier);
                
                if (chunkIndex < chunks.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
                
              } catch (chunkError) {
                console.error(`[DATABASE UPDATE] Chunk ${chunkIndex + 1} failed:`, chunkError.message);
                throw chunkError; // Re-throw to trigger retry with smaller chunks
              }
            }
            
            console.log(`[DATABASE UPDATE] All ${chunks.length} chunks saved successfully with chunk size ${baseChunkSize}`);
            
          } else {
            // Standard update for smaller datasets
            const { error: updateError } = await supabase
              .from('audio_metadata')
              .update({ 
                translated_data: updatedTranslatedData
              })
              .eq('uid', uid)
              .eq('audioid', audioid);

            if (updateError) {
              throw updateError;
            }
          }
          
          console.log(`[DATABASE UPDATE] Successfully saved translated data on attempt ${attempt}`);
          return { success: true };
          
        } catch (error) {
          console.error(`[DATABASE UPDATE] Attempt ${attempt} failed:`, error);
          
          if (error.code === '57014' || error.message.includes('timeout')) {
            // Database timeout - use exponential backoff
            const delay = Math.min(Math.pow(2, attempt) * 1000, 30000); // Max 30s delay
            console.log(`[DATABASE UPDATE] Timeout detected, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (error.code === '23505') {
            // Unique constraint violation - data might already exist
            console.log(`[DATABASE UPDATE] Data already exists, skipping update`);
            return { success: true };
          } else if (attempt < retries) {
            // Other errors - shorter delay
            const delay = 1000 * attempt;
            console.log(`[DATABASE UPDATE] Error occurred, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          if (attempt === retries) {
            throw error;
          }
        }
      }
    };

    try {
      await updateWithRetry(5); // Increased retries for large datasets
    } catch (updateError) {
      console.error(`[${requestId}] Error updating translated data after all retries:`, updateError);
      clearTimeout(requestTimeout);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Error saving translated data. Please try again.';
      if (updateError.code === '57014' || updateError.message.includes('timeout')) {
        errorMessage = 'Database timeout while saving large translation. The translation was completed but saving failed. Please try again with a smaller text or contact support.';
      } else if (updateError.code === '23505') {
        errorMessage = 'Translation data already exists for this language.';
      } else if (updateError.message.includes('payload too large')) {
        errorMessage = 'Translation data is too large to save. Please try translating smaller segments.';
      }
      
      return res.status(500).json({ 
        success: false,
        message: errorMessage,
        errorCode: updateError.code,
        requestId,
        processingTime: Date.now() - requestStartTime
      });
    }

    const totalProcessingTime = Date.now() - requestStartTime;
    console.log(`[${requestId}] Translation completed successfully for language: ${language} in ${totalProcessingTime}ms`);
    
    // Clear the timeout since we're responding successfully
    clearTimeout(requestTimeout);
    
    res.json({
      success: true,
      message: 'Translation completed successfully',
      translatedData: newTranslatedData,
      language,
      wordsTranslated: translatedWords.length
    });

  } catch (error) {
    console.error(`[${requestId}] Error in translateAudioText:`, error);
    
    // Clear timeout to prevent duplicate responses
    clearTimeout(requestTimeout);
    
    // Don't send response if headers already sent (timeout already responded)
    if (res.headersSent) {
      console.error(`[${requestId}] Headers already sent, cannot send error response`);
      return;
    }
    
    // Categorize errors and provide appropriate responses
    let statusCode = 500;
    let errorMessage = 'Internal server error during translation';
    
    if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
      statusCode = 408;
      errorMessage = 'Translation request timed out. Please try with smaller text segments.';
    } else if (error.message.includes('rate limit') || error.response?.status === 429) {
      statusCode = 429;
      errorMessage = 'Translation service rate limit exceeded. Please try again in a few minutes.';
    } else if (error.message.includes('quota') || error.response?.status === 403) {
      statusCode = 403;
      errorMessage = 'Translation service quota exceeded. Please contact support.';
    } else if (error.message.includes('network') || error.code === 'ENOTFOUND') {
      statusCode = 503;
      errorMessage = 'Translation service temporarily unavailable. Please try again later.';
    } else if (error.message.includes('payload too large')) {
      statusCode = 413;
      errorMessage = 'Text too large for translation. Please split into smaller segments.';
    } else if (error.response?.status >= 400 && error.response?.status < 500) {
      statusCode = error.response.status;
      errorMessage = 'Translation service error. Please check your input and try again.';
    }
    
    const processingTime = Date.now() - requestStartTime;
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId,
      processingTime,
      errorType: error.constructor.name,
      timestamp: new Date().toISOString()
    });
  }
});

// Edit specific word in word_data
router.all('/editWordData', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { uid, audioId, wordIndex, newWord, newPunctuatedWord } = req.body;

    // Validate required parameters
    if (!uid || !audioId || wordIndex === undefined || !newWord) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: uid, audioId, wordIndex, and newWord are required'
      });
    }

    const supabase = getSupabaseClient();

    // First, verify the user owns this audio file
    const { data: audioData, error: fetchError } = await supabase
      .from('audio_metadata')
      .select('*')
      .eq('audioid', audioId)
      .eq('uid', uid)
      .single();

    if (fetchError || !audioData) {
      return res.status(404).json({
        success: false,
        message: 'Audio file not found or access denied'
      });
    }

    // Check if words_data exists and is an array
    if (!Array.isArray(audioData.words_data)) {
      return res.status(400).json({
        success: false,
        message: 'No word data available for this audio file'
      });
    }

    // Validate wordIndex
    if (wordIndex < 0 || wordIndex >= audioData.words_data.length) {
      return res.status(400).json({
        success: false,
        message: `Invalid word index. Must be between 0 and ${audioData.words_data.length - 1}`
      });
    }

    // Create a copy of the words_data array
    const updatedWordsData = [...audioData.words_data];
    
    // Update the specific word
    updatedWordsData[wordIndex] = {
      ...updatedWordsData[wordIndex],
      word: newWord,
      punctuated_word: newPunctuatedWord || newWord
    };

    // Update the database
    const { error: updateError } = await supabase
      .from('audio_metadata')
      .update({ words_data: updatedWordsData })
      .eq('audioid', audioId)
      .eq('uid', uid);

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update word data'
      });
    }

    res.json({
      success: true,
      message: 'Word data updated successfully',
      updatedWord: {
        index: wordIndex,
        oldWord: audioData.words_data[wordIndex].word,
        newWord: newWord,
        oldPunctuatedWord: audioData.words_data[wordIndex].punctuated_word,
        newPunctuatedWord: newPunctuatedWord || newWord
      }
    });

  } catch (error) {
    console.error('Error in editWordData:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;