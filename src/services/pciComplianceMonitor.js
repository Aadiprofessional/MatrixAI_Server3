/**
 * PCI-DSS Compliance Monitoring Service
 * Monitors compliance status, tracks renewal dates, and generates compliance reports
 */

const { PaymentLogger } = require('../middleware/paymentErrorHandler');
const fs = require('fs').promises;
const path = require('path');

class PCIComplianceMonitor {
  constructor() {
    this.complianceDataPath = path.join(__dirname, '../data/pci_compliance.json');
    this.complianceStatus = null;
    this.lastCheck = null;
    
    // Initialize compliance monitoring
    this.initializeCompliance();
  }

  /**
   * Initialize compliance monitoring system
   */
  async initializeCompliance() {
    try {
      await this.loadComplianceData();
      await this.scheduleComplianceChecks();
      
      PaymentLogger.info('PCI-DSS compliance monitoring initialized', {
        lastAssessment: this.complianceStatus?.lastAssessment,
        nextRenewal: this.complianceStatus?.nextRenewal,
        status: this.complianceStatus?.status
      });
    } catch (error) {
      PaymentLogger.error('Failed to initialize PCI-DSS compliance monitoring', error);
      
      // Create default compliance data if file doesn't exist
      await this.createDefaultComplianceData();
    }
  }

