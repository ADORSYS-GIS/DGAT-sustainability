# HTTPS Setup with Self-Signed Certificate

## Overview

This project includes a secure HTTPS setup using self-signed certificates for local development and testing. The setup includes:

1. Self-signed SSL certificates for `localhost`
2. HTTPS configuration for the Nginx frontend
3. Proxying of backend APIs and Keycloak authentication through the frontend

## How It Works

### Certificate Generation

When the frontend container starts, it automatically generates self-signed SSL certificates for `localhost` using OpenSSL. These certificates are stored in a Docker volume for persistence.

### Nginx Configuration

The Nginx server is configured to:

1. Redirect all HTTP traffic to HTTPS (except for health checks)
2. Serve the frontend application on `/`
3. Proxy API requests to the backend at `/api`
4. Proxy authentication requests to Keycloak at `/auth`

### URL Structure

- Frontend UI: `https://localhost/`
- Backend API: `https://localhost/api/`
- Keycloak: `https://localhost/auth/`

## Browser Security Warning

Since the certificate is self-signed, your browser will show a security warning when accessing the site. This is normal and expected for local development. You can:

1. Click "Advanced" and then "Proceed to localhost (unsafe)"
2. Add a security exception for this certificate

## For Production Use

For production deployment with a real domain, you would want to:

1. Replace the self-signed certificate with a proper Let's Encrypt certificate
2. Update the Nginx configuration to use your domain name instead of `localhost`
3. Configure proper certificate renewal

## Troubleshooting

### Certificate Issues

If you encounter certificate issues, you can recreate the certificates by:

```bash
# Remove the SSL volume
docker-compose down
docker volume rm your-project-name_ssl-certs

# Restart the application
docker-compose up -d
```

### Service Connectivity

If services can't communicate with each other, ensure that:
# HTTPS Setup with Self-Signed Certificate

## Overview

This project includes a secure HTTPS setup using self-signed certificates for local development and testing. The setup includes:

1. Self-signed SSL certificates for `localhost`
2. HTTPS configuration for the Nginx frontend
3. Proxying of backend APIs and Keycloak authentication through the frontend

## How It Works

### Certificate Generation

When the frontend container starts, it automatically generates self-signed SSL certificates for `localhost` using OpenSSL. These certificates are generated within the container and do not persist between container rebuilds.

### Nginx Configuration

The Nginx server is configured to:

1. Redirect all HTTP traffic to HTTPS (except for health checks)
2. Serve the frontend application on `/`
3. Proxy API requests to the backend at `/api`
4. Proxy authentication requests to Keycloak at `/auth`

### URL Structure

- Frontend UI: `https://localhost/`
- Backend API: `https://localhost/api/`
- Keycloak: `https://localhost/auth/`

## Browser Security Warning

Since the certificate is self-signed, your browser will show a security warning when accessing the site. This is normal and expected for local development. You can:

1. Click "Advanced" and then "Proceed to localhost (unsafe)"
2. Add a security exception for this certificate

## For Production Use

For production deployment with a real domain, you would want to:

1. Replace the self-signed certificate with a proper Let's Encrypt certificate
2. Update the Nginx configuration to use your domain name instead of `localhost`
3. Configure proper certificate renewal

## Troubleshooting

### Certificate Issues

If you encounter certificate issues, you can fix them by:

```bash
# Rebuild the frontend container
docker-compose build frontend

# Restart the frontend service
docker-compose up -d frontend
```

### Service Connectivity

If services can't communicate with each other, ensure that:

1. All services are on the same Docker network
2. The Nginx proxy configuration is correctly forwarding requests
3. Internal service URLs are correctly configured
1. All services are on the same Docker network
2. The Nginx proxy configuration is correctly forwarding requests
3. Internal service URLs are correctly configured
