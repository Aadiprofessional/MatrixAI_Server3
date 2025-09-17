const cron = require('node-cron');
const SubscriptionExpirationService = require('./subscriptionExpirationService');

/**
 * Cron service to handle automatic subscription expiration checks
 * Runs every hour to check for expired subscriptions and coin refreshes
 */
class SubscriptionCronService {
  constructor() {
    this.expirationService = new SubscriptionExpirationService();
    this.isRunning = false;
  }

  /**
   * Start the cron job
   * Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
   */
  start() {
    if (this.isRunning) {
      console.log('Subscription cron service is already running');
      return;
    }

    console.log('Starting subscription cron service...');
    
    // Run every hour at minute 0
    this.cronJob = cron.schedule('0 * * * *', async () => {
      console.log('\n=== Subscription Cron Job Started ===');
      console.log('Time:', new Date().toISOString());
      
      try {
        const result = await this.expirationService.processAllExpirations();
        
        if (result.success) {
          console.log('Subscription processing completed successfully');
        } else {
          console.error('Subscription processing failed:', result.error);
        }
      } catch (error) {
        console.error('Error in subscription cron job:', error);
      }
      
      console.log('=== Subscription Cron Job Completed ===\n');
    }, {
      scheduled: false,
      timezone: 'Asia/Hong_Kong' // Adjust timezone as needed
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('Subscription cron service started successfully');
    console.log('Next run will be at the top of the next hour');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (!this.isRunning) {
      console.log('Subscription cron service is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
    }
    
    this.isRunning = false;
    console.log('Subscription cron service stopped');
  }

  /**
   * Get the status of the cron service
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? 'Top of next hour' : 'Not scheduled'
    };
  }

  /**
   * Run the subscription processing manually (for testing)
   */
  async runManually() {
    console.log('Running subscription processing manually...');
    
    try {
      const result = await this.expirationService.processAllExpirations();
      console.log('Manual run completed:', result);
      return result;
    } catch (error) {
      console.error('Error in manual run:', error);
      return { success: false, error };
    }
  }

  /**
   * Get subscription monitoring data
   */
  async getMonitoringData() {
    try {
      return await this.expirationService.getSubscriptionMonitoring();
    } catch (error) {
      console.error('Error getting monitoring data:', error);
      return { success: false, error };
    }
  }
}

// Create singleton instance
const subscriptionCronService = new SubscriptionCronService();

module.exports = subscriptionCronService;