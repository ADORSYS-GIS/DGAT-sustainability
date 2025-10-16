#!/bin/bash

# Check if SERVER_ADDRESS is set
if [ -z "$SERVER_ADDRESS" ]; then
  echo "Error: SERVER_ADDRESS environment variable is not set."
  exit 1
fi

# Check if EMAIL is set
if [ -z "$EMAIL" ]; then
  echo "Error: EMAIL environment variable is not set."
  exit 1
fi

# Create necessary directories
mkdir -p certbot/conf certbot/www

# Request or renew SSL certificates
docker run --rm -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" --agree-tos --no-eff-email \
  -d "$SERVER_ADDRESS" || { echo "Error: Failed to obtain SSL certificates."; exit 1; }

echo "SSL certificates obtained successfully."

# Set permissions
chmod -R 755 certbot