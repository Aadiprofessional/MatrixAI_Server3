// imagePromptRoutes.js
const express = require("express");
const { getSupabaseClient } = require("../config/database.js");
const { supabaseAdmin } = require('../utils/supabase');
const { createTimezoneAwareTimestamp } = require('../utils/timezone.js');

const router = express.Router();

// Test endpoint to verify route registration
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Image prompt routes are working!' });
});

// POST API - Save image URL and prompt to database
router.post('/saveImagePrompt', async (req, res) => {
  try {
    console.log('POST /saveImagePrompt called');
    console.log('req object exists:', !!req);
    console.log('req.body exists:', !!req.body);
    console.log('req.body content:', req.body);
    
    const { image_url, prompt, user_id } = req.body;

    // Validate required fields
    if (!image_url || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: image_url and prompt are required'
      });
    }

    // Validate image URL format
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(image_url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image URL format'
      });
    }

    // Insert into database using admin client to bypass RLS
    const supabase = supabaseAdmin();
    
    // Insert data into image_prompts table
    const { data, error } = await supabase
      .from('image_prompts')
      .insert([
        {
          image_url: image_url.trim(),
          prompt: prompt.trim(),
          user_id: user_id || null,
          created_at: createTimezoneAwareTimestamp(req).timestamp,
          updated_at: createTimezoneAwareTimestamp(req).timestamp
        }
      ])
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save image prompt to database',
        details: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Image prompt saved successfully',
      data: data[0]
    });

  } catch (error) {
    console.error('Error in saveImagePrompt:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET API - Retrieve all image-prompt records
router.get('/getAllImagePrompts', async (req, res) => {
  try {
    const { user_id, limit = 50, offset = 0 } = req.query;

    const supabase = supabaseAdmin();
    
    let query = supabase
      .from('image_prompts')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by user_id if provided
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    // Apply pagination
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    
    if (limitNum > 0) {
      query = query.limit(limitNum);
    }
    
    if (offsetNum > 0) {
      query = query.range(offsetNum, offsetNum + limitNum - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve image prompts from database',
        details: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image prompts retrieved successfully',
      data: data || [],
      count: data ? data.length : 0,
      pagination: {
        limit: limitNum,
        offset: offsetNum
      }
    });

  } catch (error) {
    console.error('Error in getAllImagePrompts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET API - Retrieve specific image-prompt record by ID
router.get('/getImagePrompt/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: id'
      });
    }

    const supabase = supabaseAdmin();
    
    const { data, error } = await supabase
      .from('image_prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Image prompt not found'
        });
      }
      
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve image prompt from database',
        details: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image prompt retrieved successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in getImagePrompt:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// DELETE API - Remove specific record by ID
router.delete('/deleteImagePrompt/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: id'
      });
    }

    const supabase = getSupabaseClient();
    
    // First check if the record exists
    const { data: existingData, error: checkError } = await supabase
      .from('image_prompts')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Image prompt not found'
        });
      }
      
      console.error('Database check error:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check image prompt existence',
        details: checkError.message
      });
    }

    // Delete the record
    const { error: deleteError } = await supabase
      .from('image_prompts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete image prompt from database',
        details: deleteError.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image prompt deleted successfully',
      deleted_id: id
    });

  } catch (error) {
    console.error('Error in deleteImagePrompt:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// PUT API - Update existing image prompt
router.put('/updateImagePrompt/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, prompt } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: id'
      });
    }

    if (!image_url && !prompt) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (image_url or prompt) must be provided for update'
      });
    }

    // Validate image URL format if provided
    if (image_url) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(image_url)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image URL format'
        });
      }
    }

    const supabase = getSupabaseClient();
    
    // Prepare update object
    const updateData = {
      updated_at: createTimezoneAwareTimestamp()
    };

    if (image_url) updateData.image_url = image_url.trim();
    if (prompt) updateData.prompt = prompt.trim();

    const { data, error } = await supabase
      .from('image_prompts')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update image prompt in database',
        details: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image prompt not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image prompt updated successfully',
      data: data[0]
    });

  } catch (error) {
    console.error('Error in updateImagePrompt:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;