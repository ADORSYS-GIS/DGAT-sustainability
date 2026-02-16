#!/bin/bash

# Configuration
REPO="ghcr.io/adorsys-gis/dgat-sustainability"
TAG="latest"

echo "🚀 Building and pushing images to $REPO..."

# Build images locally
docker compose build

# Push Backend/Migrate (uses the same image)
echo "📦 Pushing Backend..."
docker push $REPO/backend:$TAG

# Push Frontend
echo "📦 Pushing Frontend..."
docker push $REPO/frontend:$TAG

echo "✅ Done! images are now in GHCR."
echo "On your EC2 instance, run:"
echo "docker compose pull && docker compose up -d"
