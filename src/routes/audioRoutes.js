const express = require("express");
const { getSupabaseClient } = require("../config/database.js");
const { v4: uuidv4 } = require("uuid");
const axios = require('axios');

const router = express.Router();

// Helper function to deduct coins using the subtractCoins API
const deductCoins = async (uid, coinAmount, transactionName) => {
  // Development mode bypass - if NODE_ENV is development or if BYPASS_COIN_DEDUCTION is set
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.BYPASS_COIN_DEDUCTION === 'true';
  
  if (isDevelopment) {
    console.log(`[DEV MODE] Bypassing coin deduction for ${transactionName} (${coinAmount} coins)`);
    return { success: true, message: 'Development mode - coin deduction bypassed' };
  }

  try {
    console.log(`[COIN DEDUCTION] Attempting to deduct ${coinAmount} coins for ${transactionName} (UID: ${uid})`);
    
    const response = await axios.post('https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run/api/user/subtractCoins', {
      uid,
      coinAmount,
      transaction_name: transactionName,
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
    const coinResult = await deductCoins(uid, coinCost, 'Audio Transcription');
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
        uploaded_at: new Date().toLocaleString('en-CA', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(', ', 'T') + '.000Z'
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
          timeout: 30000, // 30 second timeout
          validateStatus: function (status) {
            return status >= 200 && status < 300; // default
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

// Translate audio text endpoint
router.all('/translateAudioText', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /translateAudioText endpoint:', req.method);
  console.log('Request body:', req.body);
  
  const { uid, audioid, language } = req.body;
  
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
    
    // Translate words in batches for better performance
    const originalWords = audioData.words_data;
    const translatedWords = [];
    
    console.log(`[TRANSLATION] Starting translation process for UID: ${uid}, AudioID: ${audioid}`);
    console.log(`[TRANSLATION] Total words to translate: ${originalWords.length}`);
    console.log(`[TRANSLATION] Target language: ${language}, Source language: ${audioData.language || 'en'}`);
    
    // Prepare batches of words to translate (maximum 25 items per batch to avoid API limits)
    const BATCH_SIZE = 25;
    const sourceLanguage = audioData.language || 'en';
    
    const startTime = Date.now();
    
    try {
      // Extract all words and punctuated words that need translation
      const wordsToTranslate = [];
      const punctuatedWordsToTranslate = [];
      
      originalWords.forEach(wordObj => {
        wordsToTranslate.push(wordObj.word);
        punctuatedWordsToTranslate.push(wordObj.punctuated_word || wordObj.word);
      });
      
      console.log(`[TRANSLATION] Prepared ${wordsToTranslate.length} regular words and ${punctuatedWordsToTranslate.length} punctuated words for translation`);
      
      // Process words in batches
      const translatedWordsBatches = [];
      const translatedPunctuatedWordsBatches = [];
      
      // Process regular words
      console.log(`[TRANSLATION] Starting batch translation of regular words with batch size ${BATCH_SIZE}`);
      for (let i = 0; i < wordsToTranslate.length; i += BATCH_SIZE) {
        const batchStartTime = Date.now();
        const batch = wordsToTranslate.slice(i, i + BATCH_SIZE);
        console.log(`[TRANSLATION] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(wordsToTranslate.length/BATCH_SIZE)} (${batch.length} words)`);
        
        const translatedBatch = await translateBatch(batch, language, sourceLanguage);
        translatedWordsBatches.push(...translatedBatch);
        
        const batchEndTime = Date.now();
        console.log(`[TRANSLATION] Batch ${Math.floor(i/BATCH_SIZE) + 1} completed in ${batchEndTime - batchStartTime}ms`);
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < wordsToTranslate.length) {
          console.log(`[TRANSLATION] Adding delay between batches (200ms)`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Process punctuated words
      console.log(`[TRANSLATION] Starting batch translation of punctuated words with batch size ${BATCH_SIZE}`);
      for (let i = 0; i < punctuatedWordsToTranslate.length; i += BATCH_SIZE) {
        const batchStartTime = Date.now();
        const batch = punctuatedWordsToTranslate.slice(i, i + BATCH_SIZE);
        console.log(`[TRANSLATION] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(punctuatedWordsToTranslate.length/BATCH_SIZE)} (${batch.length} punctuated words)`);
        
        const translatedBatch = await translateBatch(batch, language, sourceLanguage);
        translatedPunctuatedWordsBatches.push(...translatedBatch);
        
        const batchEndTime = Date.now();
        console.log(`[TRANSLATION] Batch ${Math.floor(i/BATCH_SIZE) + 1} completed in ${batchEndTime - batchStartTime}ms`);
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < punctuatedWordsToTranslate.length) {
          console.log(`[TRANSLATION] Adding delay between batches (200ms)`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`[TRANSLATION] All batches processed. Combining results...`);
      
      // Combine the results with the original structure
      originalWords.forEach((wordObj, index) => {
        translatedWords.push({
          end: wordObj.end,
          word: translatedWordsBatches[index] || wordObj.word,
          start: wordObj.start,
          confidence: wordObj.confidence,
          punctuated_word: translatedPunctuatedWordsBatches[index] || wordObj.punctuated_word || wordObj.word,
          original_word: wordObj.word,
          original_punctuated_word: wordObj.punctuated_word || wordObj.word
        });
      });
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      console.log(`[TRANSLATION] Translation process completed in ${totalDuration}ms (${(totalDuration/1000).toFixed(2)} seconds)`);
      console.log(`[TRANSLATION] Successfully translated ${translatedWords.length} words`);
      
    } catch (error) {
      console.error('[TRANSLATION] Error in batch translation:', error);
      
      // Fallback to original words if batch translation fails
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

    // Translate the full transcription
    let translatedTranscription = '';
    try {
      translatedTranscription = await translateText(
        audioData.transcription, 
        language, 
        audioData.language || 'en'
      );
    } catch (error) {
      console.error('Error translating transcription:', error);
      translatedTranscription = audioData.transcription; // Fallback to original
    }

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

    // Update the translated_data in the database
    const updatedTranslatedData = {
      ...existingTranslatedData,
      [language]: newTranslatedData
    };

    const { error: updateError } = await supabase
      .from('audio_metadata')
      .update({ translated_data: updatedTranslatedData })
      .eq('uid', uid)
      .eq('audioid', audioid);

    if (updateError) {
      console.error('Error updating translated data:', updateError);
      return res.status(500).json({ 
        success: false,
        message: 'Error saving translated data' 
      });
    }

    console.log(`Translation completed successfully for language: ${language}`);
    
    res.json({
      success: true,
      message: 'Translation completed successfully',
      translatedData: newTranslatedData,
      language,
      wordsTranslated: translatedWords.length
    });

  } catch (error) {
    console.error('Error in translateAudioText:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
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