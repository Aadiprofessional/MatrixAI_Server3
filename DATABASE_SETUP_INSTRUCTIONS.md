# Database Setup Instructions for Content Writer API Fix

## Overview
This document provides instructions to fix the content writer API timestamp issue by creating the necessary database tables with proper timestamp columns.

## Database Changes Required

### 1. Create user_content Table
Run the following SQL script in your Supabase database:

```sql
-- Execute: create_user_content_table.sql
```

This script will:
- Create the `user_content` table with all required columns
- Add `created_at` and `updated_at` timestamp columns with automatic defaults
- Create indexes for better performance
- Set up triggers to automatically update `updated_at` on row modifications

### 2. Create shared_content Table
Run the following SQL script in your Supabase database:

```sql
-- Execute: create_shared_content_table.sql
```

This script will:
- Create the `shared_content` table for content sharing functionality
- Add proper timestamp handling with `created_at`, `updated_at`, and `expires_at`
- Create indexes and triggers for automatic timestamp management

## Code Changes Made

### contentRoutes.js Updates
1. **saveContent endpoint**: 
   - Removed manual `created_at` setting
   - Added database fetch to return actual timestamps
   - Now returns both `createdAt` and `updatedAt` in response

2. **getUserContent endpoint**:
   - Updated to select and return `updated_at` field
   - All content history now includes timestamp information

3. **getContent endpoint**:
   - Updated to include `updated_at` in response

4. **shareContent endpoint**:
   - Removed manual `created_at` setting
   - Let database handle timestamp automatically

## Testing the API

### 1. Test Content Creation
```bash
curl -X POST http://localhost:3000/api/content/saveContent \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test-user",
    "prompt": "Test prompt",
    "content": "Test content",
    "title": "Test Title",
    "tags": ["test"],
    "content_type": "article",
    "tone": "professional",
    "language": "en"
  }'
```

Expected response should include both `createdAt` and `updatedAt` timestamps.

### 2. Test Content History
```bash
curl -X GET "http://localhost:3000/api/content/getUserContent?uid=test-user"
```

Expected response should include `updatedAt` field for all content items.

### 3. Test Individual Content Retrieval
```bash
curl -X GET "http://localhost:3000/api/content/getContent?contentId=<content-id>&uid=test-user"
```

Expected response should include both `createdAt` and `updatedAt` timestamps.

## Verification Steps

1. **Database Tables**: Verify both tables exist with proper schema
2. **Timestamps**: Confirm all API responses include timestamp fields
3. **Automatic Updates**: Test that `updated_at` changes when content is modified
4. **History**: Verify content history includes time information

## Rollback Instructions

If you need to rollback these changes:

1. Drop the tables:
```sql
DROP TABLE IF EXISTS shared_content;
DROP TABLE IF EXISTS user_content;
```

2. Revert the contentRoutes.js file to its previous version

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
- Database triggers automatically manage `updated_at` timestamps
- Indexes are created for optimal query performance
- The API now properly returns timestamp information in all responses