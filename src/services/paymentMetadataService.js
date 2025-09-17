const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class PaymentMetadataService {
  /**
   * Store payment metadata in database
   * @param {string} paymentIntentId - Airwallex payment intent ID
   * @param {Object} metadata - Payment metadata object
   * @returns {Promise<Object>} - Stored metadata record
   */
  static async storePaymentMetadata(paymentIntentId, metadata) {
    try {
      const {
        uid,
        plan,
        totalPrice,
        orderId,
        paymentMethod = 'airwallex',
        requestId,
        ...additionalMetadata
      } = metadata;

      // Validate required fields
      if (!paymentIntentId || !uid || !plan || !totalPrice) {
        throw new Error('Missing required payment metadata fields');
      }

      const paymentRecord = {
        payment_intent_id: paymentIntentId,
        uid,
        plan,
        total_price: parseFloat(totalPrice),
        order_id: orderId,
        payment_method: paymentMethod,
        request_id: requestId,
        status: 'pending',
        metadata: additionalMetadata,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      };

      const { data, error } = await supabase
        .from('payment_metadata')
        .insert([paymentRecord])
        .select()
        .single();

      if (error) {
        console.error('[PaymentMetadataService] Failed to store payment metadata:', {
          error: error.message,
          paymentIntentId,
          uid,
          plan
        });
        throw new Error(`Failed to store payment metadata: ${error.message}`);
      }

      console.log('[PaymentMetadataService] Payment metadata stored successfully:', {
        paymentIntentId,
        uid,
        plan,
        orderId
      });

      return data;
    } catch (error) {
      console.error('[PaymentMetadataService] Error storing payment metadata:', {
        error: error.message,
        stack: error.stack,
        paymentIntentId
      });
      throw error;
    }
  }

  /**
   * Retrieve payment metadata from database
   * @param {string} paymentIntentId - Airwallex payment intent ID
   * @returns {Promise<Object|null>} - Retrieved metadata or null if not found
   */
  static async getPaymentMetadata(paymentIntentId) {
    try {
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }

      const { data, error } = await supabase
        .from('payment_metadata')
        .select('*')
        .eq('payment_intent_id', paymentIntentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          console.warn('[PaymentMetadataService] No payment metadata found:', {
            paymentIntentId
          });
          return null;
        }
        
        console.error('[PaymentMetadataService] Failed to retrieve payment metadata:', {
          error: error.message,
          paymentIntentId
        });
        throw new Error(`Failed to retrieve payment metadata: ${error.message}`);
      }

      // Check if metadata has expired
      if (data && new Date(data.expires_at) < new Date()) {
        console.warn('[PaymentMetadataService] Payment metadata has expired:', {
          paymentIntentId,
          expiresAt: data.expires_at
        });
        
        // Update status to expired
        await this.updatePaymentMetadataStatus(paymentIntentId, 'expired');
        return null;
      }

      console.log('[PaymentMetadataService] Payment metadata retrieved successfully:', {
        paymentIntentId,
        uid: data.uid,
        plan: data.plan
      });

      return data;
    } catch (error) {
      console.error('[PaymentMetadataService] Error retrieving payment metadata:', {
        error: error.message,
        stack: error.stack,
        paymentIntentId
      });
      throw error;
    }
  }

  /**
   * Update payment metadata status
   * @param {string} paymentIntentId - Airwallex payment intent ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Object>} - Updated metadata record
   */
  static async updatePaymentMetadataStatus(paymentIntentId, status, additionalData = {}) {
    try {
      if (!paymentIntentId || !status) {
        throw new Error('Payment intent ID and status are required');
      }

      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      const { data, error } = await supabase
        .from('payment_metadata')
        .update(updateData)
        .eq('payment_intent_id', paymentIntentId)
        .select()
        .single();

      if (error) {
        console.error('[PaymentMetadataService] Failed to update payment metadata status:', {
          error: error.message,
          paymentIntentId,
          status
        });
        throw new Error(`Failed to update payment metadata status: ${error.message}`);
      }

      console.log('[PaymentMetadataService] Payment metadata status updated:', {
        paymentIntentId,
        status,
        additionalData
      });

      return data;
    } catch (error) {
      console.error('[PaymentMetadataService] Error updating payment metadata status:', {
        error: error.message,
        stack: error.stack,
        paymentIntentId,
        status
      });
      throw error;
    }
  }

  /**
   * Delete payment metadata (cleanup)
   * @param {string} paymentIntentId - Airwallex payment intent ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deletePaymentMetadata(paymentIntentId) {
    try {
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }

      const { error } = await supabase
        .from('payment_metadata')
        .delete()
        .eq('payment_intent_id', paymentIntentId);

      if (error) {
        console.error('[PaymentMetadataService] Failed to delete payment metadata:', {
          error: error.message,
          paymentIntentId
        });
        throw new Error(`Failed to delete payment metadata: ${error.message}`);
      }

      console.log('[PaymentMetadataService] Payment metadata deleted successfully:', {
        paymentIntentId
      });

      return true;
    } catch (error) {
      console.error('[PaymentMetadataService] Error deleting payment metadata:', {
        error: error.message,
        stack: error.stack,
        paymentIntentId
      });
      throw error;
    }
  }

  /**
   * Clean up expired payment metadata
   * @returns {Promise<number>} - Number of records cleaned up
   */
  static async cleanupExpiredMetadata() {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_payment_metadata');

      if (error) {
        console.error('[PaymentMetadataService] Failed to cleanup expired metadata:', {
          error: error.message
        });
        throw new Error(`Failed to cleanup expired metadata: ${error.message}`);
      }

      console.log('[PaymentMetadataService] Expired metadata cleanup completed:', {
        deletedCount: data
      });

      return data;
    } catch (error) {
      console.error('[PaymentMetadataService] Error during metadata cleanup:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get payment metadata by user ID (for debugging/admin purposes)
   * @param {string} uid - User ID
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} - Array of payment metadata records
   */
  static async getPaymentMetadataByUser(uid, limit = 10) {
    try {
      if (!uid) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('payment_metadata')
        .select('*')
        .eq('uid', uid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[PaymentMetadataService] Failed to retrieve user payment metadata:', {
          error: error.message,
          uid
        });
        throw new Error(`Failed to retrieve user payment metadata: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[PaymentMetadataService] Error retrieving user payment metadata:', {
        error: error.message,
        stack: error.stack,
        uid
      });
      throw error;
    }
  }
}

module.exports = PaymentMetadataService;