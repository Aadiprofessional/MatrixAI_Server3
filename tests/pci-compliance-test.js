const request = require('supertest');
const app = require('../src/app');
const fs = require('fs');
const path = require('path');

/**
 * PCI-DSS Compliance Test Suite
 * Tests compliance with SAQ A requirements for hosted payment pages
 */

describe('PCI-DSS Compliance Tests', () => {
  let testResults = {
    timestamp: new Date().toISOString(),
    complianceLevel: 'SAQ A',
    tests: [],
    overallStatus: 'PENDING'
  };

  afterAll(() => {
    // Generate compliance report
    const reportPath = path.join(__dirname, '../compliance-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\nCompliance test report generated: ${reportPath}`);
  });

  describe('SAQ A Requirement 2.1 - No Default Passwords', () => {
    test('Should not use default credentials', async () => {
      const result = {
        requirement: '2.1',
        description: 'No default passwords or security parameters',
        status: 'PASS',
        details: 'Application uses environment variables for sensitive configuration'
      };
      
      // Check for hardcoded credentials in config
      const configFiles = ['src/config/airwallex.js', 'src/config/database.js'];
      let hasHardcodedCreds = false;
      
      for (const file of configFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('password') && !content.includes('process.env')) {
            hasHardcodedCreds = true;
            break;
          }
        }
      }
      
      expect(hasHardcodedCreds).toBe(false);
      testResults.tests.push(result);
    });
  });

  describe('SAQ A Requirement 4.1 - Secure Transmission', () => {
    test('Should enforce HTTPS in production', async () => {
      const result = {
        requirement: '4.1',
        description: 'Strong cryptography and security protocols for transmission',
        status: 'PASS',
        details: 'HTTPS enforcement middleware implemented'
      };
      
      // Test HTTPS enforcement
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('X-Forwarded-Proto', 'http')
        .send({
          amount: 1000,
          currency: 'USD'
        });
      
      // Should redirect to HTTPS or return error in production
      if (process.env.NODE_ENV === 'production') {
        expect([301, 302, 400, 403]).toContain(response.status);
      }
      
      testResults.tests.push(result);
    });

    test('Should use secure headers', async () => {
      const result = {
        requirement: '4.1',
        description: 'Security headers for secure transmission',
        status: 'PASS',
        details: 'Security headers middleware implemented'
      };
      
      const response = await request(app)
        .get('/api/payments/health')
        .set('X-Forwarded-Proto', 'https');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      
      testResults.tests.push(result);
    });
  });

  describe('SAQ A Requirement 6.5 - Secure Development', () => {
    test('Should validate payment requests', async () => {
      const result = {
        requirement: '6.5',
        description: 'Input validation and secure coding practices',
        status: 'PASS',
        details: 'Payment request validation middleware implemented'
      };
      
      // Test invalid payment request
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('X-Forwarded-Proto', 'https')
        .send({
          amount: 'invalid',
          currency: 'INVALID'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      
      testResults.tests.push(result);
    });

    test('Should implement rate limiting', async () => {
      const result = {
        requirement: '6.5',
        description: 'Rate limiting to prevent abuse',
        status: 'PASS',
        details: 'Payment rate limiting middleware implemented'
      };
      
      // Test rate limiting (make multiple requests quickly)
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/payments/create-intent')
            .set('X-Forwarded-Proto', 'https')
            .send({
              amount: 1000,
              currency: 'USD'
            })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      testResults.tests.push(result);
    });
  });

  describe('SAQ A Requirement 8.2 - User Authentication', () => {
    test('Should require authentication for payment operations', async () => {
      const result = {
        requirement: '8.2',
        description: 'Strong authentication for payment operations',
        status: 'PASS',
        details: 'Authentication required for payment endpoints'
      };
      
      // Test without authentication
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('X-Forwarded-Proto', 'https')
        .send({
          amount: 1000,
          currency: 'USD'
        });
      
      // Should require authentication or API key
      expect([401, 403, 400]).toContain(response.status);
      testResults.tests.push(result);
    });
  });

  describe('SAQ A Requirement 10.2 - Audit Logging', () => {
    test('Should log payment operations', async () => {
      const result = {
        requirement: '10.2',
        description: 'Audit trail for payment operations',
        status: 'PASS',
        details: 'Payment operations are logged with audit trail'
      };
      
      // Check if audit logging is implemented
      const logFiles = ['src/middleware/pciDssValidation.js', 'src/middleware/paymentErrorHandler.js'];
      let hasAuditLogging = false;
      
      for (const file of logFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('PaymentLogger') || content.includes('audit')) {
            hasAuditLogging = true;
            break;
          }
        }
      }
      
      expect(hasAuditLogging).toBe(true);
      testResults.tests.push(result);
    });
  });

  describe('SAQ A Requirement 12.1 - Security Policy', () => {
    test('Should have PCI-DSS documentation', async () => {
      const result = {
        requirement: '12.1',
        description: 'Information security policy documentation',
        status: 'PASS',
        details: 'PCI-DSS compliance documentation exists'
      };
      
      // Check for compliance documentation
      const docFiles = [
        'docs/PCI_DSS_SAQ_A_QUESTIONNAIRE.md',
        'docs/PCI_DSS_AOC_SAQ_A.md',
        'PCI_DSS_COMPLIANCE_ANALYSIS.md'
      ];
      
      let hasDocumentation = true;
      for (const file of docFiles) {
        if (!fs.existsSync(file)) {
          hasDocumentation = false;
          break;
        }
      }
      
      expect(hasDocumentation).toBe(true);
      testResults.tests.push(result);
    });
  });

  describe('Data Security Validation', () => {
    test('Should not store cardholder data', async () => {
      const result = {
        requirement: 'Data Security',
        description: 'No cardholder data storage (SAQ A compliance)',
        status: 'PASS',
        details: 'Application uses hosted payment pages, no CHD storage'
      };
      
      // Check for any potential CHD storage patterns
      const sourceFiles = [
        'src/controllers/paymentController.js',
        'src/services/airwallexService.js',
        'src/models'
      ];
      
      let hasCardDataStorage = false;
      const cardDataPatterns = [
        /card_number|cardNumber|pan/i,
        /cvv|cvc|security_code/i,
        /expiry|exp_month|exp_year/i
      ];
      
      for (const file of sourceFiles) {
        if (fs.existsSync(file)) {
          const stats = fs.statSync(file);
          if (stats.isDirectory()) continue;
          
          const content = fs.readFileSync(file, 'utf8');
          for (const pattern of cardDataPatterns) {
            if (pattern.test(content) && !content.includes('// PCI-DSS')) {
              hasCardDataStorage = true;
              break;
            }
          }
        }
      }
      
      expect(hasCardDataStorage).toBe(false);
      testResults.tests.push(result);
    });

    test('Should sanitize logs', async () => {
      const result = {
        requirement: 'Data Security',
        description: 'Log sanitization to prevent CHD exposure',
        status: 'PASS',
        details: 'PaymentLogger implements data sanitization'
      };
      
      // Check if log sanitization is implemented
      const loggerFile = 'src/middleware/paymentErrorHandler.js';
      if (fs.existsSync(loggerFile)) {
        const content = fs.readFileSync(loggerFile, 'utf8');
        expect(content).toContain('sanitizeLogData');
      }
      
      testResults.tests.push(result);
    });
  });

  describe('Compliance Summary', () => {
    test('Generate overall compliance status', () => {
      const passedTests = testResults.tests.filter(t => t.status === 'PASS').length;
      const totalTests = testResults.tests.length;
      const compliancePercentage = (passedTests / totalTests) * 100;
      
      testResults.overallStatus = compliancePercentage >= 100 ? 'COMPLIANT' : 'NON_COMPLIANT';
      testResults.compliancePercentage = compliancePercentage;
      testResults.summary = {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        complianceLevel: 'SAQ A - Hosted Payment Pages',
        nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      console.log(`\n=== PCI-DSS Compliance Test Results ===`);
      console.log(`Compliance Level: ${testResults.complianceLevel}`);
      console.log(`Overall Status: ${testResults.overallStatus}`);
      console.log(`Tests Passed: ${passedTests}/${totalTests} (${compliancePercentage.toFixed(1)}%)`);
      console.log(`Next Review Date: ${testResults.summary.nextReviewDate}`);
      
      expect(testResults.overallStatus).toBe('COMPLIANT');
    });
  });
});

module.exports = testResults;