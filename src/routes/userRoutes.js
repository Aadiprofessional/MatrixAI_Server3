const express = require("express");
const { getSupabaseClient } = require("../config/database.js");
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'P8sG4xe6FfDrMEFJhX0g2zRLIykNtEnVcUxQjylt0lUU6K6bchpT39AQNpesdtNnspEOX+AD7UHEOtb0tHJ77A==';

// Helper function to add coins to user account
const addCoins = async (uid, coinAmount, transactionName) => {
  try {
    const supabase = getSupabaseClient();

    // Step 1: Fetch user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_coins')
      .eq('uid', uid)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return { success: false, message: 'Failed to fetch user information' };
    }

    const { user_coins } = userData;

    // Step 2: Add coins to the user's balance
    const updatedCoins = (user_coins || 0) + coinAmount;
    const { error: updateError } = await supabase
      .from('users')
      .update({ user_coins: updatedCoins })
      .eq('uid', uid);

    if (updateError) {
      console.error('Error updating user coins:', updateError);
      return { success: false, message: 'Failed to update user coins' };
    }

    // Step 3: Log successful transaction
    await supabase
      .from('user_transaction')
      .insert([{
        uid,
        transaction_name: transactionName,
        coin_amount: coinAmount,
        remaining_coins: updatedCoins,
        status: 'success',
        time: new Date().toISOString()
      }]);

    return { success: true, message: 'Coins added successfully', newBalance: updatedCoins };
  } catch (error) {
    console.error('Error in addCoins:', error);
    return { success: false, message: 'Internal server error' };
  }
};

