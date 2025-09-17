const { getSupabaseClient } = require('../config/database');

/**
 * Service to handle subscription expiration logic
 * This implements the new subscription system requirements:
 * - Monthly plans expire after 30 days with data clearing
 * - Yearly plans refresh coins every 30 days and expire after 365 days
 * - Addon plans expire with the main plan
 */
class SubscriptionExpirationService {
  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Handle monthly and tester plan expiration
   * After 30 days: coins become 0, subscription_active becomes false, user_plan becomes null
   */
  async handleMonthlyPlanExpiration() {
    try {
      console.log('Checking for expired monthly/tester plans at', new Date().toISOString());
      
      const { data: expiredUsers, error: selectError } = await this.supabase
        .from('users')
        .select('uid, email, user_plan')
        .in('user_plan', ['Monthly', 'Tester'])
        .lte('plan_expiry_date', new Date().toISOString())
        .eq('subscription_active', true);
      
      if (selectError) {
        console.error('Error selecting expired monthly users:', selectError);
        return { success: false, error: selectError };
      }
      
      if (!expiredUsers || expiredUsers.length === 0) {
        console.log('No expired monthly/tester plans found');
        return { success: true, affected: 0 };
      }
      
      // Update expired users
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          user_coins: 0,
          subscription_active: false,
          user_plan: null,
          plan_valid_till: null,
          coins_expiry: null,
          plan_expiry_date: null,
          next_coin_refresh: null,
          plan_purchase_date: null
        })
        .in('user_plan', ['Monthly', 'Tester'])
        .lte('plan_expiry_date', new Date().toISOString())
        .eq('subscription_active', true);
      
      if (updateError) {
        console.error('Error updating expired monthly users:', updateError);
        return { success: false, error: updateError };
      }
      
