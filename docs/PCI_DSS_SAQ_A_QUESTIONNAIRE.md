# PCI DSS Self-Assessment Questionnaire (SAQ A)
## MatrixAI Payment System - Airwallex Integration

**Company Name**: MatrixAI  
**Assessment Date**: January 2025  
**Assessment Period**: January 2025 - January 2026  
**Assessor**: Development Team  
**Payment Processor**: Airwallex  

---

## SAQ A Applicability

This SAQ A is applicable to merchants who:
- Accept only card-not-present (e-commerce or mail/telephone-order) transactions
- All cardholder data functions are outsourced to PCI DSS validated third-party service providers
- Do not electronically store, process, or transmit any cardholder data on their systems or premises
- Have confirmed that all payment processing is handled by a PCI DSS validated payment processor

**✅ MatrixAI Confirmation**: Our payment system meets all SAQ A criteria through Airwallex hosted payment pages.

---

## PCI DSS Requirements Assessment

### Requirement 2: Do not use vendor-supplied defaults for system passwords and other security parameters

**2.1** Always change vendor-supplied defaults and remove or disable unnecessary default accounts before installing a system on the network.

**Status**: ✅ **COMPLIANT**  
**Evidence**: 
- All Airwallex API credentials use custom, secure values
- No default passwords are used in the system
- Environment variables are used for all sensitive configuration

---

### Requirement 8: Identify and authenticate access to system components

**8.1** Define and implement policies and procedures to ensure proper user identification management.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Airwallex API access uses unique client ID and API key
- Access tokens are properly managed with expiration
- No shared accounts are used

**8.2** In addition to assigning a unique ID, ensure proper user-authentication management.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Strong authentication required for Airwallex API access
- API keys are securely stored in environment variables
- Access tokens are refreshed automatically

**8.3** Secure all individual non-console administrative access and all remote access to the CDE using multi-factor authentication.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- No direct access to cardholder data environment (CDE)
- All payment processing handled by Airwallex
- Administrative access to payment system requires proper authentication

---

### Requirement 9: Restrict physical access to cardholder data

**9.1** Use appropriate facility entry controls to limit and monitor physical access to systems in the cardholder data environment.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- No cardholder data stored on our systems
- All payment processing occurs on Airwallex infrastructure
- Our servers do not constitute a cardholder data environment

---

### Requirement 10: Track and monitor all access to network resources and cardholder data

**10.1** Implement audit trails to link all access to system components to each individual user.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Payment API requests are logged with user identification
- Airwallex API calls are tracked and monitored
- No direct access to cardholder data to track

**10.2** Implement automated audit trails for all system components.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Automated logging implemented for all payment operations
- Payment request logging middleware captures all transactions
- Logs include timestamps, user IDs, and transaction details

**10.3** Record audit trail entries for all system components.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Comprehensive logging implemented in PaymentLogger class
- All payment-related activities are logged
- Logs are sanitized to prevent cardholder data exposure

---

### Requirement 11: Regularly test security systems and processes

**11.1** Implement processes to test for the presence of wireless access points (802.11), and detect and identify all authorized and unauthorized wireless access points on a quarterly basis.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Payment processing is web-based, not dependent on wireless infrastructure
- Airwallex handles all security testing for payment processing
- Our application security is regularly reviewed

**11.2** Run internal and external network vulnerability scans at least quarterly and after any significant change in the network.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Regular security assessments of application infrastructure
- Airwallex maintains PCI DSS compliance for payment processing
- No cardholder data environment to scan

---

### Requirement 12: Maintain a policy that addresses information security for all personnel

**12.1** Establish, publish, maintain, and disseminate a security policy.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- PCI DSS compliance policy established
- Security practices documented in code and procedures
- Team trained on secure payment processing practices

**12.2** Implement a risk-assessment process.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Risk assessment completed (see PCI_DSS_COMPLIANCE_ANALYSIS.md)
- Regular review of payment security practices
- Continuous monitoring of Airwallex security updates

**12.3** Develop usage policies for critical technologies.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Secure coding practices for payment integration
- API security guidelines followed
- Environment variable management for sensitive data

**12.4** Ensure that the security policy and procedures clearly define information security responsibilities for all personnel.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Development team trained on PCI DSS requirements
- Clear responsibilities for payment system maintenance
- Regular review of security practices

**12.5** Assign to an individual or team the following information security management responsibilities.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Development team responsible for payment system security
- Regular monitoring of Airwallex compliance status
- Incident response procedures established

**12.6** Implement a formal security awareness program to make all personnel aware of the cardholder data security policy and procedures.

**Status**: ✅ **COMPLIANT**  
**Evidence**:
- Team educated on PCI DSS requirements
- Secure development practices implemented
- Regular security updates and training

---

## Compliance Summary

**Overall Status**: ✅ **FULLY COMPLIANT**

**Key Compliance Factors**:
1. ✅ No cardholder data stored, processed, or transmitted by our systems
2. ✅ All payment processing handled by PCI DSS compliant Airwallex
3. ✅ Hosted payment page integration eliminates cardholder data exposure
4. ✅ Secure API integration with proper authentication
5. ✅ Comprehensive logging with data sanitization
6. ✅ Security headers and HTTPS enforcement

**Next Assessment Due**: January 2026

---

## Attestation

I, as the responsible party for MatrixAI's payment system, attest that:

1. The payment system has been assessed against the PCI DSS requirements
2. All applicable requirements have been implemented and are operational
3. The system uses only PCI DSS compliant service providers (Airwallex)
4. No cardholder data is stored, processed, or transmitted by our systems
5. This assessment will be reviewed annually

**Signature**: _________________________  
**Name**: Development Team Lead  
**Title**: Technical Lead  
**Date**: January 2025  

---

**Document Version**: 1.0  
**Classification**: Internal Use  
**Review Frequency**: Annual  
**Next Review**: January 2026