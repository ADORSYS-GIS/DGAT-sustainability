# HTTPS Setup with Self-Signed Certificate

## Overview

This project includes a secure HTTPS setup using self-signed certificates for development and testing. The setup includes:

1. Self-signed SSL certificates for `ec2-16-171-203-85.eu-north-1.compute.amazonaws.com`
2. HTTPS configuration for the Nginx frontend
3. Proxying of backend APIs and Keycloak authentication through the frontend

## How It Works

### Certificate Generation

When the frontend container starts, it automatically generates self-signed SSL certificates for `localhost` and `16.171.203.85` using OpenSSL. These certificates are stored in a Docker volume for persistence.

### Nginx Configuration

The Nginx server is configured to:

1. Redirect all HTTP traffic to HTTPS (except for health checks)
2. Serve the frontend application on `/`
3. Proxy API requests to the backend at `/api`
4. Proxy authentication requests to Keycloak at `/keycloak`

### URL Structure

- Frontend UI: `https://ec2-16-171-203-85.eu-north-1.compute.amazonaws.com/`
- Backend API: `https://ec2-16-171-203-85.eu-north-1.compute.amazonaws.com/api/`
- Keycloak: `https://ec2-16-171-203-85.eu-north-1.compute.amazonaws.com/keycloak/`

## Browser Security Warning

Since the certificate is self-signed, your browser will show a security warning when accessing the site. This is normal and expected for development. You can:

1. Click "Advanced" and then "Proceed to ec2-16-171-203-85.eu-north-1.compute.amazonaws.com (unsafe)"
2. Add a security exception for this certificate

## For Production Use

For production deployment with a real domain, you would want to:

1. Replace the self-signed certificate with a proper Let's Encrypt certificate
2. Update the Nginx configuration to use your domain name instead of the EC2 domain
3. Configure proper certificate renewal

## Troubleshooting

### Certificate Issues

If you encounter certificate issues, you can recreate the certificates by: