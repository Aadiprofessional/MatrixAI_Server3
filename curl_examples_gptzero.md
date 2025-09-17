# GPTZero Detection API - cURL Examples

This document provides comprehensive cURL command examples for testing the updated GPTZero Detection API with the new database structure.

## Prerequisites

1. **Database Setup**: Run the database setup script first:
   ```bash
   node execute_gptzero_table_setup.js
   ```

2. **Server Running**: Make sure your server is running on `http://localhost:3000`

3. **Valid UID**: Replace the example UID with a valid user ID from your database

## API Endpoints

### 1. Create Detection

Creates a new AI detection using GPTZero API and stores the complete response in the database.

```bash
curl --request POST \
  --url 'http://localhost:3000/api/detection/createDetection' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "uid": "123e4567-e89b-12d3-a456-426614174000",
    "text": "Located in East Africa, Uganda is a landlocked nation known for its stunning natural beauty, diverse wildlife, and rich cultural heritage.",
    "title": "GPTZero Test Detection",
    "tags": ["test", "gptzero", "api"],
    "language": "en"
  }'
```

**Expected Response Fields:**
- `scan_id`: GPTZero scan identifier
- `version`: GPTZero API version
- `neat_version`: GPTZero model version
- `predicted_class`: "ai", "human", or "mixed"
- `confidence_score`: Confidence level (0-1)
- `confidence_category`: "high", "medium", or "low"
- `completely_generated_prob`: Probability text is completely AI-generated
- `average_generated_prob`: Average generation probability
- `overall_burstiness`: Text burstiness score
- `result_message`: Human-readable result
- `document_classification`: Document type classification
- `class_probabilities`: Detailed probability breakdown
- `sentences`: Sentence-level analysis
- `paragraphs`: Paragraph-level analysis
- `subclass`: AI subclass analysis
- `full_response`: Complete GPTZero API response

### 2. Get Specific Detection

Retrieves a specific detection by ID with all GPTZero data.

```bash
curl --request GET \
  --url 'http://localhost:3000/api/detection/getDetection?uid=123e4567-e89b-12d3-a456-426614174000&detectionId=DETECTION_ID_HERE' \
  --header 'Accept: application/json'
```

### 3. Get User Detection History

Retrieves paginated list of user's detections with GPTZero summary data.

```bash
curl --request GET \
  --url 'http://localhost:3000/api/detection/getUserDetections?uid=123e4567-e89b-12d3-a456-426614174000&page=1&itemsPerPage=10' \
  --header 'Accept: application/json'
```

**With Search Query:**
```bash
curl --request GET \
  --url 'http://localhost:3000/api/detection/getUserDetections?uid=123e4567-e89b-12d3-a456-426614174000&page=1&itemsPerPage=10&searchQuery=test' \
  --header 'Accept: application/json'
```

### 4. Delete Detection

Removes a detection from the database.

```bash
curl --request DELETE \
  --url 'http://localhost:3000/api/detection/deleteDetection' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "uid": "123e4567-e89b-12d3-a456-426614174000",
    "detectionId": "DETECTION_ID_HERE"
  }'
```

## Test Scenarios

### Scenario 1: AI-Generated Text
```bash
curl --request POST \
  --url 'http://localhost:3000/api/detection/createDetection' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "uid": "123e4567-e89b-12d3-a456-426614174000",
    "text": "Artificial intelligence has revolutionized numerous industries by providing innovative solutions to complex problems. Machine learning algorithms can process vast amounts of data to identify patterns and make predictions with remarkable accuracy.",
    "title": "AI Text Test",
    "tags": ["ai-generated", "test"],
    "language": "en"
  }'
```

### Scenario 2: Human-Written Text
```bash
curl --request POST \
  --url 'http://localhost:3000/api/detection/createDetection' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "uid": "123e4567-e89b-12d3-a456-426614174000",
    "text": "Yesterday I went to the grocery store and bumped into my old friend Sarah. We chatted for about 20 minutes near the produce section, catching up on life and reminiscing about our college days.",
    "title": "Human Text Test",
    "tags": ["human-written", "test"],
    "language": "en"
  }'
```

