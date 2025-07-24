#!/bin/bash

# This script generates self-signed SSL certificates for use with Nginx

# Create SSL directory if it doesn't exist
mkdir -p ./ssl

# Generate self-signed certificate valid for 365 days
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./ssl/nginx.key \
  -out ./ssl/nginx.crt \
  -subj "/CN=${1:-localhost}" \
  -addext "subjectAltName=DNS:${1:-localhost},IP:127.0.0.1${2:+,IP:$2}" \
  -addext "keyUsage=digitalSignature" \
  -addext "extendedKeyUsage=serverAuth"

echo "Self-signed SSL certificate generated successfully!"
echo "Certificate Details:"
openssl x509 -in ./ssl/nginx.crt -text -noout | grep -E 'Subject:|Issuer:|Validity|DNS:|IP Address:'

echo "\nIMPORTANT: Since this is a self-signed certificate, browsers will show a security warning."
echo "This is normal for development/testing environments."
