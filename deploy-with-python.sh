#!/bin/bash

# Deploy script for Alibaba Cloud Function Compute with Python dependencies
# This script ensures Python dependencies are available in the deployment environment

echo "🚀 Starting deployment with Python dependencies..."

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command -v s &> /dev/null; then
    echo "❌ Serverless Devs CLI (s) is not installed"
    echo "Please install it first: npm install -g @serverless-devs/s"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed"
    exit 1
fi

if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed"
    exit 1
fi

echo "✅ All prerequisites are available"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Run pre-deploy script to install Python dependencies
echo "🐍 Running pre-deploy script..."
./pre-deploy.sh

# Deploy to Alibaba Cloud Function Compute
echo "🚀 Deploying to Alibaba Cloud Function Compute..."
s deploy

echo "✅ Deployment completed!"
echo "🔗 Your API should now be available with Python dependencies"
echo "🧪 Test your API endpoints to verify Python modules are working"

# Clean up local python_modules (optional)
echo "🧹 Cleaning up local python_modules..."
rm -rf python_modules