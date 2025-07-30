# Deployment Guide for Sustainability Assessment Tool

## Overview

This guide covers the deployment of the Sustainability Assessment Tool, a comprehensive web application built with a React frontend, Rust backend, and Keycloak for authentication. The application can be deployed to AWS EC2 instances or any environment supporting Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
  - [Local Development Deployment](#local-development-deployment)
  - [AWS EC2 Deployment](#aws-ec2-deployment)
- [SSL Certificate Configuration](#ssl-certificate-configuration)
- [Keycloak Configuration](#keycloak-configuration)
- [Database Setup](#database-setup)
- [Maintenance and Monitoring](#maintenance-and-monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deployment, ensure you have the following:

- Docker and Docker Compose installed
- Git for repository access
- For AWS deployment:
  - AWS CLI configured with appropriate IAM permissions
  - EC2 instance with at least 4GB RAM and 20GB storage
  - Security groups configured for ports 80, 443, 3001, and 8080

## Environment Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ADORSYS-GIS/DGAT-sustainability.git
   cd DGAT-sustainability
   ```

2. **Create Environment File**
   Create a `.env` file in the root directory with the following variables:

   ```
   # Database Configuration
   POSTGRES_DB=sustainability
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=secure_password_here
   POSTGRES_PORT=5432

   # Keycloak Configuration
   KEYCLOAK_ADMIN=admin
   KEYCLOAK_ADMIN_PASSWORD=secure_admin_password_here
   KEYCLOAK_REALM=sustainability-realm
   FERNANDO_PASSWORD=SecurePassword123!

   # Frontend Configuration
   FE_HOST=your_domain_or_ip
   CORS_ORIGIN=https://your_domain_or_ip

   # Keycloak Frontend Configuration
   VITE_KEYCLOAK_ISSUER_URI=https://your_domain_or_ip/keycloak/realms/sustainability-realm
   VITE_KEYCLOAK_CLIENT_ID=sustainability-tool
   VITE_KEYCLOAK_SCOPES=openid profile email
   VITE_KEYCLOAK_HOME_URL=https://your_domain_or_ip
   VITE_KEYCLOAK_REDIRECT_URI=https://your_domain_or_ip/callback

   # Email Configuration (For Keycloak)
   EMAIL_HOST=smtp.your_provider.com
   EMAIL_PORT=587
   EMAIL_FROM=noreply@your_domain.com
   EMAIL_USER=your_email_username
   EMAIL_PASSWORD=your_email_password
   EMAIL_SSL=false
   EMAIL_STARTTLS=true
   EMAIL_AUTH=true
   DISPLAY_NAME=Sustainability Tool
   ```

   Replace placeholders with your actual values, especially `your_domain_or_ip` with your actual domain or EC2 public IP.

## Deployment Options

### Local Development Deployment

1. **Generate SSL Certificates for Local Development**
   ```bash
   mkdir -p ssl
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/nginx.key -out ssl/nginx.crt -subj "/CN=localhost"
   ```

2. **Start the Services**
   ```bash
   docker-compose up -d
   ```

3. **Verify Deployment**
   - Frontend: https://localhost
   - Backend API: https://localhost/api
   - Keycloak: https://localhost/keycloak

### AWS EC2 Deployment

1. **Launch an EC2 Instance**
   - Amazon Linux 2 or Ubuntu 20.04+ recommended
   - t3.medium or larger instance type
   - Security group with ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3001 (Backend), 8080 (Keycloak) open

2. **Install Dependencies**
   ```bash
   # For Amazon Linux 2
   sudo yum update -y
   sudo yum install -y docker git
   sudo service docker start
   sudo usermod -a -G docker ec2-user
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose

   # For Ubuntu
   sudo apt update
   sudo apt install -y docker.io git
   sudo systemctl enable --now docker
   sudo usermod -aG docker ubuntu
   sudo apt install -y docker-compose
   ```

3. **Deploy the Application**
   ```bash
   # Clone the repository
   git clone https://github.com/ADORSYS-GIS/DGAT-sustainability.git
   cd DGAT-sustainability

   # Update .env with your EC2 public IP or domain
   # Edit the .env file with your actual values

   # Generate SSL certificates (Let's Encrypt recommended for production)
   mkdir -p ssl
   # For self-signed certificate (temporary):
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/nginx.key -out ssl/nginx.crt -subj "/CN=your_domain_or_ip"

   # Start the services
   docker-compose up -d
   ```

4. **Set Up Let's Encrypt (Recommended for Production)**
   ```bash
   # Install Certbot
   sudo apt install -y certbot

   # Obtain certificate
   sudo certbot certonly --standalone -d your_domain.com

   # Copy certificates to the project's ssl directory
   sudo cp /etc/letsencrypt/live/your_domain.com/fullchain.pem ssl/nginx.crt
   sudo cp /etc/letsencrypt/live/your_domain.com/privkey.pem ssl/nginx.key
   sudo chmod 644 ssl/nginx.crt
   sudo chmod 644 ssl/nginx.key

   # Restart the frontend container to load new certificates
   docker-compose restart frontend
   ```

## SSL Certificate Configuration

The application requires SSL certificates to function properly. You have three options:

1. **Self-signed certificates** (for development only)
   ```bash
   mkdir -p ssl
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/nginx.key -out ssl/nginx.crt -subj "/CN=your_domain_or_ip"
   ```

2. **Let's Encrypt** (recommended for production)
   Follow the instructions in the AWS EC2 deployment section.

3. **Custom certificates**
   If you have certificates from another provider, place them in the `ssl` directory as:
   - `ssl/nginx.crt` (certificate file)
   - `ssl/nginx.key` (private key file)

## Keycloak Configuration

Keycloak is automatically configured with a default realm and client on startup. To customize:

1. **Access Keycloak Admin Console**
   - URL: https://your_domain_or_ip/keycloak/admin
   - Username: admin
   - Password: (from your .env file)

2. **Email Configuration**
   Keycloak is configured to use the email settings from your .env file. For production, use a reliable SMTP provider.

3. **Custom Theme**
   The application includes a custom Keycloak theme. To modify it:
   - Edit files in `infrastructure/themes/`
   - Rebuild the theme JAR and place it in the same directory
   - Restart Keycloak with `docker-compose restart keycloak`

## Database Setup

The PostgreSQL database is automatically initialized with the necessary schemas. For data persistence:

1. **Configure Volume Mapping**
   Edit `docker-compose.yml` to add a volume for the database:
   ```yaml
   db:
     # ... existing configuration ...
     volumes:
       - postgres-data:/var/lib/postgresql/data
   ```

2. **Backup Strategy**
   ```bash
   # Manual backup
   docker exec sustainability-db pg_dump -U postgres -d sustainability > backup_$(date +%Y%m%d).sql

   # Restore from backup
   cat backup_file.sql | docker exec -i sustainability-db psql -U postgres -d sustainability
   ```

## Maintenance and Monitoring

1. **Logs**
   ```bash
   # View logs for all services
   docker-compose logs

   # View logs for a specific service
   docker-compose logs backend
   docker-compose logs frontend
   docker-compose logs keycloak
   ```

2. **Updates**
   ```bash
   # Pull latest code
   git pull

   # Rebuild and restart services
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

3. **Health Checks**
   The application includes health check endpoints:
   - Frontend: https://your_domain_or_ip/health
   - Backend: http://your_domain_or_ip:3001/health

## Troubleshooting

### Common Issues

1. **Services Fail to Start**
   - Check Docker logs: `docker-compose logs`
   - Ensure all required ports are available
   - Verify environment variables in `.env`

2. **SSL Certificate Issues**
   - Ensure certificates exist in the `ssl` directory
   - Check certificate permissions: `chmod 644 ssl/nginx.crt ssl/nginx.key`
   - Verify certificate matches domain name

3. **Keycloak Authentication Problems**
   - Check Keycloak logs: `docker-compose logs keycloak`
   - Verify Keycloak URL in `.env` matches your actual domain
   - Ensure client configuration in Keycloak matches frontend settings

4. **Database Connection Issues**
   - Check database logs: `docker-compose logs db`
   - Verify database credentials in `.env`
   - Ensure database port is not used by another service

### Support

For additional support:
- Open an issue on the GitHub repository
- Contact the development team at support@example.com
