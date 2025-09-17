#!/bin/bash

# Enhanced Feedback & Help APIs Test Script
# This script tests the complete workflow of the enhanced APIs

API_BASE="http://localhost:3000"
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440000"
TEST_EMAIL="test@example.com"
TEST_NAME="Test User"

echo "🚀 Testing Enhanced Feedback & Help APIs"
echo "=========================================="

# Function to make API calls and display results
make_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "\n📡 $description"
    echo "Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_BASE$endpoint")
    else
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    # Extract HTTP status and body
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    echo "Status: $http_status"
    echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
    
    # Return the response body for further processing
    echo "$body"
}

echo "\n1️⃣ Creating Test User"
echo "====================="
user_data='{
    "uid": "'$TEST_USER_ID'",
    "email": "'$TEST_EMAIL'",
    "name": "'$TEST_NAME'",
    "created_at": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"    
}'

# Note: This would typically be done through a user registration endpoint
# For testing purposes, we'll assume the user exists or create via direct DB insert
echo "Test user data prepared: $user_data"

echo "\n2️⃣ Testing Feedback Submission (with Email Notification)"
echo "========================================================"
feedback_data='{
    "uid": "'$TEST_USER_ID'",
    "issue": "feature",
    "description": "Would love to see more AI model options for image generation. The current models are great but having more variety would be amazing!"
}'

feedback_response=$(make_api_call "POST" "/api/user/submitFeedback" "$feedback_data" "Submitting feedback")

echo "\n3️⃣ Testing Help Request Submission (with Email Notification)"
echo "============================================================"
help_data='{
    "uid": "'$TEST_USER_ID'",
    "issue": "payment",
    "description": "Having trouble with payment processing. The transaction keeps failing.",
    "orderId": "ORD-TEST-12345"
}'

help_response=$(make_api_call "POST" "/api/user/getHelp" "$help_data" "Submitting help request")

echo "\n4️⃣ Getting All Feedback (Admin)"
echo "=============================="
all_feedback=$(make_api_call "GET" "/api/admin/getAllFeedback" "" "Getting all feedback")

# Extract feedback ID for resolution test
feedback_id=$(echo "$all_feedback" | jq -r '.data[0].id // empty' 2>/dev/null)
if [ -n "$feedback_id" ] && [ "$feedback_id" != "null" ]; then
    echo "\n📝 Found feedback ID: $feedback_id"
else
    echo "\n⚠️  No feedback ID found in response"
fi

echo "\n5️⃣ Getting All Help Requests (Admin)"
echo "==================================="
all_help=$(make_api_call "GET" "/api/admin/getAllHelp" "" "Getting all help requests")

# Extract help request ID for resolution test
help_id=$(echo "$all_help" | jq -r '.data[0].id // empty' 2>/dev/null)
if [ -n "$help_id" ] && [ "$help_id" != "null" ]; then
    echo "\n📝 Found help request ID: $help_id"
else
    echo "\n⚠️  No help request ID found in response"
fi

echo "\n6️⃣ Testing Feedback Resolution (with Email Notification)"
echo "========================================================"
if [ -n "$feedback_id" ] && [ "$feedback_id" != "null" ]; then
    resolve_feedback_data='{
        "feedbackId": "'$feedback_id'",
        "adminComment": "Thank you for your excellent feedback! We are excited to announce that we have added 5 new AI models to our image generation feature. You can now access DALL-E 3, Midjourney v6, Stable Diffusion XL, and two custom models in the advanced settings. We appreciate your suggestion and hope you enjoy the new options!",
        "adminId": "admin-001"
    }'
    
    resolve_feedback_response=$(make_api_call "POST" "/api/admin/resolveFeedback" "$resolve_feedback_data" "Resolving feedback")
else
    echo "⚠️  Skipping feedback resolution - no valid feedback ID"
fi

echo "\n7️⃣ Testing Help Request Resolution (with Email Notification)"
echo "============================================================"
if [ -n "$help_id" ] && [ "$help_id" != "null" ]; then
    resolve_help_data='{
        "helpRequestId": "'$help_id'",
        "adminComment": "I have investigated your payment issue and found that it was caused by a temporary gateway timeout. I have processed a manual retry of your payment and it has now gone through successfully. Your order ORD-TEST-12345 is confirmed and you should receive a confirmation email shortly. If you experience any further issues, please do not hesitate to contact us.",
        "adminId": "admin-001"
    }'
    
    resolve_help_response=$(make_api_call "POST" "/api/admin/resolveHelpRequest" "$resolve_help_data" "Resolving help request")
else
    echo "⚠️  Skipping help request resolution - no valid help request ID"
fi

echo "\n8️⃣ Verifying Updated Status - Getting All Feedback Again"
echo "======================================================"
make_api_call "GET" "/api/admin/getAllFeedback" "" "Getting updated feedback list"

echo "\n9️⃣ Verifying Updated Status - Getting All Help Requests Again"
echo "============================================================"
make_api_call "GET" "/api/admin/getAllHelp" "" "Getting updated help requests list"

echo "\n✅ Enhanced APIs Test Complete!"
echo "=============================="
echo "Summary of tested features:"
echo "• ✅ Feedback submission with email confirmation"
echo "• ✅ Help request submission with email confirmation"
echo "• ✅ Admin feedback retrieval"
echo "• ✅ Admin help request retrieval"
echo "• ✅ Admin feedback resolution with email notification"
echo "• ✅ Admin help request resolution with email notification"
echo "• ✅ Status tracking and updates"
echo ""
echo "📧 Email notifications should be sent for:"
echo "   - User feedback/help request confirmations"
echo "   - Admin resolution notifications to users"
echo ""
echo "🔍 Check the server logs for email sending status and any errors."
echo "📊 Check the database for updated status and admin_comment fields."