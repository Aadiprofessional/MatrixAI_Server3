const express = require("express");
const { getSupabaseClient } = require("../config/database.js");
const { authenticateAdmin } = require("../middleware/auth.js");
const axios = require('axios');

const router = express.Router();

// Comment out admin authentication middleware for testing
// router.use(authenticateAdmin);

// Get all users endpoint
router.all('/getAllUsers', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('Request to /getAllUsers endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all generated images endpoint
router.all('/getAllGeneratedImage', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const supabase = getSupabaseClient();

    // Fetch all image data
    const { data: imageData, error: imageError } = await supabase
      .from('image_generate')
      .select('uid, image_id, image_url, created_at, prompt_text');

    if (imageError) {
      console.error('Error fetching generated images:', imageError);
      return res.status(500).json({ error: 'Failed to fetch generated images' });
    }

    // Get unique user IDs
    const userIds = [...new Set(imageData.map(image => image.uid))];
    
    // Fetch user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, name, email')
      .in('uid', userIds);

    if (userError) {
      console.error('Error fetching user information:', userError);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    // Create user map
    const userMap = {};
    userData.forEach(user => {
      userMap[user.uid] = user;
    });

    // Group images by user
    const organizedData = userIds.map(uid => {
      const userImages = imageData.filter(image => image.uid === uid);
      return {
        user: userMap[uid],
        images: userImages
      };
    });

    res.json(organizedData);
  } catch (error) {
    console.error('Error in getAllGeneratedImage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all generated videos endpoint
router.all('/getAllGeneratedVideo', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /getAllGeneratedVideo endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const supabase = getSupabaseClient();

    // Fetch all video data
    const { data: videoData, error: videoError } = await supabase
      .from('video_metadata')
      .select('uid, video_id, video_url, image_url, prompt_text, status, task_id, created_at, updated_at');

    if (videoError) {
      console.error('Error fetching generated videos:', videoError);
      return res.status(500).json({ error: 'Failed to fetch generated videos' });
    }

    // Get unique user IDs
    const userIds = [...new Set(videoData.map(video => video.uid))];
    
    // Fetch user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, name, email')
      .in('uid', userIds);

    if (userError) {
      console.error('Error fetching user information:', userError);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    // Create user map
    const userMap = {};
    userData.forEach(user => {
      userMap[user.uid] = user;
    });

    // Group videos by user
    const organizedData = userIds.map(uid => {
      const userVideos = videoData.filter(video => video.uid === uid);
      return {
        user: userMap[uid],
        videos: userVideos
      };
    });

    res.json(organizedData);
  } catch (error) {
    console.error('Error in getAllGeneratedVideo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all audio converted endpoint
router.all('/getAllAudioConverted', async (req, res) => {
  console.log('Request to /getAllAudioConverted endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const supabase = getSupabaseClient();

    // Fetch all audio data
    const { data: audioData, error: audioError } = await supabase
      .from('audio_metadata')
      .select('uid, audioid, audio_name, duration, uploaded_at, audio_url, language, status');

    if (audioError) {
      console.error('Error fetching audio data:', audioError);
      return res.status(500).json({ error: 'Failed to fetch audio data' });
    }

    // Get unique user IDs
    const userIds = [...new Set(audioData.map(audio => audio.uid))];
    
    // Fetch user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, name, email')
      .in('uid', userIds);

    if (userError) {
      console.error('Error fetching user information:', userError);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    // Create user map
    const userMap = {};
    userData.forEach(user => {
      userMap[user.uid] = user;
    });

    // Group audio by user
    const organizedData = userIds.map(uid => {
      const userAudios = audioData.filter(audio => audio.uid === uid);
      return {
        user: userMap[uid],
        audios: userAudios
      };
    });

    res.json(organizedData);
  } catch (error) {
    console.error('Error in getAllAudioConverted:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders endpoint
router.all('/getAllOrders', async (req, res) => {
  console.log('Request to /getAllOrders endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const supabase = getSupabaseClient();

    // Fetch all orders
    const { data: orderData, error: orderError } = await supabase
      .from('user_order')
      .select('*');

    if (orderError) {
      console.error('Error fetching orders:', orderError);
      return res.status(500).json({ error: 'Failed to fetch order information' });
    }

    // Get unique user IDs
    const userIds = [...new Set(orderData.map(order => order.uid))];
    
    // Fetch user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, name, email')
      .in('uid', userIds);

    if (userError) {
      console.error('Error fetching user information:', userError);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    // Create user map
    const userMap = {};
    userData.forEach(user => {
      userMap[user.uid] = user;
    });

    // Group orders by user
    const organizedData = userIds.map(uid => {
      const userOrders = orderData.filter(order => order.uid === uid);
      return {
        user: userMap[uid],
        orders: userOrders
      };
    });

    res.json(organizedData);
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all transactions endpoint
router.all('/getAllTransactions', async (req, res) => {
  console.log('Request to /getAllTransactions endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const supabase = getSupabaseClient();

    // Fetch all transactions from user_transaction table instead of payment_transactions
    const { data: transactionData, error: transactionError } = await supabase
      .from('user_transaction')
      .select('*');

    if (transactionError) {
      console.error('Error fetching transactions:', transactionError);
      return res.status(500).json({ error: 'Failed to fetch transaction information' });
    }

    // Get unique user IDs
    const userIds = [...new Set(transactionData.map(transaction => transaction.uid))];
    
    // Fetch user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, name, email')
      .in('uid', userIds);

    if (userError) {
      console.error('Error fetching user information:', userError);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    // Create user map
    const userMap = {};
    userData.forEach(user => {
      userMap[user.uid] = user;
    });

    // Group transactions by user
    const organizedData = userIds.map(uid => {
      const userTransactions = transactionData.filter(transaction => transaction.uid === uid);
      return {
        user: userMap[uid],
        transactions: userTransactions
      };
    });

    res.json(organizedData);
  } catch (error) {
    console.error('Error in getAllTransactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all feedback endpoint
router.all('/getAllFeedback', async (req, res) => {
  console.log('Request to /getAllFeedback endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const supabase = getSupabaseClient();

    // Fetch all feedback
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('feedback')
      .select('*');

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      return res.status(500).json({ error: 'Failed to fetch feedback information' });
    }

    // Get unique user IDs
    const userIds = [...new Set(feedbackData.map(feedback => feedback.uid))];
    
    // Fetch user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, name, email')
      .in('uid', userIds);

    if (userError) {
      console.error('Error fetching user information:', userError);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    // Create user map
    const userMap = {};
    userData.forEach(user => {
      userMap[user.uid] = user;
    });

    // Group feedback by user
    const organizedData = userIds.map(uid => {
      const userFeedback = feedbackData.filter(feedback => feedback.uid === uid);
      return {
        user: userMap[uid],
        feedback: userFeedback
      };
    });

    res.json(organizedData);
  } catch (error) {
    console.error('Error in getAllFeedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all help requests endpoint
router.all('/getAllHelp', async (req, res) => {
  console.log('Request to /getAllHelp endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const supabase = getSupabaseClient();

    // Fetch all help requests
    const { data: helpData, error: helpError } = await supabase
      .from('help_requests')
      .select('*');

    if (helpError) {
      console.error('Error fetching help requests:', helpError);
      return res.status(500).json({ error: 'Failed to fetch help request information' });
    }

    // Get unique user IDs
    const userIds = [...new Set(helpData.map(help => help.uid))];
    
    // Fetch user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('uid, name, email')
      .in('uid', userIds);

    if (userError) {
      console.error('Error fetching user information:', userError);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    // Create user map
    const userMap = {};
    userData.forEach(user => {
      userMap[user.uid] = user;
    });

    // Group help requests by user
    const organizedData = userIds.map(uid => {
      const userHelp = helpData.filter(help => help.uid === uid);
      return {
        user: userMap[uid],
        helpRequests: userHelp
      };
    });

    res.json(organizedData);
  } catch (error) {
    console.error('Error in getAllHelp:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolve feedback with admin comment
router.post('/resolveFeedback', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { feedbackId, adminComment, adminId } = req.body;

    if (!feedbackId || !adminComment) {
      return res.status(400).json({ success: false, message: 'Feedback ID and admin comment are required' });
    }

    // Get feedback details first
    const { data: feedbackData, error: fetchError } = await supabase
      .from('feedback')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !feedbackData) {
      console.error('Error fetching feedback:', fetchError);
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    // Get user info separately
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('uid', feedbackData.uid)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      // Continue without user data for email
    }

    // Update feedback with resolution
    const { error: updateError } = await supabase
      .from('feedback')
      .update({
        status: 'resolved',
        admin_comment: adminComment,
        resolved_at: new Date().toISOString(),
        resolved_by: adminId || 'admin'
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      return res.status(500).json({ success: false, message: updateError.message });
    }

    // Send resolution email to user
    if (userData && userData.email) {
      try {
        const emailSubject = 'Your Feedback Has Been Reviewed - MatrixAI';
        const emailMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Feedback Review Complete</h2>
            <p>Dear ${userData.name || 'User'},</p>
            <p>Thank you for your feedback. Our team has reviewed it and provided a response.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Original Feedback:</h3>
              <p><strong>Type:</strong> ${feedbackData.issue_type}</p>
              <p><strong>Description:</strong> ${feedbackData.description || 'No description provided'}</p>
              <p><strong>Submitted:</strong> ${new Date(feedbackData.created_at).toLocaleDateString()}</p>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
              <h3 style="margin-top: 0; color: #2E7D32;">Admin Response:</h3>
              <p>${adminComment}</p>
            </div>
            
            <p>We appreciate your feedback and hope this response addresses your concerns.</p>
            <p>Thank you for using MatrixAI!</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        `;

        await axios.post(`${process.env.BASE_URL || 'http://localhost:3000'}/api/email/send`, {
          to: userData.email,
          subject: emailSubject,
          message: emailMessage,
          from: 'support@matrixaiglobal.com'
        });
        
        console.log('Feedback resolution email sent to:', userData.email);
      } catch (emailError) {
        console.error('Error sending feedback resolution email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({ success: true, message: 'Feedback resolved successfully' });
  } catch (error) {
    console.error('Error resolving feedback:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Resolve help request with admin comment
router.post('/resolveHelpRequest', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { helpRequestId, adminComment, adminId } = req.body;

    if (!helpRequestId || !adminComment) {
      return res.status(400).json({ success: false, message: 'Help request ID and admin comment are required' });
    }

    // Get help request details first
    const { data: helpRequestData, error: fetchError } = await supabase
      .from('help_requests')
      .select('*')
      .eq('id', helpRequestId)
      .single();

    if (fetchError || !helpRequestData) {
      console.error('Error fetching help request:', fetchError);
      return res.status(404).json({ success: false, message: 'Help request not found' });
    }

    // Get user info separately
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('uid', helpRequestData.uid)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      // Continue without user data for email
    }

    // Update help request with resolution
    const { error: updateError } = await supabase
      .from('help_requests')
      .update({
        status: 'resolved',
        admin_comment: adminComment,
        resolved_at: new Date().toISOString(),
        resolved_by: adminId || 'admin'
      })
      .eq('id', helpRequestId);

    if (updateError) {
      console.error('Error updating help request:', updateError);
      return res.status(500).json({ success: false, message: updateError.message });
    }

    // Send resolution email to user
    if (userData && userData.email) {
      try {
        const emailSubject = 'Your Support Request Has Been Resolved - MatrixAI';
        const emailMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Support Request Resolved</h2>
            <p>Dear ${userData.name || 'User'},</p>
            <p>Great news! Our support team has resolved your help request.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Original Request:</h3>
              <p><strong>Issue Type:</strong> ${helpRequestData.issue_type}</p>
              <p><strong>Description:</strong> ${helpRequestData.description || 'No description provided'}</p>
              ${helpRequestData.order_id ? `<p><strong>Order ID:</strong> ${helpRequestData.order_id}</p>` : ''}
              <p><strong>Submitted:</strong> ${new Date(helpRequestData.created_at).toLocaleDateString()}</p>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
              <h3 style="margin-top: 0; color: #2E7D32;">Resolution:</h3>
              <p>${adminComment}</p>
            </div>
            
            <p>If you have any additional questions or concerns, please don't hesitate to submit another support request.</p>
            <p>Thank you for using MatrixAI!</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        `;

        await axios.post(`${process.env.BASE_URL || 'http://localhost:3000'}/api/email/send`, {
          to: userData.email,
          subject: emailSubject,
          message: emailMessage,
          from: 'support@matrixaiglobal.com'
        });
        
        console.log('Help request resolution email sent to:', userData.email);
      } catch (emailError) {
        console.error('Error sending help request resolution email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({ success: true, message: 'Help request resolved successfully' });
  } catch (error) {
    console.error('Error resolving help request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all coupons endpoint
router.all('/getAllCoupons', async (req, res) => {
  console.log('Request to /getAllCoupons endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const supabase = getSupabaseClient();

    // Fetch all coupons
    const { data, error } = await supabase
      .from('coupons')
      .select('*');

    if (error) {
      console.error('Error fetching coupons:', error);
      return res.status(500).json({ error: 'Failed to fetch coupon information' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getAllCoupons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add coupon endpoint
router.post('/addCoupon', async (req, res) => {
  console.log('Request to /addCoupon endpoint:', req.method);
  console.log('Request body:', req.body);
  try {
    const { coupon_name, coupon_amount, valid_till, only_new_users, active, description, uid } = req.body;

    if (!coupon_name || !coupon_amount) {
      return res.status(400).json({ error: 'Coupon name and amount are required' });
    }

    const supabase = getSupabaseClient();

    // Check if coupon name already exists
    const { data: existingCoupon, error: checkError } = await supabase
      .from('coupons')
      .select('coupon_name')
      .eq('coupon_name', coupon_name)
      .single();

    if (existingCoupon) {
      return res.status(400).json({ error: 'Coupon name already exists' });
    }

    const now = new Date().toISOString();

    // Insert new coupon
    const { data, error } = await supabase
      .from('coupons')
      .insert([
        {
          coupon_name,
          coupon_amount,
          valid_till: valid_till || null,
          only_new_users: only_new_users !== undefined ? only_new_users : false,
          active: active !== undefined ? active : true,
          created_at: now,
          updated_at: now,
          uid: uid || [],
          description: description || ''
        }
      ]);

    if (error) {
      console.error('Error adding coupon:', error);
      return res.status(500).json({ error: 'Failed to add coupon' });
    }

    res.json({ success: true, message: 'Coupon added successfully' });
  } catch (error) {
    console.error('Error in addCoupon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add fetchUserInfoAdmin endpoint (alias for getAllUsers)
router.all('/fetchUserInfoAdmin', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Request to /fetchUserInfoAdmin endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in fetchUserInfoAdmin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove coupon endpoint
router.all('/removeCoupon', async (req, res) => {
  console.log('Request to /removeCoupon endpoint:', req.method);
  console.log('Request body:', req.body);
  console.log('Request query:', req.query);
  try {
    const id = req.method === 'GET' ? req.query.id : req.body.id;

    if (!id) {
      return res.status(400).json({ error: 'Coupon ID is required' });
    }

    const supabase = getSupabaseClient();

    // Delete the coupon
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing coupon:', error);
      return res.status(500).json({ error: 'Failed to remove coupon' });
    }

    res.json({ success: true, message: 'Coupon removed successfully' });
  } catch (error) {
    console.error('Error in removeCoupon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subscription management endpoints
router.all('/getSubscriptionMonitoring', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const subscriptionCronService = require('../services/subscriptionCronService');
    const result = await subscriptionCronService.getMonitoringData();
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error in getSubscriptionMonitoring:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/runSubscriptionProcessing', async (req, res) => {
  try {
    const subscriptionCronService = require('../services/subscriptionCronService');
    const result = await subscriptionCronService.runManually();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Subscription processing completed successfully',
        results: result.results,
        duration: result.duration
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error,
        message: 'Subscription processing failed'
      });
    }
  } catch (error) {
    console.error('Error in runSubscriptionProcessing:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.all('/getSubscriptionCronStatus', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const subscriptionCronService = require('../services/subscriptionCronService');
    const status = subscriptionCronService.getStatus();
    
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error in getSubscriptionCronStatus:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;