### Scenario 3: Long Text (Near Limit)
```bash
curl --request POST \
  --url 'http://localhost:3000/api/detection/createDetection' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "uid": "123e4567-e89b-12d3-a456-426614174000",
    "text": "The rapid advancement of technology in the 21st century has fundamentally transformed how we communicate, work, and live our daily lives. From the emergence of smartphones that put the power of the internet in our pockets to the development of artificial intelligence systems that can process and analyze vast amounts of data in seconds, we are witnessing an unprecedented era of innovation. Social media platforms have connected billions of people across the globe, creating virtual communities that transcend geographical boundaries and cultural differences. Meanwhile, cloud computing has revolutionized how businesses store and access their data, enabling remote work capabilities that became essential during the global pandemic. The integration of Internet of Things devices in our homes has created smart environments that can anticipate our needs and automate routine tasks, from adjusting temperature settings to ordering groceries when supplies run low. As we look toward the future, emerging technologies like quantum computing, blockchain, and augmented reality promise to bring even more dramatic changes to our world, potentially solving complex problems in fields ranging from medicine and climate science to finance and education.",
    "title": "Long Text Analysis",
    "tags": ["long-text", "technology", "test"],
    "language": "en"
  }'
```

## Error Handling Examples

### Invalid UID Format
```bash
curl --request POST \
  --url 'http://localhost:3000/api/detection/createDetection' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "uid": "invalid-uid",
    "text": "Test text",
    "title": "Error Test"
  }'
```

### Text Too Long (Over 2000 words)
```bash
curl --request POST \
  --url 'http://localhost:3000/api/detection/createDetection' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "uid": "123e4567-e89b-12d3-a456-426614174000",
    "text": "' $(printf 'word %.0s' {1..2001}) '",
    "title": "Too Long Test"
  }'
```

## Response Examples

### Successful Detection Response
```json
{
  "message": "Detection created successfully",
  "detection": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "GPTZero Test Detection",
    "text": "Located in East Africa, Uganda is a landlocked nation...",
    "tags": ["test", "gptzero", "api"],
    "language": "en",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "scan_id": "4d19321f-464a-4842-8757-5fff09801c21",
    "version": "2025-09-04-base",
    "neat_version": "3.9b",
    "predicted_class": "ai",
    "confidence_score": 0.9999919042523925,
    "confidence_category": "high",
    "completely_generated_prob": 0.9991552489355678,
    "average_generated_prob": 1,
    "overall_burstiness": 0,
    "result_message": "Our detector is highly confident that the text is written by AI.",
    "document_classification": "AI_ONLY",
    "is_human": false,
    "fake_percentage": 100,
    "ai_words": 23,
    "text_words": 23,
    "class_probabilities": {
      "human": 0,
      "ai": 0.9999919042523925,
      "mixed": 0.000008095747607633459
    },
    "sentences": [
      {
        "generated_prob": 0.9999926031685085,
        "sentence": "Located in East Africa, Uganda is a landlocked nation known for its stunning natural beauty, diverse wildlife, and rich cultural heritage.",
        "highlight_sentence_for_ai": true
      }
    ],
    "provider": "gptzero"
  }
}
```

## Notes

1. **API Key**: The GPTZero API key is configured in the server environment variables
2. **Rate Limits**: Be mindful of GPTZero API rate limits when testing
3. **Coin Deduction**: Each detection costs 40 coins from the user's account
4. **Word Limit**: Maximum 2000 words per detection request
5. **Database**: All GPTZero response data is stored in the new table structure for comprehensive analysis

## Troubleshooting

- **500 Error**: Usually indicates the new table structure hasn't been created. Run the setup script.
- **400 Error**: Check request format and ensure all required fields are provided.
- **404 Error**: Verify the detection ID exists and belongs to the specified user.
- **API Key Error**: Ensure GPTZero API key is properly configured in environment variables.