      console.log(`Expired ${expiredUsers.length} monthly/tester plans`);
      return { success: true, affected: expiredUsers.length, users: expiredUsers };
      
    } catch (error) {
      console.error('Error in handleMonthlyPlanExpiration:', error);
      return { success: false, error };
    }
  }

  /**
   * Handle yearly plan coin refresh (every 30 days)
   * Reset coins to 0, then add new coins from the plan
   */
  async handleYearlyPlanCoinRefresh() {
    try {
      console.log('Checking for yearly plan coin refresh at', new Date().toISOString());
      
      // Get users who need coin refresh
      const { data: refreshUsers, error: selectError } = await this.supabase
        .from('users')
        .select('uid, email, user_plan')
        .eq('user_plan', 'Yearly')
        .lte('next_coin_refresh', new Date().toISOString())
        .gt('plan_expiry_date', new Date().toISOString())
        .eq('subscription_active', true);
      
      if (selectError) {
        console.error('Error selecting users for coin refresh:', selectError);
        return { success: false, error: selectError };
      }
      
      if (!refreshUsers || refreshUsers.length === 0) {
        console.log('No yearly plans need coin refresh');
        return { success: true, affected: 0 };
      }
      
      // Get yearly plan coins
      const { data: yearlyPlan, error: planError } = await this.supabase
        .from('subscription_plans')
        .select('coins')
        .eq('plan_name', 'Yearly')
        .single();
      
      if (planError || !yearlyPlan) {
        console.error('Error fetching yearly plan:', planError);
        return { success: false, error: planError };
      }
      
      const planCoins = yearlyPlan.coins;
      const now = new Date();
      const nextRefresh = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const coinsExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Update users with refreshed coins
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          user_coins: planCoins, // Reset to plan coins (effectively 0 then add new)
          coins_expiry: coinsExpiry.toISOString(),
          next_coin_refresh: nextRefresh.toISOString(),
          last_coin_addition: now.toISOString()
        })
        .eq('user_plan', 'Yearly')
        .lte('next_coin_refresh', new Date().toISOString())
        .gt('plan_expiry_date', new Date().toISOString())
        .eq('subscription_active', true);
      
      if (updateError) {
        console.error('Error updating yearly plan coins:', updateError);
        return { success: false, error: updateError };
      }
      
      console.log(`Refreshed coins for ${refreshUsers.length} yearly plan users`);
      return { success: true, affected: refreshUsers.length, users: refreshUsers };
      
    } catch (error) {
      console.error('Error in handleYearlyPlanCoinRefresh:', error);
      return { success: false, error };
    }
  }

  /**
   * Handle yearly plan final expiration (after 365 days)
   * Clear all user data in the users table
   */
  async handleYearlyPlanFinalExpiration() {
    try {
      console.log('Checking for expired yearly plans at', new Date().toISOString());
      
      const { data: expiredUsers, error: selectError } = await this.supabase
        .from('users')
        .select('uid, email, user_plan')
        .eq('user_plan', 'Yearly')
        .lte('plan_expiry_date', new Date().toISOString())
        .eq('subscription_active', true);
      
      if (selectError) {
        console.error('Error selecting expired yearly users:', selectError);
        return { success: false, error: selectError };
      }
      
      if (!expiredUsers || expiredUsers.length === 0) {
        console.log('No expired yearly plans found');
        return { success: true, affected: 0 };
      }
      
      // Clear all subscription data for expired yearly plans
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          user_coins: 0,
          subscription_active: false,
          user_plan: null,
          plan_valid_till: null,
          coins_expiry: null,
          last_coin_addition: null,
          next_coin_refresh: null,
          plan_expiry_date: null,
          plan_purchase_date: null
        })
        .eq('user_plan', 'Yearly')
        .lte('plan_expiry_date', new Date().toISOString())
        .eq('subscription_active', true);
      
      if (updateError) {
        console.error('Error updating expired yearly users:', updateError);
        return { success: false, error: updateError };
      }
      
      console.log(`Expired ${expiredUsers.length} yearly plans and cleared user data`);
      return { success: true, affected: expiredUsers.length, users: expiredUsers };
      
    } catch (error) {
      console.error('Error in handleYearlyPlanFinalExpiration:', error);
      return { success: false, error };
    }
  }

  /**
   * Handle addon plan expiration
   * Addon plans expire with the main plan's coin date
   */
  async handleAddonPlanExpiration() {
    try {
      console.log('Checking for addon plan expiration at', new Date().toISOString());
      
      // Clear coins for users whose coins have expired but subscription is inactive
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ user_coins: 0 })
        .lte('coins_expiry', new Date().toISOString())
        .eq('subscription_active', false);
      
      if (updateError) {
        console.error('Error clearing expired addon coins:', updateError);
        return { success: false, error: updateError };
      }
      
      console.log('Cleared expired addon coins for inactive users');
      return { success: true };
      
    } catch (error) {
      console.error('Error in handleAddonPlanExpiration:', error);
      return { success: false, error };
    }
  }

  /**
   * Master function to process all subscription expirations
   */
  async processAllExpirations() {
    try {
      console.log('=== Starting subscription expiration processing ===');
      const startTime = new Date();
      
      const results = {
        monthly: await this.handleMonthlyPlanExpiration(),
        yearlyRefresh: await this.handleYearlyPlanCoinRefresh(),
        yearlyExpire: await this.handleYearlyPlanFinalExpiration(),
        addon: await this.handleAddonPlanExpiration()
      };
      
      const endTime = new Date();
      const duration = endTime - startTime;
      
      console.log('=== Subscription expiration processing complete ===');
      console.log(`Processing took ${duration}ms`);
      console.log('Results:', JSON.stringify(results, null, 2));
      
      return {
        success: true,
        duration,
        results
      };
      
    } catch (error) {
      console.error('Error in processAllExpirations:', error);
      return { success: false, error };
    }
  }

  /**
   * Get subscription monitoring data
   */
  async getSubscriptionMonitoring() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select(`
          uid,
          email,
          user_plan,
          subscription_active,
          user_coins,
          plan_purchase_date,
          plan_expiry_date,
          next_coin_refresh,
          coins_expiry
        `)
        .or('subscription_active.eq.true,plan_expiry_date.not.is.null')
        .order('plan_expiry_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching subscription monitoring data:', error);
        return { success: false, error };
      }
      
      // Add status and days until expiry
      const enrichedData = data.map(user => {
        const now = new Date();
        let status = 'ACTIVE';
        let daysUntilExpiry = null;
        
        if (user.plan_expiry_date) {
          const expiryDate = new Date(user.plan_expiry_date);
          daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
          
          if (expiryDate <= now) {
            status = 'EXPIRED';
          } else if (user.next_coin_refresh && new Date(user.next_coin_refresh) <= now && user.user_plan === 'Yearly') {
            status = 'NEEDS_COIN_REFRESH';
          } else if (user.coins_expiry && new Date(user.coins_expiry) <= now) {
            status = 'COINS_EXPIRED';
          }
        }
        
        return {
          ...user,
          status,
          days_until_expiry: daysUntilExpiry
        };
      });
      
      return { success: true, data: enrichedData };
      
    } catch (error) {
      console.error('Error in getSubscriptionMonitoring:', error);
      return { success: false, error };
    }
  }
}

module.exports = SubscriptionExpirationService;