#!/bin/bash

# Amiyo-Go Installation Script
# This script automates the setup process

echo "🚀 Amiyo-Go Installation Script"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check MongoDB
if ! command -v mongosh &> /dev/null && ! command -v mongo &> /dev/null; then
    echo "⚠️  MongoDB CLI not found. Make sure MongoDB is installed and running."
else
    echo "✅ MongoDB CLI detected"
fi

# Check Redis (optional)
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis not found (optional). Install Redis for better performance."
else
    echo "✅ Redis detected"
fi

echo ""
echo "📦 Installing Server Dependencies..."
cd Server
npm install
if [ $? -ne 0 ]; then
    echo "❌ Server dependency installation failed"
    exit 1
fi
echo "✅ Server dependencies installed"

echo ""
echo "📦 Installing Client Dependencies..."
cd ../Client
npm install
if [ $? -ne 0 ]; then
    echo "❌ Client dependency installation failed"
    exit 1
fi
echo "✅ Client dependencies installed"

echo ""
echo "⚙️  Setting up environment files..."
cd ../Server
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created Server/.env (please configure it)"
else
    echo "ℹ️  Server/.env already exists"
fi

cd ../Client
if [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo "✅ Created Client/.env.local (please configure it)"
    else
        echo "⚠️  Client/.env.example not found"
    fi
else
    echo "ℹ️  Client/.env.local already exists"
fi

echo ""
echo "✅ Installation Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Configure Server/.env with your MongoDB URI and Firebase credentials"
echo "2. Configure Client/.env.local with your Firebase client config"
echo "3. Optional: Install and configure Redis for caching"
echo "4. Run 'cd Server && npm run seed:all' to seed initial data"
echo "5. Run 'cd Server && npm run make:admin' to create admin user"
echo "6. Start development:"
echo "   - Terminal 1: cd Server && npm run dev"
echo "   - Terminal 2: cd Client && npm run dev"
echo ""
echo "📚 Documentation:"
echo "   - Setup Guide: SETUP_GUIDE.md"
echo "   - Performance: PERFORMANCE_IMPROVEMENTS.md"
echo "   - Summary: IMPLEMENTATION_SUMMARY.md"
echo ""
echo "🎉 Happy coding with Amiyo-Go!"
