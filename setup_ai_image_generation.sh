#!/bin/bash

echo "🚀 Setting up AI Image Generation Environment"
echo "============================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    echo "   On macOS: brew install python3"
    echo "   On Ubuntu: sudo apt-get install python3 python3-pip"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

echo "✅ pip3 found: $(pip3 --version)"

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
pip3 install -r python_requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed successfully"
else
    echo "❌ Failed to install Python dependencies"
    echo "   You may need to run: pip3 install --user -r python_requirements.txt"
    echo "   Or create a virtual environment first"
fi

# Check if Node.js dependencies are installed
echo ""
echo "📦 Checking Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  Node.js dependencies not found. Installing..."
    npm install
else
    echo "✅ Node.js dependencies found"
fi

# Set up database table
echo ""
echo "🗄️  Setting up database table..."
node execute_ai_images_table_setup.js

# Create temp directory if it doesn't exist
echo ""
echo "📁 Creating temporary directory..."
mkdir -p temp
echo "✅ Temporary directory created"

# Test Python installation with a simple script
echo ""
echo "🧪 Testing Python environment..."
cat > test_python_env.py << 'EOF'
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import plotly.graph_objects as go
from PIL import Image
import pandas as pd

print("✅ All required Python packages are available")

# Test creating a simple plot
plt.figure(figsize=(8, 6))
x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.title('Test Plot')
plt.xlabel('X axis')
plt.ylabel('Y axis')
plt.savefig('test_output.png', dpi=150, bbox_inches='tight')
plt.close()

print("✅ Test image generated successfully")
EOF

python3 test_python_env.py

if [ $? -eq 0 ]; then
    echo "✅ Python environment test passed"
    # Clean up test files
    rm -f test_python_env.py test_output.png
else
    echo "❌ Python environment test failed"
    echo "   Please check the error messages above"
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Make sure your .env file has the correct Supabase credentials"
echo "   2. Start your server: npm start"
echo "   3. Test the API: node test_ai_image_generation.js"
echo ""
echo "🔗 API Endpoint: /api/ai-image/generateImageFromDescription"
echo "📖 Example usage:"
echo '   POST /api/ai-image/generateImageFromDescription'
echo '   Body: {'
echo '     "uid": "your-user-id",'
echo '     "description": "Create a bar chart showing sales data",'
echo '     "coinCost": 50'
echo '   }'