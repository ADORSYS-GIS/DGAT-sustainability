#!/bin/bash
#!/bin/bash

# Create directory for certificates if it doesn't exist
mkdir -p /etc/nginx/ssl

# Generate a self-signed certificate valid for 365 days
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx.key \
  -out /etc/nginx/ssl/nginx.crt \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Set appropriate permissions
chmod 600 /etc/nginx/ssl/nginx.key
chmod 644 /etc/nginx/ssl/nginx.crt

echo "Self-signed certificate generated successfully"
# Create directory for certificates if it doesn't exist
mkdir -p /etc/nginx/ssl

# Generate a self-signed certificate valid for 365 days
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx.key \
  -out /etc/nginx/ssl/nginx.crt \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:13.49.74.167,IP:127.0.0.1"

# Set appropriate permissions
chmod 600 /etc/nginx/ssl/nginx.key
chmod 644 /etc/nginx/ssl/nginx.crt

echo "Self-signed certificate generated successfully"