// Helper function to send email
const sendEmail = async (to, subject, message) => {
  try {
    const emailData = {
      to,
      subject,
      message
    };
    
    const response = await axios.post(`${process.env.BASE_URL || 'http://localhost:3000'}/api/email/send`, emailData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// AUTHENTICATION ENDPOINTS

// Signup endpoint
router.all('/signup', async (req, res) => {
  try {
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('signup endpoint called');
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);
    
    // Parse request body
    let parsedBody = {};
    
    if (req.parsedBody && typeof req.parsedBody === 'object') {
      parsedBody = req.parsedBody;
    } else if (req.bodyJSON && typeof req.bodyJSON === 'object') {
      parsedBody = req.bodyJSON;
    } else if (req.body) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        parsedBody = req.body;
      } else if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
        } catch (parseError) {
          console.error('Error parsing string body:', parseError);
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const bufferString = req.body.toString('utf8');
          parsedBody = JSON.parse(bufferString);
        } catch (parseError) {
          console.error('Error parsing buffer body:', parseError);
        }
      }
    }
    
    const { email, password, confirmPassword, name, referralCode } = parsedBody;
    
    // Validate required fields
    if (!email || !password || !confirmPassword || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, confirm password, and name are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }
    
    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    const supabase = getSupabaseClient();
    
    // First check if user already exists by email
    const { data: existingUserByEmail, error: emailCheckError } = await supabase
      .from('users')
      .select('uid, email, name')
      .eq('email', email)
      .single();
    
    let uid;
    let isNewUser = false;
    
    if (existingUserByEmail) {
      // User already exists, use existing uid
      uid = existingUserByEmail.uid;
      console.log('User already exists with email:', email, 'uid:', uid);
    } else {
      // User doesn't exist, create new auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        return res.status(400).json({ 
          success: false, 
          message: authError.message || 'Failed to create user account' 
        });
      }

      if (!authData.user) {
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to create user account' 
        });
      }

      uid = authData.user.id; // Use Supabase Auth user ID
      isNewUser = true;
    }
    
    // Handle referral code if provided
    let referrerUid = null;
    if (referralCode) {
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('uid, invited_members')
        .eq('referral_code', referralCode)
        .single();
      
      if (referrer) {
        referrerUid = referrer.uid;
      }
    }
    
    // Generate unique referral code for this user
    const userReferralCode = uuidv4().substring(0, 8).toUpperCase();
    
    // Only give coins if referral code was used
    const initialCoins = referrerUid ? 25 : 0;
    
    // Check if user record exists in users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('uid, email, name')
      .eq('uid', uid)
      .single();
    
    let newUser;
    
    if (existingUser) {
      // User already exists in users table, update the existing record
      console.log('User already exists in users table, updating existing record');
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email,
          name: name,
          gender: 'Not specified', // Default gender value
          age: 0, // Default age value
          referral_code: userReferralCode,
          user_coins: initialCoins,
          newuser: true
        })
        .eq('uid', uid)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating existing user:', updateError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update user account' 
        });
      }
      
      newUser = updatedUser;
    } else if (isNewUser) {
      // User doesn't exist, create new record
      console.log('User does not exist in users table, creating new record');
      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          uid,
          email,
          name: name,
          gender: 'Not specified', // Default gender value
          age: 0, // Default age value
          referral_code: userReferralCode,
          user_coins: initialCoins,
          newuser: true
        }])
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating user:', insertError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create user account' 
        });
      }
      
      newUser = insertedUser;
    } else {
      // User exists by email but not in users table (shouldn't happen, but handle gracefully)
      newUser = existingUserByEmail;
    }
    
    // Add signup bonus transaction only if coins were given
    if (initialCoins > 0) {
      await supabase
        .from('user_transaction')
        .insert([{
          uid,
          transaction_name: 'Signup Bonus',
          coin_amount: initialCoins,
          remaining_coins: initialCoins,
          status: 'success',
          time: new Date().toISOString()
        }]);
    }
    

    
    // Handle referral rewards
    if (referrerUid) {
      // Add 25 coins to referrer
      const referrerResult = await addCoins(referrerUid, 25, 'Referral Bonus');
      
      if (referrerResult.success) {
        // Update referrer's invited_members
        const { data: referrerData } = await supabase
          .from('users')
          .select('invited_members')
          .eq('uid', referrerUid)
          .single();
        
        const currentInvited = referrerData?.invited_members || [];
        const updatedInvited = [...currentInvited, uid];
        
        await supabase
          .from('users')
          .update({ invited_members: updatedInvited })
          .eq('uid', referrerUid);
        
        // Send email to referrer
        const { data: referrerInfo } = await supabase
          .from('users')
          .select('email')
          .eq('uid', referrerUid)
          .single();
        
        if (referrerInfo?.email) {
          const referrerEmailMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Referral Bonus Credited!</h2>
              <p>Great news! Someone used your referral code to sign up for MatrixAI.</p>
              <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2563eb; margin-top: 0;">🎉 You've earned 25 coins!</h3>
                <p>These coins have been automatically added to your account as a referral bonus.</p>
              </div>
              <p>Thank you for spreading the word about MatrixAI!</p>
              <p>Best regards,<br>The MatrixAI Team</p>
            </div>
          `;
          
          await sendEmail(
            referrerInfo.email,
            '🎉 Referral Bonus: 25 Coins Added to Your Account!',
            referrerEmailMessage
          );
        }
      }
    }
    
    // Send welcome email to new user
    const welcomeEmailMessage = initialCoins > 0 ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to MatrixAI! 🎉</h2>
        <p>Thank you for signing up! Your account has been created successfully.</p>
        <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2563eb; margin-top: 0;">🪙 Referral Bonus: ${initialCoins} Coins Added!</h3>
          <p>We've credited your account with ${initialCoins} coins as a referral bonus. You can use these coins to explore our AI-powered features.</p>
        </div>
        <p>Start creating amazing content with MatrixAI today!</p>
        <p>Best regards,<br>The MatrixAI Team</p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to MatrixAI! 🎉</h2>
        <p>Thank you for signing up! Your account has been created successfully.</p>
        <p>Start creating amazing content with MatrixAI today!</p>
        <p>Best regards,<br>The MatrixAI Team</p>
      </div>
    `;
    
    const emailSubject = initialCoins > 0 ? 
      `🎉 Welcome to MatrixAI - ${initialCoins} Coins Added to Your Account!` : 
      '🎉 Welcome to MatrixAI!';
    
    await sendEmail(
      email,
      emailSubject,
      welcomeEmailMessage
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: uid, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Account created successfully',
      data: {
        uid,
        email,
        token,
        coins: initialCoins
      }
    });
    
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Login endpoint
router.all('/login', async (req, res) => {
  try {
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('login endpoint called');
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);
    
    // Parse request body
    let parsedBody = {};
    
    if (req.parsedBody && typeof req.parsedBody === 'object') {
      parsedBody = req.parsedBody;
    } else if (req.bodyJSON && typeof req.bodyJSON === 'object') {
      parsedBody = req.bodyJSON;
    } else if (req.body) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        parsedBody = req.body;
      } else if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
        } catch (parseError) {
          console.error('Error parsing string body:', parseError);
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const bufferString = req.body.toString('utf8');
          parsedBody = JSON.parse(bufferString);
        } catch (parseError) {
          console.error('Error parsing buffer body:', parseError);
        }
      }
    }
    
    const { email, password } = parsedBody;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    const supabase = getSupabaseClient();
    
    // Use Supabase Auth to sign in user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError || !authData.user) {
      console.error('Auth login error:', authError);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    const authUserId = authData.user.id;
    
    // Get user profile from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('uid, email, user_coins')
      .eq('uid', authUserId)
      .single();
    
    if (userError || !user) {
      console.error('User profile not found:', userError);
      return res.status(401).json({ 
        success: false, 
        message: 'User profile not found' 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.uid, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        uid: user.uid,
        email: user.email,
        token,
        coins: user.user_coins || 0
      }
    });
    
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Reset password endpoint
router.all('/resetPassword', async (req, res) => {
  try {
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('resetPassword endpoint called');
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);
    
    // Parse request body
    let parsedBody = {};
    
    if (req.parsedBody && typeof req.parsedBody === 'object') {
      parsedBody = req.parsedBody;
    } else if (req.bodyJSON && typeof req.bodyJSON === 'object') {
      parsedBody = req.bodyJSON;
    } else if (req.body) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        parsedBody = req.body;
      } else if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
        } catch (parseError) {
          console.error('Error parsing string body:', parseError);
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const bufferString = req.body.toString('utf8');
          parsedBody = JSON.parse(bufferString);
        } catch (parseError) {
          console.error('Error parsing buffer body:', parseError);
        }
      }
    }
    
    const { email, newPassword, confirmPassword } = parsedBody;
    
    // Validate required fields
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, new password, and confirm password are required' 
      });
    }
    
    // Validate password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }
    
    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    const supabase = getSupabaseClient();
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('uid, email')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User with this email does not exist' 
      });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('uid', user.uid);
    
    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update password' 
      });
    }
    
    // Send confirmation email
    const resetEmailMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Successful</h2>
        <p>Your password has been successfully reset for your MatrixAI account.</p>
        <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Account:</strong> ${email}</p>
          <p><strong>Reset Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>If you did not request this password reset, please contact our support team immediately.</p>
        <p>Best regards,<br>The MatrixAI Team</p>
      </div>
    `;
    
    await sendEmail(
      email,
      'Password Reset Successful - MatrixAI',
      resetEmailMessage
    );
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Helper function to deduct coins
const deductCoins = async (uid, coinAmount, transactionName) => {
  try {
    const supabase = getSupabaseClient();

    // Step 1: Fetch user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_coins')
      .eq('uid', uid)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return { success: false, message: 'Failed to fetch user information' };
    }

    const { user_coins } = userData;

    // Step 2: Check if the user has enough coins
    if (user_coins < coinAmount) {
      // Log failed transaction
      const chinaTime = new Date().toLocaleString('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(', ', 'T') + '.000Z';
      
      await supabase
        .from('user_transaction')
        .insert([{
          uid,
          transaction_name: transactionName,
          coin_amount: coinAmount,
          remaining_coins: user_coins,
          status: 'failed',
          time: chinaTime
        }]);

      return { success: false, message: 'Insufficient coins. Please buy more coins.' };
    }

    // Step 3: Subtract coins from the user's balance
    const updatedCoins = user_coins - coinAmount;
    const { error: updateError } = await supabase
      .from('users')
      .update({ user_coins: updatedCoins })
      .eq('uid', uid);

    if (updateError) {
      console.error('Error updating user coins:', updateError);
      return { success: false, message: 'Failed to update user coins' };
    }

    // Step 4: Log successful transaction
    const chinaTime = new Date().toLocaleString('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(', ', 'T') + '.000Z';
    
    await supabase
      .from('user_transaction')
      .insert([{
        uid,
        transaction_name: transactionName,
        coin_amount: coinAmount,
        remaining_coins: updatedCoins,
        status: 'success',
        time: chinaTime
      }]);

    return { success: true, message: 'Coins subtracted successfully' };
  } catch (error) {
    console.error('Error in deductCoins:', error);
    return { success: false, message: 'Internal server error' };
  }
};

// Subtract coins endpoint
router.all('/subtractCoins', async (req, res) => {
  try {
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('subtractCoins endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request headers:', req.headers);
    console.log('Request bodyJSON (if exists):', req.bodyJSON);
    
    // For POST requests, try to parse the body manually if needed
    let parsedBody = {};
    
    // First check if parsedBody exists (from index.js)
    if (req.parsedBody && typeof req.parsedBody === 'object') {
      console.log('Using req.parsedBody:', req.parsedBody);
      parsedBody = req.parsedBody;
    }
    // Then check if bodyJSON exists (from handler.js or serverless.js)
    else if (req.bodyJSON && typeof req.bodyJSON === 'object') {
      console.log('Using req.bodyJSON:', req.bodyJSON);
      parsedBody = req.bodyJSON;
    }
    // Then try to parse from req.body
    else if (req.body) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        console.log('Using req.body as object');
        parsedBody = req.body;
      } else if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
          console.log('Manually parsed string body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing string body:', parseError);
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const bufferString = req.body.toString('utf8');
          console.log('Buffer as string:', bufferString);
          parsedBody = JSON.parse(bufferString);
          console.log('Manually parsed buffer body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing buffer body:', parseError);
        }
      }
    }
    
    // Support both GET and POST methods
    let uid, coinAmount, transaction_name;
    
    if (req.method === 'GET') {
      uid = req.query.uid;
      coinAmount = parseInt(req.query.coinAmount);
      transaction_name = req.query.transaction_name;
      console.log('GET parameters:', { uid, coinAmount, transaction_name });
    } else {
      // For POST, try multiple sources in order of preference
      uid = parsedBody.uid || 
            (req.parsedBody && req.parsedBody.uid) || 
            (req.body && req.body.uid) || 
            (req.bodyJSON && req.bodyJSON.uid);
      
      // For coinAmount, ensure it's parsed as an integer
      const rawCoinAmount = parsedBody.coinAmount || 
                           (req.parsedBody && req.parsedBody.coinAmount) || 
                           (req.body && req.body.coinAmount) || 
                           (req.bodyJSON && req.bodyJSON.coinAmount);
      coinAmount = rawCoinAmount ? parseInt(rawCoinAmount) : NaN;
      
      transaction_name = parsedBody.transaction_name || 
                        (req.parsedBody && req.parsedBody.transaction_name) || 
                        (req.body && req.body.transaction_name) || 
                        (req.bodyJSON && req.bodyJSON.transaction_name);
      console.log('POST parameters:', { uid, coinAmount, transaction_name });
    }
    
    console.log('Final extracted parameters:', { uid, coinAmount, transaction_name });

    if (!uid || isNaN(coinAmount) || !transaction_name) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: uid, coinAmount, transaction_name' });
    }

    const result = await deductCoins(uid, coinAmount, transaction_name);
    res.json(result);
  } catch (error) {
    console.error('Error in subtractCoins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user coins endpoint
router.all('/getUserCoins', async (req, res) => {
  try {
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('getUserCoins endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request headers:', req.headers);
    console.log('Request bodyJSON (if exists):', req.bodyJSON);
    
    // Parse request body for POST requests
    let parsedBody = {};
    
    // First check if parsedBody exists (from index.js)
    if (req.parsedBody && typeof req.parsedBody === 'object') {
      console.log('Using req.parsedBody:', req.parsedBody);
      parsedBody = req.parsedBody;
    }
    // Then check if bodyJSON exists (from handler.js or serverless.js)
    else if (req.bodyJSON && typeof req.bodyJSON === 'object') {
      console.log('Using req.bodyJSON:', req.bodyJSON);
      parsedBody = req.bodyJSON;
    }
    // Then try to parse from req.body
    else if (req.body) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        console.log('Using req.body as object');
        parsedBody = req.body;
      } else if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
          console.log('Manually parsed string body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing string body:', parseError);
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const bufferString = req.body.toString('utf8');
          console.log('Buffer as string:', bufferString);
          parsedBody = JSON.parse(bufferString);
          console.log('Manually parsed buffer body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing buffer body:', parseError);
        }
      }
    }
    
    // Support both GET and POST methods
    let uid;
    
    if (req.method === 'GET') {
      uid = req.query.uid;
    } else {
      // For POST, try multiple sources in order of preference
      uid = parsedBody.uid || 
            (req.parsedBody && req.parsedBody.uid) || 
            (req.body && req.body.uid) || 
            (req.bodyJSON && req.bodyJSON.uid);
    }
    
    console.log('Extracted UID:', uid);

    if (!uid) {
      console.log('UID is missing');
      return res.status(400).json({ error: 'UID is required' });
    }

    console.log('Attempting to create Supabase client');
    const supabase = getSupabaseClient();
    console.log('Supabase client created successfully');
    
    console.log('Attempting to query database for uid:', uid);
    const { data: userData, error } = await supabase
      .from('users')
      .select('user_coins, coins_expiry')
      .eq('uid', uid)
      .single();

    console.log('Query completed, checking for errors');
    if (error) {
      console.error('Error fetching user coins:', error);
      console.error('Error details:', JSON.stringify(error));
      
      // If user not found, return 0 coins
      if (error.code === 'PGRST116') {
        console.log('User not found, returning 0 coins');
        return res.json({
          success: true,
          coins: 0,
          expiry: null,
          message: 'User not found'
        });
      }
      
      return res.status(500).json({ error: 'Failed to fetch user coin information' });
    }

    console.log('User data retrieved successfully:', userData);
    return res.json({ 
      success: true, 
      coins: userData.user_coins || 0,
      expiry: userData.coins_expiry
    });
  } catch (error) {
    console.error('Error in getUserCoins:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user info endpoint
router.all('/userinfo', async (req, res) => {
  try {
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('userinfo endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request headers:', req.headers);
    console.log('Request bodyJSON (if exists):', req.bodyJSON);
    
    // Parse request body for POST requests
    let parsedBody = {};
    
    // First check if parsedBody exists (from index.js)
    if (req.parsedBody && typeof req.parsedBody === 'object') {
      console.log('Using req.parsedBody:', req.parsedBody);
      parsedBody = req.parsedBody;
    }
    // Then check if bodyJSON exists (from handler.js or serverless.js)
    else if (req.bodyJSON && typeof req.bodyJSON === 'object') {
      console.log('Using req.bodyJSON:', req.bodyJSON);
      parsedBody = req.bodyJSON;
    }
    // Then try to parse from req.body
    else if (req.body) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        console.log('Using req.body as object');
        parsedBody = req.body;
      } else if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
          console.log('Manually parsed string body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing string body:', parseError);
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const bufferString = req.body.toString('utf8');
          console.log('Buffer as string:', bufferString);
          parsedBody = JSON.parse(bufferString);
          console.log('Manually parsed buffer body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing buffer body:', parseError);
        }
      }
    }
    
    // Support both GET and POST methods
    let uid;
    
    if (req.method === 'GET') {
      uid = req.query.uid;
    } else {
      // For POST, try multiple sources in order of preference
      uid = parsedBody.uid || 
            (req.parsedBody && req.parsedBody.uid) || 
            (req.body && req.body.uid) || 
            (req.bodyJSON && req.bodyJSON.uid);
    }
    
    console.log('Extracted UID:', uid);

    if (!uid) {
      console.log('UID is missing');
      return res.status(400).json({ error: 'UID is required' });
    }

    const supabase = getSupabaseClient();
    const { data: userData, error } = await supabase
      .from('users')
      .select('name, age, gender, email, dp_url, subscription_active')
      .eq('uid', uid)
      .single();

    if (error) {
      console.error('Error fetching user info:', error);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    res.json({ success: true, data: userData });
  } catch (error) {
    console.error('Error in userinfo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all transactions endpoint
router.all('/AllTransactions', async (req, res) => {
  try {
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('AllTransactions endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request headers:', req.headers);
    console.log('Request bodyJSON (if exists):', req.bodyJSON);
    
    // Parse request body for POST requests
    let parsedBody = {};
    
    // First check if parsedBody exists (from index.js)
    if (req.parsedBody && typeof req.parsedBody === 'object') {
      console.log('Using req.parsedBody:', req.parsedBody);
      parsedBody = req.parsedBody;
    }
    // Then check if bodyJSON exists (from handler.js or serverless.js)
    else if (req.bodyJSON && typeof req.bodyJSON === 'object') {
      console.log('Using req.bodyJSON:', req.bodyJSON);
      parsedBody = req.bodyJSON;
    }
    // Then try to parse from req.body
    else if (req.body) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        console.log('Using req.body as object');
        parsedBody = req.body;
      } else if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
          console.log('Manually parsed string body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing string body:', parseError);
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const bufferString = req.body.toString('utf8');
          console.log('Buffer as string:', bufferString);
          parsedBody = JSON.parse(bufferString);
          console.log('Manually parsed buffer body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing buffer body:', parseError);
        }
      }
    }
    
    // Support both GET and POST methods
    let uid;
    
    if (req.method === 'GET') {
      uid = req.query.uid;
    } else {
      // For POST, try multiple sources in order of preference
      uid = parsedBody.uid || 
            (req.parsedBody && req.parsedBody.uid) || 
            (req.body && req.body.uid) || 
            (req.bodyJSON && req.bodyJSON.uid);
    }
    
    console.log('Extracted UID:', uid);

    if (!uid) {
      console.log('UID is missing');
      return res.status(400).json({ error: 'UID is required' });
    }

    const supabase = getSupabaseClient();
    const { data: transactions, error: transactionsError } = await supabase
      .from('user_transaction')
      .select('*')
      .eq('uid', uid);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error in AllTransactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available coupons for a user
router.all('/getCoupon', async (req, res) => {
  try {
    console.log('getCoupon endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    
    // Support both GET and POST methods
    const uid = req.method === 'GET' ? req.query.uid : req.body.uid;
    console.log('Extracted UID:', uid);

    if (!uid) {
      console.log('UID is missing');
      return res.status(400).json({ success: false, message: 'UID is required' });
    }

    const supabase = getSupabaseClient();
    
    // Step 1: Fetch the user's details from the `users` table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('newuser')
      .eq('uid', uid)
      .single();

    if (userError) {
      return res.status(500).json({ success: false, message: userError.message });
    }

    const isNewUser = userData?.newuser || false;

    // Step 2: Fetch coupons based on the user's eligibility
    let query = supabase
      .from('coupons')
      .select('*')
      .or(`uid.cs.{${uid}},uid.is.null`)
      .eq('active', true);

    // Add condition for new user coupons
    if (isNewUser) {
      query = query.or('only_new_users.eq.true,only_new_users.eq.false');
    } else {
      query = query.eq('only_new_users', false);
    }

    const { data: couponsData, error: couponsError } = await query;

    if (couponsError) {
      return res.status(500).json({ success: false, message: couponsError.message });
    }

    res.json({ success: true, data: couponsData });
  } catch (error) {
    console.error('Error in getCoupon:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Handle OPTIONS requests for CORS preflight
router.options('/getUserOrder', (req, res) => {
  res.status(200).end();
});

// Get user orders
router.all('/getUserOrder', async (req, res) => {
  try {
    console.log('getUserOrder endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    
    // Support both GET and POST methods
    const uid = req.method === 'GET' ? req.query.uid : req.body.uid;
    console.log('Extracted UID:', uid);

    if (!uid) {
      console.log('UID is missing');
      return res.status(400).json({ success: false, message: 'UID is required' });
    }

    const supabase = getSupabaseClient();
    
    // Fetch all orders for the user from the user_order table
    const { data: orders, error: ordersError } = await supabase
      .from('user_order')
      .select('*')
      .eq('uid', uid);

    if (ordersError) {
      return res.status(500).json({ success: false, message: ordersError.message });
    }

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error in getUserOrder:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Buy subscription
router.all('/BuySubscription', async (req, res) => {
  // Initialize variables with safe defaults to prevent undefined errors
  let uid, plan, totalPrice, couponId, paymentIntentId, orderId, paymentMethod, forceFailure, reason;
  
  try {
    console.log('BuySubscription endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    
    // Enhanced parameter extraction with validation and safe defaults
    const extractParam = (paramName, defaultValue = null) => {
      const value = req.method === 'GET' ? req.query[paramName] : req.body[paramName];
      return value !== undefined && value !== null && value !== '' ? value : defaultValue;
    };
    
    uid = extractParam('uid');
    plan = extractParam('plan');
    totalPrice = extractParam('totalPrice');
    couponId = extractParam('couponId');
    paymentIntentId = extractParam('paymentIntentId');
    orderId = extractParam('orderId');
    paymentMethod = extractParam('paymentMethod', 'airwallex');
    forceFailure = extractParam('forceFailure');
    reason = extractParam('reason');
    
    // Convert totalPrice to number if it's a string
    if (totalPrice !== null) {
      const parsedPrice = parseFloat(totalPrice);
      totalPrice = isNaN(parsedPrice) ? null : parsedPrice;
    }
    
    // Convert boolean-like strings
    if (typeof forceFailure === 'string') {
      forceFailure = forceFailure.toLowerCase() === 'true' || forceFailure === '1';
    }
    
    console.log('Extracted and validated parameters:', { 
      uid, plan, totalPrice, couponId, paymentIntentId, orderId, paymentMethod, forceFailure, reason 
    });
    
    // Enhanced validation with specific error messages
    const validationErrors = [];
    
    if (!uid) validationErrors.push('uid is required');
    if (!plan) validationErrors.push('plan is required');
    if (totalPrice === null || totalPrice === undefined) {
      validationErrors.push('totalPrice is required');
    } else if (isNaN(totalPrice) || totalPrice < 0) {
      validationErrors.push('totalPrice must be a valid positive number');
    }
    
    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: validationErrors,
        receivedParams: { uid, plan, totalPrice, paymentIntentId, orderId }
      });
    }
    
    // Handle special cases
    if (forceFailure) {
      const errorMessage = reason === 'metadata_not_found' 
        ? 'Payment succeeded but metadata was not found - manual intervention required'
        : 'Payment failed - forced failure for database logging';
      throw new Error(errorMessage);
    }

    const supabase = getSupabaseClient();
    
    // Step 1: Fetch plan details (case-insensitive)
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .ilike('plan_name', plan)
      .single();

    if (planError) {
      // Check if plan doesn't exist
      if (planError.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: `Subscription plan '${plan}' not found` });
      }
      return res.status(500).json({ success: false, message: planError.message });
    }
    
    if (!planData) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const { coins, plan_period } = planData;

    // Step 2: Fetch user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_active, user_plan, plan_valid_till, user_coins')
      .eq('uid', uid)
      .single();

    if (userError) {
      // Check if user doesn't exist
      if (userError.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'User not found. Please ensure the user is registered.' });
      }
      return res.status(500).json({ success: false, message: userError.message });
    }

    const { subscription_active, plan_valid_till, user_coins } = userData;

    // Step 3: Calculate plan validity and coin expiry based on new subscription logic
    let planValidTill, coinsExpiry, planExpiryDate, nextCoinRefresh, planPurchaseDate;
    const now = new Date();
    planPurchaseDate = now.toISOString();

    if (plan === 'Addon') {
      if (!subscription_active || !plan_valid_till) {
        return res.status(400).json({ success: false, message: 'Addon plan can only be purchased with an active subscription' });
      }

      // Addon coins expire with the main plan's coin expiry date
      // Get the current user's coins_expiry to align addon expiry
      const { data: currentUserData } = await supabase
        .from('users')
        .select('coins_expiry, plan_expiry_date')
        .eq('uid', uid)
        .single();
      
      coinsExpiry = currentUserData?.coins_expiry || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      planValidTill = coinsExpiry;
      planExpiryDate = currentUserData?.plan_expiry_date;
      nextCoinRefresh = null; // Addon doesn't have coin refresh
    } else if (plan === 'Yearly') {
      // Yearly plan: expires after 365 days, coins refresh every 30 days
      planExpiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
      coinsExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      nextCoinRefresh = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      planValidTill = planExpiryDate;
    } else if (plan === 'Monthly' || plan === 'Tester') {
      // Monthly and Tester plans: expire after 30 days, no coin refresh
      planExpiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      coinsExpiry = planExpiryDate;
      planValidTill = planExpiryDate;
      nextCoinRefresh = null; // Monthly plans don't have coin refresh
    } else {
      // Default fallback for any other plans
      const periodInSeconds = typeof plan_period === 'number' && !isNaN(plan_period) ? plan_period : 30 * 24 * 60 * 60;
      planExpiryDate = new Date(now.getTime() + periodInSeconds * 1000).toISOString();
      coinsExpiry = planExpiryDate;
      planValidTill = planExpiryDate;
      nextCoinRefresh = null;
    }

    // Step 4: Update user based on plan type with new subscription logic
    if (plan === 'Addon') {
      const updatedCoins = (user_coins || 0) + coins;

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          user_coins: updatedCoins, 
          coins_expiry: coinsExpiry
        })
        .eq('uid', uid);

      if (updateError) {
        return res.status(500).json({ success: false, message: updateError.message });
      }
    } else {
      // For main plans (Monthly, Yearly, Tester), reset coins to 0 first, then add new coins
      const updateData = {
        subscription_active: true,
        user_plan: plan,
        user_coins: coins, // New coins replace old coins
        plan_valid_till: planValidTill,
        coins_expiry: coinsExpiry,
        last_coin_addition: now.toISOString(),
        plan_purchase_date: planPurchaseDate,
        plan_expiry_date: planExpiryDate
      };
      
      // Add next_coin_refresh only for yearly plans
      if (nextCoinRefresh) {
        updateData.next_coin_refresh = nextCoinRefresh;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('uid', uid);

      if (updateError) {
        return res.status(500).json({ success: false, message: updateError.message });
      }
    }

    // Step 5: Insert order into user_order table
    const { error: orderError } = await supabase
      .from('user_order')
      .insert([{
        uid,
        plan_name: plan,
        total_price: totalPrice,
        coins_added: coins,
        plan_valid_till: planValidTill,
        coupon_id: couponId || null,
        status: 'active',
        payment_intent_id: paymentIntentId || null,
        payment_status: 'succeeded',
        order_id: orderId || null,
        payment_method: paymentMethod || null,
        payment_created_at: now.toISOString(),
        payment_updated_at: now.toISOString()
      }]);

    if (orderError) {
      return res.status(500).json({ success: false, message: orderError.message });
    }
    
    // Step 6: Get user email for sending invoice
    const { data: userEmailData, error: userEmailError } = await supabase
      .from('users')
      .select('email')
      .eq('uid', uid)
      .single();
      
    if (userEmailError || !userEmailData || !userEmailData.email) {
      // Continue with success response even if we can't get the email
      console.error('Could not retrieve user email for invoice:', userEmailError);
      return res.json({ success: true, message: 'Subscription purchased successfully, but could not send invoice email' });
    }
    
    // Step 7: Generate invoice HTML
    const invoiceDate = now.toISOString().split('T')[0];
    const invoiceNumber = `INV-${uid.substring(0, 8)}-${now.getTime().toString().substring(0, 6)}`;
    
    // Create invoice data
    const invoiceData = {
      invoiceNumber,
      date: invoiceDate,
      customerName: userEmailData.email.split('@')[0], // Use part of email as name if actual name not available
      customerEmail: userEmailData.email,
      planName: plan,
      planPeriod: plan === 'Yearly' ? '1 Year' : plan === 'Addon' ? 'Current Month' : `${Math.floor(plan_period / (24 * 60 * 60))} Days`,
      coins,
      totalPrice,
      validUntil: planValidTill.split('T')[0]
    };
    
    // Generate HTML invoice
    const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MatrixAI Subscription Invoice</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 20px; }
        .invoice-header { border-bottom: 2px solid #FCCC51; padding-bottom: 20px; margin-bottom: 20px; }
        .logo { width: 150px; height: auto; }
        .invoice-title { font-size: 24px; color: #333; margin: 10px 0; }
        .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; }
        .invoice-details-col { width: 48%; }
        .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .invoice-table th { background-color: #f8f8f8; text-align: left; padding: 10px; }
        .invoice-table td { padding: 10px; border-bottom: 1px solid #eee; }
        .total-row { font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <img src="https://ddtgdhehxhgarkonvpfq.supabase.co/storage/v1/object/public/user-uploads//matrix.png" alt="MatrixAI Logo" class="logo">
          <h1 class="invoice-title">INVOICE</h1>
        </div>
        
        <div class="invoice-details">
          <div class="invoice-details-col">
            <p><strong>Invoice To:</strong><br>
            ${invoiceData.customerName}<br>
            ${invoiceData.customerEmail}</p>
            
            <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}<br>
            <strong>Date:</strong> ${invoiceData.date}</p>
          </div>
          
          <div class="invoice-details-col" style="text-align: right;">
            <p><strong>MatrixAI Global</strong><br>
            support@matrixaiglobal.com<br>
            matrixaiglobal.com</p>
          </div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Plan</th>
              <th>Coins</th>
              <th>Valid Until</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>MatrixAI Subscription</td>
              <td>${invoiceData.planName}</td>
              <td>${invoiceData.coins}</td>
              <td>${invoiceData.validUntil}</td>
              <td>$${invoiceData.totalPrice.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">Total</td>
              <td>$${invoiceData.totalPrice.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>Thank you for your subscription to MatrixAI Global. If you have any questions, please contact support@matrixaiglobal.com</p>
        </div>
      </div>
    </body>
    </html>
    `;
    
    // Step 8: Send invoice email
    try {
      // Prepare email data
      const emailData = {
        from: 'noreply@matrixaiglobal.com',
        to: userEmailData.email,
        subject: `MatrixAI Subscription Invoice #${invoiceNumber}`,
        message: invoiceHtml
      };
      
      // Send email using the email API
      const emailResponse = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });
      
      if (!emailResponse.ok) {
        console.error('Error sending invoice email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Error sending invoice email:', emailError);
      // Continue with success response even if email fails
    }

    // Step 9: Automatically call getSubscriptionPlans after successful payment
    try {
      const subscriptionPlansResponse = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/user/getSubscriptionPlans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid })
      });
      
      if (subscriptionPlansResponse.ok) {
        const subscriptionPlansData = await subscriptionPlansResponse.json();
        console.log('Subscription plans updated successfully after purchase:', subscriptionPlansData);
      } else {
        console.error('Error calling getSubscriptionPlans after purchase:', await subscriptionPlansResponse.text());
      }
    } catch (subscriptionError) {
      console.error('Error calling getSubscriptionPlans after purchase:', subscriptionError);
      // Continue with success response even if subscription plans call fails
    }

    res.json({ 
      success: true, 
      message: 'Subscription purchased successfully',
      paymentIntentId: paymentIntentId,
      orderId: orderId,
      paymentStatus: 'succeeded'
    });
  } catch (error) {
    // Enhanced error logging with safe property access
    const errorDetails = {
      name: error?.name || 'UnknownError',
      message: error?.message || 'An unknown error occurred',
      stack: error?.stack || 'No stack trace available',
      code: error?.code || 'NO_CODE',
      timestamp: new Date().toISOString(),
      endpoint: 'BuySubscription',
      method: req.method,
      receivedParams: {
        uid: uid || 'undefined',
        plan: plan || 'undefined', 
        totalPrice: totalPrice || 'undefined',
        paymentIntentId: paymentIntentId || 'undefined',
        orderId: orderId || 'undefined',
        paymentMethod: paymentMethod || 'undefined',
        forceFailure: forceFailure || false,
        reason: reason || 'undefined'
      }
    };
    
    console.error('Error in BuySubscription:', errorDetails);
    
    // Save failed payment information to user_order table with enhanced error handling
    try {
      const supabase = getSupabaseClient();
      const now = new Date();
      
      // Only save to database if we have at least a payment intent ID or some identifying information
      if (paymentIntentId || uid) {
        const orderData = {
          uid: uid || 'unknown',
          plan_name: plan || 'unknown',
          total_price: totalPrice || 0,
          coins_added: 0,
          plan_valid_till: now.toISOString(),
          coupon_id: couponId || null,
          status: 'failed',
          payment_intent_id: paymentIntentId || null,
          payment_status: 'failed',
          order_id: orderId || null,
          payment_method: paymentMethod || 'unknown',
          payment_created_at: now.toISOString(),
          payment_updated_at: now.toISOString(),
          error_message: errorDetails.message,
          error_code: errorDetails.code
        };
        
        const { error: saveError } = await supabase
          .from('user_order')
          .insert([orderData]);
        
        if (saveError) {
          console.error('Error saving failed payment information:', {
            error: saveError.message,
            orderData
          });
        } else {
          console.log('Failed payment information saved to user_order table:', {
            uid: uid || 'unknown',
            paymentIntentId: paymentIntentId || 'none',
            errorMessage: errorDetails.message
          });
        }
      } else {
        console.log('Skipping database save - insufficient identifying information');
      }
    } catch (saveError) {
      console.error('Critical error saving failed payment information:', {
        saveError: saveError?.message || 'Unknown save error',
        originalError: errorDetails.message
      });
    }
    
    // Determine appropriate HTTP status code
    let statusCode = 500;
    if (error?.message?.includes('required') || error?.message?.includes('Validation failed')) {
      statusCode = 400;
    } else if (error?.message?.includes('not found')) {
      statusCode = 404;
    }
    
    res.status(statusCode).json({ 
      success: false, 
      message: error?.message || 'Internal server error',
      error: {
        code: errorDetails.code,
        timestamp: errorDetails.timestamp
      },
      paymentIntentId: paymentIntentId || null,
      orderId: orderId || null,
      paymentStatus: 'failed'
    });
  }
});

