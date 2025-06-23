#!/bin/bash
echo "🏗️ Building DGRV Digital Tools..."

# Build backend services
echo "🦀 Building Rust services..."
cd backend/dgat-service && cargo build --release && cd ../..
cd backend/sustainability-service && cargo build --release && cd ../..
cd backend/sync-service && cargo build --release && cd ../..
cd backend/user-service && cargo build --release && cd ../..

# Build frontend applications
echo "⚛️ Building frontend applications..."
cd frontend/user-pwa && npm run build && cd ../..
cd frontend/admin-frontend && npm run build && cd ../..

echo "✅ Build complete!"
