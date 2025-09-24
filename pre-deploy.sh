#!/bin/bash

# Pre-deploy script for Alibaba Cloud Function Compute
# This script installs Python dependencies before deployment

echo "🔧 Installing Python dependencies for deployment..."

# Create python_modules directory
mkdir -p python_modules

# Install Python dependencies to the python_modules directory
pip3 install -r python_requirements.txt -t python_modules/ --no-deps

echo "✅ Python dependencies installed successfully"
echo "📦 Dependencies installed in: python_modules/"

# List installed packages for verification
echo "📋 Installed packages:"
ls -la python_modules/