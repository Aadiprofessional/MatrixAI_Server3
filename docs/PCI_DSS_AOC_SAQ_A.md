# Payment Card Industry Data Security Standard (PCI DSS)
## Attestation of Compliance (AOC) for Self-Assessment Questionnaire (SAQ A)

---

## Company Information

**Company Name**: MatrixAI  
**DBA (if applicable)**: MatrixAI Global  
**Company Address**: [To be filled by company]  
**City, State, ZIP**: [To be filled by company]  
**Country**: [To be filled by company]  
**Website URL**: https://matrixaiglobal.com  

**Contact Information**:  
**Primary Contact Name**: [To be filled]  
**Title**: Technical Lead  
**Telephone**: [To be filled]  
**Email**: [To be filled]  

---

## Assessment Information

**Assessment Type**: Self-Assessment Questionnaire A (SAQ A)  
**Assessment Date**: January 2025  
**Assessment Period**: January 1, 2025 - December 31, 2025  
**PCI DSS Version**: 4.0  

---

## Merchant Information

**Merchant Level**: Level 4 (Processing less than 20,000 e-commerce transactions annually)  
**Card Brands Accepted**: Visa, Mastercard, American Express, Discover  
**Payment Channels**: E-commerce only  
**Payment Processor**: Airwallex  

---

## SAQ A Eligibility Confirmation

I confirm that this entity:

☑️ **Accepts only card-not-present (CNP) transactions**  
☑️ **All cardholder data functions are outsourced to PCI DSS validated third-party service providers**  
☑️ **Does not electronically store, process, or transmit any cardholder data on the company's systems or premises**  
☑️ **Has confirmed that all payment processing is handled by a PCI DSS validated payment processor (Airwallex)**  
☑️ **Uses only hosted payment page solutions provided by PCI DSS validated service providers**  

---

## Assessment Results

### PCI DSS Requirements Compliance Status

| Requirement | Description | Status |
|-------------|-------------|--------|
| 2.1 | Change vendor-supplied defaults | ✅ Compliant |
| 8.1 | User identification management | ✅ Compliant |
| 8.2 | User authentication management | ✅ Compliant |
| 8.3 | Multi-factor authentication | ✅ Compliant |
| 9.1 | Physical access controls | ✅ Compliant |
| 10.1 | Audit trails | ✅ Compliant |
| 10.2 | Automated audit trails | ✅ Compliant |
| 10.3 | Audit trail entries | ✅ Compliant |
| 11.1 | Wireless access point testing | ✅ Compliant |
| 11.2 | Vulnerability scanning | ✅ Compliant |
| 12.1 | Security policy | ✅ Compliant |
| 12.2 | Risk assessment | ✅ Compliant |
| 12.3 | Usage policies | ✅ Compliant |
| 12.4 | Security responsibilities | ✅ Compliant |
| 12.5 | Security management | ✅ Compliant |
| 12.6 | Security awareness | ✅ Compliant |

**Overall Compliance Status**: ✅ **COMPLIANT**

---

## Service Provider Information

**Payment Processor**: Airwallex  
**PCI DSS Compliance Status**: Validated  
**Service Provider Level**: Level 1  
**Validation Date**: [Current - verified through Airwallex]  
**Services Provided**: 
- Payment processing
- Hosted payment pages
- Payment intent management
- Cardholder data handling

---

## Implementation Details

### Payment Flow Architecture
1. **Payment Intent Creation**: Server-side API call to Airwallex
2. **Client Secret Generation**: Airwallex provides secure client secret
3. **Payment Processing**: Customer redirected to Airwallex hosted payment page
4. **Payment Completion**: All cardholder data handled by Airwallex
5. **Status Verification**: Server queries payment status via API

### Security Measures Implemented
- ✅ HTTPS enforcement for all payment operations
- ✅ Security headers implementation (CSP, HSTS, etc.)
- ✅ Secure API authentication with Airwallex
- ✅ Comprehensive logging with data sanitization
- ✅ No cardholder data storage or transmission
- ✅ Regular security assessments

---

## Compensating Controls

**No compensating controls required** - All PCI DSS requirements are met through standard implementation.

---

## Remediation Summary

**No remediation required** - All requirements are compliant.

---

## Attestation

### Part 1: Acknowledgment of Status

I acknowledge that:

☑️ I have read and understand the PCI DSS requirements  
☑️ I have implemented all applicable PCI DSS requirements  
☑️ I will maintain PCI DSS compliance as a condition of payment card acceptance  
☑️ I will notify my payment processor immediately if my environment changes  
☑️ I understand that failure to maintain compliance may result in fines and penalties  

### Part 2: Description of Environment

☑️ **Card-not-present e-commerce transactions only**  
☑️ **All payment processing outsourced to validated service provider (Airwallex)**  
☑️ **No cardholder data stored, processed, or transmitted by merchant systems**  
☑️ **Hosted payment page implementation only**  

### Part 3: Validation of Compliance

I confirm that:

☑️ All requirements in the attached SAQ have been completed  
☑️ All questions have been answered accurately and completely  
☑️ All applicable requirements are compliant  
☑️ This assessment covers all locations and business processes  

### Part 4: Action Plan

**No action plan required** - All requirements are currently compliant.

### Part 5: Signature

By signing below, I confirm that:
- This assessment is complete and accurate
- All PCI DSS requirements applicable to SAQ A are implemented
- I will maintain compliance and conduct annual assessments
- I will notify relevant parties of any changes affecting compliance

**Signature**: _________________________  
**Print Name**: [To be filled]  
**Title**: Technical Lead / Authorized Representative  
**Date**: January 2025  

**Company Official Signature**: _________________________  
**Print Name**: [To be filled]  
**Title**: [To be filled]  
**Date**: January 2025  

---

## Appendices

### Appendix A: Supporting Documentation
- PCI DSS Compliance Analysis Report
- SAQ A Questionnaire (Completed)
- Airwallex PCI DSS Validation Certificate
- Security Implementation Documentation

### Appendix B: Contact Information
**For questions regarding this AOC**:  
Technical Team  
Email: [To be filled]  
Phone: [To be filled]  

---

**Document Control**:  
**Version**: 1.0  
**Classification**: Confidential  
**Valid Until**: January 31, 2026  
**Next Assessment Due**: January 2026  
**Distribution**: Payment Processor, Internal Records  

---

*This Attestation of Compliance (AOC) is valid for one year from the assessment date and must be renewed annually to maintain PCI DSS compliance.*