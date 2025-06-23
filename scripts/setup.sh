#!/bin/bash
echo "🔧 Setting up DGRV Digital Tools development environment..."

# Install Rust
if ! command -v cargo &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    source ~/.cargo/env
fi

# Install Node.js dependencies
echo "📦 Installing frontend dependencies..."
cd frontend/user-pwa && npm install && cd ../..
cd frontend/admin-frontend && npm install && cd ../..

echo "✅ Development environment setup complete!"
echo "🚀 Run 'docker-compose up' to start local services"