  /**
   * Load compliance data from storage
   */
  async loadComplianceData() {
    try {
      const data = await fs.readFile(this.complianceDataPath, 'utf8');
      this.complianceStatus = JSON.parse(data);
      this.lastCheck = new Date();
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create default data
        await this.createDefaultComplianceData();
      } else {
        throw error;
      }
    }
  }

  /**
   * Create default compliance data structure
   */
  async createDefaultComplianceData() {
    const defaultData = {
      merchantLevel: 'Level 4',
      sqaType: 'SAQ A',
      status: 'COMPLIANT',
      lastAssessment: new Date().toISOString(),
      nextRenewal: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      assessmentHistory: [
        {
          date: new Date().toISOString(),
          type: 'SAQ A',
          status: 'COMPLIANT',
          assessor: 'Internal Self-Assessment',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      requirements: {
        'SAQ_A_2.1': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_8.1': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_8.2': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_8.3': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_9.1': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_10.1': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_10.2': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_10.3': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_11.1': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_11.2': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_12.1': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_12.2': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_12.3': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_12.4': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_12.5': { status: 'COMPLIANT', lastChecked: new Date().toISOString() },
        'SAQ_A_12.6': { status: 'COMPLIANT', lastChecked: new Date().toISOString() }
      },
      serviceProviders: {
        airwallex: {
          name: 'Airwallex',
          level: 'Level 1',
          status: 'VALIDATED',
          lastValidation: new Date().toISOString(),
          nextValidation: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          services: ['Payment Processing', 'Hosted Payment Pages', 'Payment Intent Management']
        }
      },
      monitoring: {
        enabled: true,
        checkInterval: '24h',
        alertThresholds: {
          renewalWarning: 90, // days before renewal
          complianceCheck: 30 // days between compliance checks
        },
        lastMonitoringCheck: new Date().toISOString()
      },
      alerts: [],
      reports: []
    };

    await this.saveComplianceData(defaultData);
    this.complianceStatus = defaultData;
  }

  /**
   * Save compliance data to storage
   */
  async saveComplianceData(data = null) {
    try {
      const dataToSave = data || this.complianceStatus;
      
      // Ensure data directory exists
      const dataDir = path.dirname(this.complianceDataPath);
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(this.complianceDataPath, JSON.stringify(dataToSave, null, 2));
      
      PaymentLogger.info('PCI-DSS compliance data saved', {
        timestamp: new Date().toISOString(),
        status: dataToSave.status
      });
    } catch (error) {
      PaymentLogger.error('Failed to save PCI-DSS compliance data', error);
      throw error;
    }
  }

  /**
   * Check current compliance status
   */
  async checkComplianceStatus() {
    try {
      const now = new Date();
      const renewalDate = new Date(this.complianceStatus.nextRenewal);
      const daysUntilRenewal = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));

      // Check if renewal is approaching
      if (daysUntilRenewal <= this.complianceStatus.monitoring.alertThresholds.renewalWarning) {
        await this.createAlert('RENEWAL_WARNING', `PCI-DSS compliance renewal due in ${daysUntilRenewal} days`);
      }

      // Check if compliance has expired
      if (daysUntilRenewal <= 0) {
        this.complianceStatus.status = 'EXPIRED';
        await this.createAlert('COMPLIANCE_EXPIRED', 'PCI-DSS compliance has expired - immediate action required');
      }

      // Update last monitoring check
      this.complianceStatus.monitoring.lastMonitoringCheck = now.toISOString();
      await this.saveComplianceData();

      PaymentLogger.info('PCI-DSS compliance status checked', {
        status: this.complianceStatus.status,
        daysUntilRenewal,
        nextRenewal: this.complianceStatus.nextRenewal
      });

      return {
        status: this.complianceStatus.status,
        daysUntilRenewal,
        nextRenewal: this.complianceStatus.nextRenewal,
        lastAssessment: this.complianceStatus.lastAssessment
      };
    } catch (error) {
      PaymentLogger.error('Failed to check PCI-DSS compliance status', error);
      throw error;
    }
  }

  /**
   * Create compliance alert
   */
  async createAlert(type, message, severity = 'HIGH') {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.complianceStatus.alerts.push(alert);
    
    PaymentLogger.warn('PCI-DSS compliance alert created', {
      alertId: alert.id,
      type: alert.type,
      message: alert.message,
      severity: alert.severity
    });

    // Keep only last 50 alerts
    if (this.complianceStatus.alerts.length > 50) {
      this.complianceStatus.alerts = this.complianceStatus.alerts.slice(-50);
    }

    await this.saveComplianceData();
    return alert;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport() {
    try {
      const report = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        generatedAt: new Date().toISOString(),
        reportType: 'COMPLIANCE_STATUS',
        merchantLevel: this.complianceStatus.merchantLevel,
        sqaType: this.complianceStatus.sqaType,
        overallStatus: this.complianceStatus.status,
        lastAssessment: this.complianceStatus.lastAssessment,
        nextRenewal: this.complianceStatus.nextRenewal,
        daysUntilRenewal: Math.ceil((new Date(this.complianceStatus.nextRenewal) - new Date()) / (1000 * 60 * 60 * 24)),
        requirements: {
          total: Object.keys(this.complianceStatus.requirements).length,
          compliant: Object.values(this.complianceStatus.requirements).filter(req => req.status === 'COMPLIANT').length,
          nonCompliant: Object.values(this.complianceStatus.requirements).filter(req => req.status !== 'COMPLIANT').length
        },
        serviceProviders: Object.keys(this.complianceStatus.serviceProviders).map(key => ({
          name: this.complianceStatus.serviceProviders[key].name,
          status: this.complianceStatus.serviceProviders[key].status,
          level: this.complianceStatus.serviceProviders[key].level
        })),
        activeAlerts: this.complianceStatus.alerts.filter(alert => !alert.acknowledged).length,
        recommendations: this.generateRecommendations()
      };

      // Save report
      this.complianceStatus.reports.push(report);
      
      // Keep only last 12 reports (monthly reports for a year)
      if (this.complianceStatus.reports.length > 12) {
        this.complianceStatus.reports = this.complianceStatus.reports.slice(-12);
      }

      await this.saveComplianceData();

      PaymentLogger.info('PCI-DSS compliance report generated', {
        reportId: report.id,
        status: report.overallStatus,
        daysUntilRenewal: report.daysUntilRenewal
      });

      return report;
    } catch (error) {
      PaymentLogger.error('Failed to generate PCI-DSS compliance report', error);
      throw error;
    }
  }

  /**
   * Generate compliance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const now = new Date();
    const renewalDate = new Date(this.complianceStatus.nextRenewal);
    const daysUntilRenewal = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilRenewal <= 90) {
      recommendations.push({
        priority: 'HIGH',
        category: 'RENEWAL',
        message: 'Begin PCI-DSS compliance renewal process',
        action: 'Schedule SAQ A assessment and AOC completion'
      });
    }

    if (daysUntilRenewal <= 30) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'URGENT_RENEWAL',
        message: 'PCI-DSS compliance renewal is urgent',
        action: 'Complete SAQ A questionnaire and submit AOC immediately'
      });
    }

    // Check for non-compliant requirements
    const nonCompliantReqs = Object.entries(this.complianceStatus.requirements)
      .filter(([key, req]) => req.status !== 'COMPLIANT');
    
    if (nonCompliantReqs.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'COMPLIANCE_ISSUE',
        message: `${nonCompliantReqs.length} requirement(s) are not compliant`,
        action: 'Review and remediate non-compliant requirements immediately'
      });
    }

    // Check service provider validations
    Object.entries(this.complianceStatus.serviceProviders).forEach(([key, provider]) => {
      const validationDate = new Date(provider.nextValidation);
      const daysUntilValidation = Math.ceil((validationDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilValidation <= 60) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'SERVICE_PROVIDER',
          message: `${provider.name} validation expires in ${daysUntilValidation} days`,
          action: `Verify ${provider.name} maintains PCI-DSS Level ${provider.level} compliance`
        });
      }
    });

    return recommendations;
  }

  /**
   * Schedule automatic compliance checks
   */
  async scheduleComplianceChecks() {
    // Check compliance status every 24 hours
    setInterval(async () => {
      try {
        await this.checkComplianceStatus();
      } catch (error) {
        PaymentLogger.error('Scheduled PCI-DSS compliance check failed', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Generate monthly compliance reports
    setInterval(async () => {
      try {
        await this.generateComplianceReport();
      } catch (error) {
        PaymentLogger.error('Scheduled PCI-DSS compliance report generation failed', error);
      }
    }, 30 * 24 * 60 * 60 * 1000); // 30 days

    PaymentLogger.info('PCI-DSS compliance monitoring scheduled', {
      dailyChecks: true,
      monthlyReports: true
    });
  }

  /**
   * Update compliance status after renewal
   */
  async renewCompliance(assessmentData) {
    try {
      const now = new Date();
      const nextRenewal = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

      // Update compliance status
      this.complianceStatus.status = 'COMPLIANT';
      this.complianceStatus.lastAssessment = now.toISOString();
      this.complianceStatus.nextRenewal = nextRenewal.toISOString();

      // Add to assessment history
      this.complianceStatus.assessmentHistory.push({
        date: now.toISOString(),
        type: assessmentData.type || 'SAQ A',
        status: 'COMPLIANT',
        assessor: assessmentData.assessor || 'Internal Self-Assessment',
        validUntil: nextRenewal.toISOString(),
        notes: assessmentData.notes || 'Annual compliance renewal completed'
      });

      // Clear renewal alerts
      this.complianceStatus.alerts = this.complianceStatus.alerts.filter(
        alert => !['RENEWAL_WARNING', 'COMPLIANCE_EXPIRED'].includes(alert.type)
      );

      await this.saveComplianceData();

      PaymentLogger.info('PCI-DSS compliance renewed successfully', {
        newExpiryDate: nextRenewal.toISOString(),
        assessmentType: assessmentData.type || 'SAQ A'
      });

      return {
        success: true,
        status: 'COMPLIANT',
        nextRenewal: nextRenewal.toISOString(),
        message: 'PCI-DSS compliance renewed successfully'
      };
    } catch (error) {
      PaymentLogger.error('Failed to renew PCI-DSS compliance', error);
      throw error;
    }
  }

  /**
   * Get current compliance status
   */
  getComplianceStatus() {
    return {
      status: this.complianceStatus?.status || 'UNKNOWN',
      merchantLevel: this.complianceStatus?.merchantLevel,
      sqaType: this.complianceStatus?.sqaType,
      lastAssessment: this.complianceStatus?.lastAssessment,
      nextRenewal: this.complianceStatus?.nextRenewal,
      daysUntilRenewal: this.complianceStatus?.nextRenewal ? 
        Math.ceil((new Date(this.complianceStatus.nextRenewal) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      activeAlerts: this.complianceStatus?.alerts?.filter(alert => !alert.acknowledged).length || 0,
      lastCheck: this.lastCheck
    };
  }
}

// Export singleton instance
module.exports = new PCIComplianceMonitor();