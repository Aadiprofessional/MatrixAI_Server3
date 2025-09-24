// detectionRoutes.js
const express = require('express');
const axios = require('axios');
const uuid = require('uuid');
const uuidv4 = uuid.v4;
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// === Supabase client setup ===
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase config');
  return createClient(supabaseUrl, supabaseKey);
};

// === Coin deduction helper ===
const deductCoins = async (uid, coinAmount, transactionName) => {
  try {
    const response = await axios.post('https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run/api/user/subtractCoins', {
      uid,
      coinAmount,
      transaction_name: transactionName,
    });
    return response.data;
  } catch (err) {
    console.error('Coin deduction failed:', err.response?.data || err.message);
    return { success: false, message: 'Coin deduction API failed' };
  }
};

// === AI Detection Endpoint ===
router.post('/createDetection', async (req, res) => {
  try {
    const {
      uid, text, title = 'Untitled', tags = [], coinCost = 40,
      language = 'en'
    } = req.body;

    if (!uid || !text) return res.status(400).json({ message: 'UID and text required' });
    
    // Word count validation - limit to 2000 words
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 2000) {
      return res.status(400).json({ 
        message: 'Text exceeds maximum limit of 2000 words', 
        currentWordCount: wordCount,
        maxWordCount: 2000
      });
    }
    
    // Always deduct exactly 40 coins regardless of coinCost parameter
    const fixedCoinCost = 40;

    const supabase = getSupabaseClient();
    const { data: user, error: userError } = await supabase.from('users').select('uid').eq('uid', uid).single();
    if (userError || !user) return res.status(400).json({ message: 'User not found' });

    const deductResult = await deductCoins(uid, fixedCoinCost, 'ai_detection');
    if (!deductResult.success) return res.status(400).json({ message: deductResult.message });

    // Call GPTZero API
    const detectionResponse = await axios.post(
      'https://api.gptzero.me/v2/predict/text',
      { 
        document: text,
        multilingual: language !== 'en'
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': process.env.GPTZERO_API_KEY || '59cd294a5dc44053b95674932a4fcf46'
        }
      }
    );

    const detectionResult = detectionResponse.data;
    if (!detectionResult.documents || detectionResult.documents.length === 0) {
      throw new Error('Detection failed - no documents returned');
    }

    const document = detectionResult.documents[0];
    
    // Map GPTZero response to our database schema
    const isHuman = document.predicted_class === 'human';
    const aiProbability = document.class_probabilities?.ai || 0;
    const fakePercentage = Math.round(aiProbability * 100);
    
    // Calculate AI words based on sentences
    let aiWords = 0;
    let totalWords = 0;
    if (document.sentences) {
      document.sentences.forEach(sentence => {
        const words = sentence.sentence.trim().split(/\s+/).length;
        totalWords += words;
        if (sentence.highlight_sentence_for_ai) {
          aiWords += words;
        }
      });
    }

    const detectionId = uuidv4();
    const createdAt = new Date().toISOString();

    // Store complete GPTZero response data in the new table structure
    const { error: insertError } = await supabase.from('user_detection').insert({
      detection_id: detectionId,
      uid,
      text,
      title,
      tags,
      language,
      created_at: createdAt,
      
      // GPTZero API response fields (mapped to our schema)
      scan_id: detectionResult.scanId,
      gptzero_version: detectionResult.version,
      gptzero_neat_version: detectionResult.neatVersion,
      predicted_class: document.predicted_class,
      confidence_score: document.confidence_score,
      confidence_category: document.confidence_category,
      overall_burstiness: document.overall_burstiness,
      result_message: document.result_message,
      result_sub_message: document.result_sub_message,
      document_classification: document.document_classification,
      
      // GPTZero probabilities (mapped to our schema)
      class_prob_human: document.class_probabilities?.human,
      class_prob_ai: document.class_probabilities?.ai,
      class_prob_mixed: document.class_probabilities?.mixed,
      
      // Calculated fields for backward compatibility
      is_human: isHuman,
      fake_percentage: fakePercentage,
      ai_words: aiWords,
      text_words: totalWords,
      
      // JSONB fields for complex data
      confidence_scores_raw: document.confidence_scores_raw,
      confidence_thresholds_raw: document.confidence_thresholds_raw,
      writing_stats: document.writing_stats,
      sentences: document.sentences || [],
      paragraphs: document.paragraphs || [],
      subclass_data: document.subclass,
      
      // Full API response for reference
      full_gptzero_response: detectionResult
    });

    if (insertError) throw insertError;

    return res.status(200).json({
      message: 'Detection created successfully',
      detection: {
        id: detectionId,
        title,
        text,
        tags,
        language,
        createdAt,
        
        // GPTZero API response fields
        scan_id: detectionResult.scanId,
        gptzero_version: detectionResult.version,
        gptzero_neat_version: detectionResult.neatVersion,
        predicted_class: document.predicted_class,
        confidence_score: document.confidence_score,
        confidence_category: document.confidence_category,
        overall_burstiness: document.overall_burstiness,
        result_message: document.result_message,
        result_sub_message: document.result_sub_message,
        document_classification: document.document_classification,
        
        // GPTZero probabilities
        class_prob_human: document.class_probabilities?.human,
        class_prob_ai: document.class_probabilities?.ai,
        class_prob_mixed: document.class_probabilities?.mixed,
        
        // Calculated fields for backward compatibility
        is_human: isHuman,
        fake_percentage: fakePercentage,
        ai_words: aiWords,
        text_words: totalWords,
        
        // Complex data structures
        confidence_scores_raw: document.confidence_scores_raw,
        confidence_thresholds_raw: document.confidence_thresholds_raw,
        writing_stats: document.writing_stats,
        sentences: document.sentences || [],
        paragraphs: document.paragraphs || [],
        subclass_data: document.subclass,
        
        // Metadata
        provider: 'gptzero',
        full_gptzero_response: detectionResult
      }
    });
  } catch (err) {
    console.error('Create detection error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Get user's detection history
router.get('/getUserDetections', async (req, res) => {
  try {
    const { uid, page = 1, itemsPerPage = 10, searchQuery } = req.query;

    // Validate input
    if (!uid) {
      return res.status(400).json({ message: 'UID is required' });
    }
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
      return res.status(400).json({ message: 'Invalid UID format. Must be a valid UUID' });
    }

    // Convert to numbers
    const pageNum = parseInt(page, 10);
    const itemsPerPageNum = parseInt(itemsPerPage, 10);
    
    // Validate pagination parameters
    if (isNaN(pageNum) || isNaN(itemsPerPageNum) || pageNum < 1 || itemsPerPageNum < 1) {
      return res.status(400).json({ message: 'Invalid pagination parameters' });
    }
    
    // Calculate pagination
    const from = (pageNum - 1) * itemsPerPageNum;
    const to = from + itemsPerPageNum - 1;

    const supabase = getSupabaseClient();
    
    // Build the base query for count
    let countQuery = supabase
      .from('user_detection')
      .select('*', { count: 'exact', head: true })
      .eq('uid', uid);
      
    // Build the base query for data
    let dataQuery = supabase
      .from('user_detection')
      .select('detection_id, title, text, is_human, fake_percentage, ai_words, text_words, tags, created_at, language, predicted_class, confidence_score, confidence_category, scan_id')
      .eq('uid', uid);
      
    // Apply search filter if provided
    if (searchQuery) {
      const searchFilter = `or(title.ilike.%${searchQuery}%,text.ilike.%${searchQuery}%)`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }
    
    // Get total count for pagination
    const { count, error: countError } = await countQuery;
      
    if (countError) {
      console.error('Database count error:', countError);
      return res.status(500).json({ message: 'Error counting detection items', error: countError });
    }
    
    // Get paginated data
    const { data, error } = await dataQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({ message: 'Error retrieving detection history', error });
    }

    // Transform data to match expected interface
    const formattedData = data.map(item => ({
      id: item.detection_id,
      title: item.title,
      text: item.text,
      is_human: item.is_human,
      fake_percentage: item.fake_percentage,
      ai_words: item.ai_words,
      text_words: item.text_words,
      createdAt: item.created_at,
      tags: item.tags,
      language: item.language || 'en',
      predicted_class: item.predicted_class,
      confidence_score: item.confidence_score,
      confidence_category: item.confidence_category,
      scan_id: item.scan_id,
      provider: 'gptzero'
    }));

    return res.status(200).json({
      message: 'Detection history retrieved successfully',
      detections: formattedData,
      totalItems: count,
      currentPage: pageNum,
      itemsPerPage: itemsPerPageNum,
      totalPages: Math.ceil(count / itemsPerPageNum)
    });
  } catch (error) {
    console.error('Error in getUserDetections:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get specific detection by ID
router.get('/getDetection', async (req, res) => {
  try {
    const { uid, detectionId } = req.query;

    // Validate input
    if (!uid || !detectionId) {
      return res.status(400).json({ message: 'UID and detectionId are required' });
    }
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
      return res.status(400).json({ message: 'Invalid UID format. Must be a valid UUID' });
    }
    
    // Validate detectionId UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(detectionId)) {
      return res.status(400).json({ message: 'Invalid detectionId format. Must be a valid UUID' });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_detection')
      .select('*')
      .eq('uid', uid)
      .eq('detection_id', detectionId)
      .single();

    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({ message: 'Error retrieving detection', error });
    }

    if (!data) {
      return res.status(404).json({ message: 'Detection not found' });
    }

    // Format the detection to match the expected interface with new table structure
    const formattedDetection = {
      id: data.detection_id,
      title: data.title,
      text: data.text,
      tags: data.tags,
      language: data.language || 'en',
      createdAt: data.created_at,
      
      // GPTZero API response fields
      scan_id: data.scan_id,
      version: data.version,
      neat_version: data.neat_version,
      predicted_class: data.predicted_class,
      confidence_score: data.confidence_score,
      confidence_category: data.confidence_category,
      completely_generated_prob: data.completely_generated_prob,
      average_generated_prob: data.average_generated_prob,
      overall_burstiness: data.overall_burstiness,
      result_message: data.result_message,
      document_classification: data.document_classification,
      
      // Calculated fields for backward compatibility
      is_human: data.is_human,
      fake_percentage: data.fake_percentage,
      ai_words: data.ai_words,
      text_words: data.text_words,
      
      // Complex data structures (JSONB fields)
      class_probabilities: data.class_probabilities,
      confidence_scores_raw: data.confidence_scores_raw,
      confidence_thresholds_raw: data.confidence_thresholds_raw,
      writing_stats: data.writing_stats,
      sentences: data.sentences || [],
      paragraphs: data.paragraphs || [],
      subclass: data.subclass,
      
      // Metadata
      provider: 'gptzero',
      full_response: data.full_response
    };

    return res.status(200).json({
      message: 'Detection retrieved successfully',
      detection: formattedDetection
    });
  } catch (error) {
    console.error('Error in getDetection:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Delete detection
router.delete('/deleteDetection', async (req, res) => {
  try {
    const { uid, detectionId } = req.body;

    // Validate input
    if (!uid || !detectionId) {
      return res.status(400).json({ message: 'UID and detectionId are required' });
    }
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
      return res.status(400).json({ message: 'Invalid UID format. Must be a valid UUID' });
    }
    
    // Validate detectionId UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(detectionId)) {
      return res.status(400).json({ message: 'Invalid detectionId format. Must be a valid UUID' });
    }

    const supabase = getSupabaseClient();
    
    // First check if the detection exists and belongs to the user
    const { data, error: checkError } = await supabase
      .from('user_detection')
      .select('detection_id, title')
      .eq('uid', uid)
      .eq('detection_id', detectionId)
      .single();

    if (checkError || !data) {
      return res.status(404).json({ message: 'Detection not found or not owned by user' });
    }

    // Delete the detection
    const { error: deleteError } = await supabase
      .from('user_detection')
      .delete()
      .eq('detection_id', detectionId)
      .eq('uid', uid);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return res.status(500).json({ message: 'Error deleting detection', error: deleteError });
    }

    return res.status(200).json({
      message: 'Detection deleted successfully',
      id: detectionId,
      title: data.title
    });
  } catch (error) {
    console.error('Error in deleteDetection:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;