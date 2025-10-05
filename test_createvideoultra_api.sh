#!/bin/bash

# Test script for createVideoUltra API endpoint
# This script tests the new createVideoUltra endpoint that uses Doubao API

echo "Testing createVideoUltra API endpoint..."
echo "========================================"

# Configuration
BASE_URL="http://localhost:3000"  # Change to your server URL
# BASE_URL="https://your-production-domain.com"  # Uncomment for production

# Test parameters
USER_ID="your-user-id-here"  # Replace with actual user ID
PROMPT_TEXT="A beautiful sunset over the ocean with gentle waves"
IMAGE_URL="https://example.com/your-image.jpg"  # Replace with actual image URL

echo ""
echo "1. Testing GET endpoint (should return endpoint info)..."
curl -X GET "${BASE_URL}/api/video/createVideoUltra" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "2. Testing POST endpoint with image URL..."
curl -X POST "${BASE_URL}/api/video/createVideoUltra" \
  -H "Content-Type: application/json" \
  -d "{
    \"uid\": \"${USER_ID}\",
    \"promptText\": \"${PROMPT_TEXT}\",
    \"imageUrl\": \"${IMAGE_URL}\"
  }" | jq '.'

echo ""
echo "Test completed!"
echo ""
echo "Expected response format:"
echo "{"
echo "  \"message\": \"Video generation started\","
echo "  \"videoId\": \"uuid-string\","
echo "  \"status\": \"processing\","
echo "  \"taskId\": \"task-id-string\""
echo "}"
echo ""
echo "API Details:"
echo "- Fixed resolution: 720p (1280x720)"
echo "- Fixed duration: 5 seconds"
echo "- Coin cost: 5 coins"
echo "- API provider: Doubao"
echo ""
echo "Note: Replace USER_ID and IMAGE_URL with actual values before running this script."