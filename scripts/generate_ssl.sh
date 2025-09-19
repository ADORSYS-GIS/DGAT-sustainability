#!/bin/bash

# Script to generate a self-signed SSL certificate for Nginx using a SERVER_DN from the SERVER_DN environment variable.
# Outputs:
#   /etc/nginx/ssl/nginx.crt
#   /etc/nginx/ssl/nginx.key

set -e

CERT_DIR="../ssl"
CERT_FILE="$CERT_DIR/nginx.crt"
KEY_FILE="$CERT_DIR/nginx.key"

# Try to load SERVER_DN from .env at project root if not set
if [ -z "$SERVER_DN" ]; then
  ENV_FILE="$(dirname "$0")/../.env"
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    export $(grep -E '^SERVER_DN=' "$ENV_FILE" | xargs)
  fi
fi

# Check if SERVER_DN is set after attempting to load from .env
if [ -z "$SERVER_DN" ]; then
  echo "Error: SERVER_DN environment variable is not set and could not be loaded from .env."
  exit 1
fi

# Create the directory if it doesn't exist
if [ ! -d "$CERT_DIR" ]; then
  mkdir -p "$CERT_DIR"
fi

# Only generate if files do not exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo "Certificate and key already exist. Skipping generation."
  exit 0
fi

echo "Generating self-signed certificate for SERVER_DN: $SERVER_DN"

sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/CN=$SERVER_DN" \
  -addext "subjectAltName=DNS:$SERVER_DN"

# Set permissions: readable by nginx, not world-writable
sudo chmod 644 "$CERT_FILE"
sudo chmod 600 "$KEY_FILE"
sudo chown root:root "$CERT_FILE" "$KEY_FILE"

# Validate PEM format to avoid Nginx errors
if ! grep -q "BEGIN CERTIFICATE" "$CERT_FILE"; then
  echo "Error: Certificate file is not in PEM format or is corrupted."
  exit 2
fi

if ! grep -q "BEGIN PRIVATE KEY" "$KEY_FILE"; then
  echo "Error: Key file is not in PEM format or is corrupted."
  exit 2
fi

echo "Self-signed certificate and key generated at:"
echo "  $CERT_FILE"
echo "  $KEY_FILE"