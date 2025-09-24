# AI Image Generation API

This API allows users to generate images, charts, graphs, and visualizations by providing a simple text description. The system uses Qwen-max AI to generate Python code, executes it to create the image, and stores it in Supabase storage.

## 🚀 Features

- **AI-Powered Code Generation**: Uses Qwen-max to generate Python code from text descriptions
- **Automatic Execution**: Runs the generated Python code to create images
- **Multiple Visualization Types**: Supports charts, graphs, plots, and custom images
- **Cloud Storage**: Automatically uploads images to Supabase storage
- **User Management**: Tracks images per user with coin-based billing
- **Error Handling**: Comprehensive error handling and validation

## 📋 Prerequisites

### System Requirements
- Node.js (v14 or higher)
- Python 3.7 or higher
- pip3 (Python package manager)

### Environment Variables
Make sure your `.env` file contains:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ Setup

### 1. Quick Setup (Recommended)
Run the automated setup script:
```bash
./setup_ai_image_generation.sh
```

### 2. Manual Setup

#### Install Python Dependencies
```bash
pip3 install -r python_requirements.txt
```

#### Install Node.js Dependencies
```bash
npm install
```

#### Set Up Database Table
```bash
node execute_ai_images_table_setup.js
```

#### Create Temp Directory
```bash
mkdir -p temp
```

## 📡 API Endpoints

### 1. Generate Image from Description

**Endpoint:** `POST /api/ai-image/generateImageFromDescription`

**Request Body:**
```json
{
  "uid": "user-123",
  "description": "Create a bar chart showing sales data for 5 products with values 100, 150, 200, 120, 180",
  "coinCost": 50
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Image generated successfully",
  "imageUrl": "https://your-supabase-url/storage/v1/object/public/user-uploads/users/user-123/ai-generated-images/ai_generated_uuid.png",
  "imageId": "uuid-here",
  "description": "Create a bar chart...",
  "coinsDeducted": 50
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### 2. Get User's AI Generated Images

**Endpoint:** `GET /api/ai-image/getUserAIImages`

**Query Parameters:**
- `uid` (required): User ID

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid-here",
      "uid": "user-123",
      "description": "Create a bar chart...",
      "image_url": "https://...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 🎨 Supported Image Types

The API can generate various types of visualizations:

### Charts and Graphs
- Bar charts
- Line graphs
- Pie charts
- Scatter plots
- Histograms
- Box plots
- Heatmaps

### Custom Visualizations
- Scientific plots
- Statistical distributions
- Mathematical functions
- Data visualizations
- Custom graphics using PIL

### Example Descriptions
```
"Create a bar chart showing monthly sales data"
"Generate a pie chart with market share percentages"
"Make a line graph showing temperature over time"
"Create a scatter plot showing correlation between variables"
"Generate a histogram of student grades"
"Make a heatmap showing correlation matrix"
```

## 🧪 Testing

### Run Automated Tests
```bash
node test_ai_image_generation.js
```

### Manual Testing
1. Start your server:
   ```bash
   npm start
   ```

2. Send a POST request to the API:
   ```bash
   curl -X POST http://localhost:3000/api/ai-image/generateImageFromDescription \
     -H "Content-Type: application/json" \
     -d '{
       "uid": "test-user",
       "description": "Create a simple bar chart with 3 bars",
       "coinCost": 50
     }'
   ```

## 🔧 Configuration

### Coin Costs
Default coin cost is 50 per image generation. You can modify this in the request body.

### Timeouts
- Python execution timeout: 30 seconds
- API request timeout: 60 seconds

### File Limits
- Description length: Maximum 1000 characters
- Generated image format: PNG
- Storage location: Supabase `user-uploads` bucket

## 🗄️ Database Schema

The API creates a table called `ai_generated_images`:

```sql
CREATE TABLE ai_generated_images (
    id UUID PRIMARY KEY,
    uid TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    python_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔒 Security Features

- Row Level Security (RLS) enabled
- Users can only access their own images
- Input validation and sanitization
- Secure Python code execution in isolated environment
- Automatic cleanup of temporary files

## 🚨 Error Handling

Common error scenarios:
- Invalid or missing parameters
- Insufficient coins
- Python execution failures
- Storage upload failures
- Database connection issues

All errors are logged and return appropriate HTTP status codes.

## 📊 Performance

- Average generation time: 5-15 seconds
- Concurrent request handling
- Automatic cleanup of temporary files
- Optimized image storage

## 🔍 Troubleshooting

### Python Environment Issues
```bash
# Check Python installation
python3 --version

# Check required packages
python3 -c "import matplotlib, seaborn, plotly, PIL; print('All packages available')"
```

### Database Issues
```bash
# Re-run database setup
node execute_ai_images_table_setup.js
```

### Storage Issues
- Verify Supabase credentials in `.env`
- Check storage bucket permissions
- Ensure `user-uploads` bucket exists

## 📝 Example Usage

```javascript
const axios = require('axios');

async function generateImage() {
  try {
    const response = await axios.post('http://localhost:3000/api/ai-image/generateImageFromDescription', {
      uid: 'user-123',
      description: 'Create a colorful pie chart showing browser market share',
      coinCost: 50
    });
    
    console.log('Image generated:', response.data.imageUrl);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

generateImage();
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the error logs
3. Test with the provided test script
4. Contact the development team