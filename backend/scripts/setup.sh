#!/bin/bash

# QR Inventory System - Backend Setup Script

set -e

echo "🚀 QR Inventory System - Backend Setup"
echo "======================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.12 or higher."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip."
    exit 1
fi

echo "✅ pip found"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your configuration!"
else
    echo "✅ .env file already exists"
fi

# Create upload directory
echo "📁 Creating upload directory..."
mkdir -p uploads

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the .env file with your database credentials"
echo "2. Ensure PostgreSQL is running"
echo "3. Run the application:"
echo "   - Development: uvicorn src.main:app --reload"
echo "   - Production: uvicorn src.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "Or use Docker:"
echo "   docker-compose up -d"
echo ""
echo "📚 API Documentation will be available at:"
echo "   http://localhost:8000/api/docs"
echo ""