// Handle cancelled payments
router.all('/CancelSubscription', async (req, res) => {
  try {
    console.log('CancelSubscription endpoint called');
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);
    
    // Support both GET and POST methods
    const uid = req.method === 'GET' ? req.query.uid : req.body.uid;
    const plan = req.method === 'GET' ? req.query.plan : req.body.plan;
    const totalPrice = req.method === 'GET' ? parseFloat(req.query.totalPrice) : req.body.totalPrice;
    const paymentIntentId = req.method === 'GET' ? req.query.paymentIntentId : req.body.paymentIntentId;
    const orderId = req.method === 'GET' ? req.query.orderId : req.body.orderId;
    const paymentMethod = req.method === 'GET' ? req.query.paymentMethod : req.body.paymentMethod;
    
    console.log('Extracted parameters:', { uid, plan, totalPrice, paymentIntentId, orderId, paymentMethod });
    
    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID is required' });
    }
    
    const supabase = getSupabaseClient();
    const now = new Date();
    
    // Save cancelled payment information to user_order table
    const { error: orderError } = await supabase
      .from('user_order')
      .insert([{
        uid,
        plan_name: plan || 'unknown',
        total_price: totalPrice || 0,
        coins_added: 0,
        plan_valid_till: now.toISOString(),
        coupon_id: null,
        status: 'cancelled',
        payment_intent_id: paymentIntentId || null,
        payment_status: 'cancelled',
        order_id: orderId || null,
        payment_method: paymentMethod || null,
        payment_created_at: now.toISOString(),
        payment_updated_at: now.toISOString()
      }]);
    
    if (orderError) {
      console.error('Error saving cancelled payment information:', orderError);
      return res.status(500).json({ success: false, message: orderError.message });
    }
    
    console.log('Cancelled payment information saved successfully');
    
    res.json({ 
      success: true, 
      message: 'Payment cancellation recorded successfully',
      paymentIntentId: paymentIntentId,
      orderId: orderId,
      paymentStatus: 'cancelled'
    });
    
  } catch (error) {
    console.error('Error in CancelSubscription:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      paymentStatus: 'cancelled'
    });
  }
});

