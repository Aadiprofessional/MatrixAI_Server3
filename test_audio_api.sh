#!/bin/bash

# Test script for Audio API endpoint

# Set the deployment URL
BASE_URL="https://main-matrixai-server-lujmidrakh.cn-hangzhou.fcapp.run"
TEST_UID="0a147ebe-af99-481b-bcaf-ae70c9aeb8d8"
AUDIO_URL="https://ddtgdhehxhgarkonvpfq.supabase.co/storage/v1/object/public/user-uploads/users/0a147ebe-af99-481b-bcaf-ae70c9aeb8d8/audioFile/audio_1751637155411_souynlw0j.mp3"

echo "🧪 Testing MatrixAI Audio API"
echo "============================="

# Test 1: Health Check
echo "\n📋 Test 1: Health Check"
echo "URL: $BASE_URL/health"
curl -s "$BASE_URL/health" | jq .
echo "\n"

# Test 2: Debug Environment
echo "\n📋 Test 2: Debug Environment (Check API Keys)"
echo "URL: $BASE_URL/debug/env"
curl -s "$BASE_URL/debug/env" | jq .
echo "\n"

# Test 3: Upload Audio URL
echo "\n📋 Test 3: Upload Audio URL for Transcription"
echo "URL: $BASE_URL/api/audio/uploadAudioUrl"
echo "UID: $TEST_UID"
echo "Audio URL: $AUDIO_URL"

RESPONSE=$(curl -s -X POST "$BASE_URL/api/audio/uploadAudioUrl" \
  -H "Content-Type: application/json" \
  -d "{
    \"uid\": \"$TEST_UID\",
    \"audioUrl\": \"$AUDIO_URL\",
    \"audio_name\": \"test_audio\",
    \"language\": \"en-GB\"
  }")

echo "Response:"
echo "$RESPONSE" | jq .

# Extract audioid from response if successful
AUDIOID=$(echo "$RESPONSE" | jq -r '.audioid // empty')

if [ ! -z "$AUDIOID" ] && [ "$AUDIOID" != "null" ]; then
    echo "\n📋 Test 4: Check Audio Status"
    echo "AudioID: $AUDIOID"
    
    # Wait a bit for processing
    echo "Waiting 5 seconds for processing..."
    sleep 5
    
    curl -s -X POST "$BASE_URL/api/audio/getAudioStatus" \
      -H "Content-Type: application/json" \
      -d "{
        \"uid\": \"$TEST_UID\",
        \"audioid\": \"$AUDIOID\"
      }" | jq .
else
    echo "\n❌ Failed to get audioid from upload response"
fi

echo "\n🏁 Test completed!"