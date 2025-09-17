const express = require('express');
const app = express();

// Mock payment status response with metadata
const mockPaymentStatus = {
  success: true,
  data: {
    id: 'int_hkdm2p5vthakmytxgaz',
    status: 'SUCCEEDED',
    metadata: {
      uid: 'test-user-123',
      plan: 'addon',
      totalPrice: '138',
      orderId: 'test_order_123',
      paymentMethod: 'airwallex'
    },
    merchant_order_id: 'test_order_123'
  }
};

// Test metadata extraction logic
function testMetadataExtraction(paymentStatus, queryParams = {}) {
  let { uid, plan, totalPrice, orderId, paymentMethod } = queryParams;
  const merchantOrderId = paymentStatus.data ? paymentStatus.data.merchant_order_id : paymentStatus.merchant_order_id;
  
  // If subscription details are missing from query params, try to get them from payment metadata
  if ((!uid || !plan || !totalPrice) && paymentStatus.data && paymentStatus.data.metadata) {
    uid = uid || paymentStatus.data.metadata.uid;
    plan = plan || paymentStatus.data.metadata.plan;
    totalPrice = totalPrice || paymentStatus.data.metadata.totalPrice;
    orderId = orderId || paymentStatus.data.metadata.orderId;
    paymentMethod = paymentMethod || paymentStatus.data.metadata.paymentMethod;
  }
  
  const status = paymentStatus.data ? paymentStatus.data.status : paymentStatus.status;
  
  console.log('Extracted values:');
  console.log('- uid:', uid);
  console.log('- plan:', plan);
  console.log('- totalPrice:', totalPrice);
  console.log('- orderId:', orderId);
  console.log('- paymentMethod:', paymentMethod);
  console.log('- status:', status);
  console.log('- merchantOrderId:', merchantOrderId);
  
  return { uid, plan, totalPrice, orderId, paymentMethod, status, merchantOrderId };
}

console.log('Testing metadata extraction with mock payment status...');
const result = testMetadataExtraction(mockPaymentStatus);

if (result.uid && result.plan && result.totalPrice && result.status === 'SUCCEEDED') {
  console.log('\n✅ SUCCESS: All required metadata extracted successfully!');
  console.log('BuySubscription API would be called with:', {
    uid: result.uid,
    plan: result.plan,
    totalPrice: parseFloat(result.totalPrice),
    orderId: result.orderId,
    paymentMethod: result.paymentMethod
  });
} else {
  console.log('\n❌ FAILED: Missing required metadata or payment not succeeded');
  console.log('Missing:', {
    uid: !result.uid,
    plan: !result.plan,
    totalPrice: !result.totalPrice,
    succeeded: result.status !== 'SUCCEEDED'
  });
}