// Edit user
router.all('/edituser', async (req, res) => {
  try {
    console.log('edituser endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    
    // Support both GET and POST methods
    const uid = req.method === 'GET' ? req.query.uid : req.body.uid;
    const name = req.method === 'GET' ? req.query.name : req.body.name;
    const age = req.method === 'GET' ? parseInt(req.query.age) : req.body.age;
    const gender = req.method === 'GET' ? req.query.gender : req.body.gender;
    const dp_url = req.method === 'GET' ? req.query.dp_url : req.body.dp_url;
    
    console.log('Extracted parameters:', { uid, name, age, gender, dp_url });

    if (!uid) {
      console.log('UID is missing');
      return res.status(400).json({ success: false, message: 'UID is required' });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('users')
      .update({ 
        name,
        age,
        gender,
        dp_url
      })
      .eq('uid', uid);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error in edituser:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Submit help request
router.all('/getHelp', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  try {
    console.log('getHelp endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    
    // Parse request body for POST requests
    let parsedBody = {};
    
    // First check if parsedBody exists (from index.js)
    if (req.parsedBody && typeof req.parsedBody === 'object') {
      console.log('Using req.parsedBody:', req.parsedBody);
      parsedBody = req.parsedBody;
    }
    // Then check if bodyJSON exists (from handler.js or serverless.js)
    else if (req.bodyJSON && typeof req.bodyJSON === 'object') {
      console.log('Using req.bodyJSON:', req.bodyJSON);
      parsedBody = req.bodyJSON;
    }
    // Then try to parse from req.body
    else if (req.body) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        console.log('Using req.body as object');
        parsedBody = req.body;
      } else if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
          console.log('Manually parsed string body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing string body:', parseError);
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const bufferString = req.body.toString('utf8');
          console.log('Buffer as string:', bufferString);
          parsedBody = JSON.parse(bufferString);
          console.log('Manually parsed buffer body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing buffer body:', parseError);
        }
      }
    }
    
    // Support both GET and POST methods
    let issue, description, orderId, uid;
    
    if (req.method === 'GET') {
      issue = req.query.issue;
      description = req.query.description;
      orderId = req.query.orderId;
      uid = req.query.uid;
      console.log('GET parameters:', { issue, description, orderId, uid });
    } else {
      // For POST, try multiple sources in order of preference
      issue = parsedBody.issue || 
              (req.parsedBody && req.parsedBody.issue) || 
              (req.body && req.body.issue) || 
              (req.bodyJSON && req.bodyJSON.issue);
      
      description = parsedBody.description || 
                   (req.parsedBody && req.parsedBody.description) || 
                   (req.body && req.body.description) || 
                   (req.bodyJSON && req.bodyJSON.description);
      
      orderId = parsedBody.orderId || 
                (req.parsedBody && req.parsedBody.orderId) || 
                (req.body && req.body.orderId) || 
                (req.bodyJSON && req.bodyJSON.orderId);
      
      uid = parsedBody.uid || 
            (req.parsedBody && req.parsedBody.uid) || 
            (req.body && req.body.uid) || 
            (req.bodyJSON && req.bodyJSON.uid);
      
      console.log('POST parameters:', { issue, description, orderId, uid });
    }
    
    console.log('Final extracted parameters:', { issue, description, orderId, uid });

    if (!issue || !uid) {
      console.log('Missing required fields');
      return res.status(400).json({ success: false, message: 'Missing required fields: issue, uid' });
    }

    const supabase = getSupabaseClient();
    
    // Insert help request into database
    const { data: helpRequestData, error } = await supabase
      .from('help_requests')
      .insert([{
        issue_type: issue,
        description: description || '',
        order_id: orderId || null,
        uid,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Error submitting help request:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    // Get user email for notification
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('uid', uid)
      .single();

    if (!userError && userData && userData.email) {
      // Send confirmation email to user
      try {
        const emailSubject = 'Help Request Received - MatrixAI Support';
        const emailMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Help Request Received</h2>
            <p>Dear ${userData.name || 'User'},</p>
            <p>We have received your help request and our support team will review it shortly.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Request Details:</h3>
              <p><strong>Issue Type:</strong> ${issue}</p>
              <p><strong>Description:</strong> ${description || 'No description provided'}</p>
              ${orderId ? `<p><strong>Order ID:</strong> ${orderId}</p>` : ''}
              <p><strong>Request ID:</strong> ${helpRequestData[0]?.id || 'N/A'}</p>
            </div>
            
            <p>You will receive another email once our team resolves your request.</p>
            <p>Thank you for using MatrixAI!</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        `;

        await axios.post(`${process.env.BASE_URL || 'http://localhost:3000'}/api/email/send`, {
          to: userData.email,
          subject: emailSubject,
          message: emailMessage
        });
        
        console.log('Help request confirmation email sent to:', userData.email);
      } catch (emailError) {
        console.error('Error sending help request confirmation email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({ success: true, message: 'Help request submitted successfully' });
  } catch (error) {
    console.error('Error in getHelp:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Submit feedback
router.all('/submitFeedback', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  try {
    console.log('submitFeedback endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    
    // Parse request body for POST requests
    let parsedBody = {};
    
    // First check if parsedBody exists (from index.js)
    if (req.parsedBody && typeof req.parsedBody === 'object') {
      console.log('Using req.parsedBody:', req.parsedBody);
      parsedBody = req.parsedBody;
    }
    // Then check if bodyJSON exists (from handler.js or serverless.js)
    else if (req.bodyJSON && typeof req.bodyJSON === 'object') {
      console.log('Using req.bodyJSON:', req.bodyJSON);
      parsedBody = req.bodyJSON;
    }
    // Then try to parse from req.body
    else if (req.body) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        console.log('Using req.body as object');
        parsedBody = req.body;
      } else if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
          console.log('Manually parsed string body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing string body:', parseError);
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          const bufferString = req.body.toString('utf8');
          console.log('Buffer as string:', bufferString);
          parsedBody = JSON.parse(bufferString);
          console.log('Manually parsed buffer body:', parsedBody);
        } catch (parseError) {
          console.error('Error parsing buffer body:', parseError);
        }
      }
    }
    
    // Support both GET and POST methods
    let issue, description, uid;
    
    if (req.method === 'GET') {
      issue = req.query.issue;
      description = req.query.description;
      uid = req.query.uid;
      console.log('GET parameters:', { issue, description, uid });
    } else {
      // For POST, try multiple sources in order of preference
      issue = parsedBody.issue || 
              (req.parsedBody && req.parsedBody.issue) || 
              (req.body && req.body.issue) || 
              (req.bodyJSON && req.bodyJSON.issue);
      
      description = parsedBody.description || 
                   (req.parsedBody && req.parsedBody.description) || 
                   (req.body && req.body.description) || 
                   (req.bodyJSON && req.bodyJSON.description);
      
      uid = parsedBody.uid || 
            (req.parsedBody && req.parsedBody.uid) || 
            (req.body && req.body.uid) || 
            (req.bodyJSON && req.bodyJSON.uid);
      
      console.log('POST parameters:', { issue, description, uid });
    }
    
    console.log('Final extracted parameters:', { issue, description, uid });

    if (!issue || !uid) {
      console.log('Missing required fields');
      return res.status(400).json({ success: false, message: 'Missing required fields: issue, uid' });
    }

    const supabase = getSupabaseClient();
    
    // Insert feedback into database
    const { data: feedbackData, error } = await supabase
      .from('feedback')
      .insert([{
        issue_type: issue,
        description: description || '',
        uid,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Error submitting feedback:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    // Get user email for notification
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('uid', uid)
      .single();

    if (!userError && userData && userData.email) {
      // Send confirmation email to user
      try {
        const emailSubject = 'Feedback Received - Thank You!';
        const emailMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank You for Your Feedback!</h2>
            <p>Dear ${userData.name || 'User'},</p>
            <p>We have received your feedback and appreciate you taking the time to share your thoughts with us.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Feedback Details:</h3>
              <p><strong>Type:</strong> ${issue}</p>
              <p><strong>Description:</strong> ${description || 'No description provided'}</p>
              <p><strong>Feedback ID:</strong> ${feedbackData[0]?.id || 'N/A'}</p>
            </div>
            
            <p>Our team will review your feedback and may reach out if we need any clarification.</p>
            <p>Thank you for helping us improve MatrixAI!</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        `;

        await axios.post(`${process.env.BASE_URL || 'http://localhost:3000'}/api/email/send`, {
          to: userData.email,
          subject: emailSubject,
          message: emailMessage
        });
        
        console.log('Feedback confirmation email sent to:', userData.email);
      } catch (emailError) {
        console.error('Error sending feedback confirmation email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error in submitFeedback:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get subscription plans API
router.all('/getSubscriptionPlans', async (req, res) => {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = getSupabaseClient();
    const { uid } = req.method === 'GET' ? req.query : req.body;

    // Get all subscription plans
    const { data: allPlans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('plan_name');

    if (plansError) {
      console.error('Error fetching subscription plans:', plansError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription plans'
      });
    }

    // If no uid provided, return all plans except addon (non-logged-in users)
    if (!uid) {
      const plansWithoutAddon = allPlans.filter(plan => plan.plan_name !== 'Addon');
      return res.status(200).json({
        success: true,
        plans: plansWithoutAddon,
        message: 'Subscription plans retrieved successfully (excluding addon for non-logged-in users)'
      });
    }

    // If uid provided, check if user has active subscription
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_active, user_plan, plan_expiry_date')
      .eq('uid', uid)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user information'
      });
    }

    // Check if user has an active plan
    const hasActivePlan = userData.subscription_active && 
                         userData.user_plan && 
                         userData.plan_expiry_date && 
                         new Date(userData.plan_expiry_date) > new Date();

    if (hasActivePlan) {
      // User has active plan, only return addon plans
      const addonPlans = allPlans.filter(plan => plan.plan_name === 'Addon');
      return res.status(200).json({
        success: true,
        plans: addonPlans,
        message: 'Addon plans retrieved for user with active subscription',
        userPlan: userData.user_plan,
        hasActivePlan: true
      });
    } else {
      // User has no active plan, return all plans except addon (non-pro users)
      const plansWithoutAddon = allPlans.filter(plan => plan.plan_name !== 'Addon');
      return res.status(200).json({
        success: true,
        plans: plansWithoutAddon,
        message: 'Subscription plans retrieved for user without active subscription (excluding addon for non-pro users)',
        hasActivePlan: false
      });
    }

  } catch (error) {
    console.error('Error in getSubscriptionPlans:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;