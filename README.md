# Sustainability Assessment Tool

The Sustainability Assessment Tool is a digital platform designed to help cooperatives in Southern Africa evaluate their sustainability performance. Built as a Progressive Web App (PWA), it allows users to conduct assessments offline and sync data when connected. This tool is part of a broader initiative by DGRV to support cooperative development through digital transformation, empowering cooperatives to assess their sustainability across environmental, financial, and governance dimensions.

## Development Status

This project is currently in **active development**. Core features such as assessment creation, offline synchronization, and user management are being implemented. The tool is not yet ready for production use. For updates, please refer to the issue tracker in the repository.

## Features

- **Offline Capability**: Conduct assessments without an internet connection; data syncs automatically when online.
- **Multilingual Support**: Interface and content available in multiple languages to cater to diverse users.
- **Role-Based Access Control**: Secure access for different user types, including cooperative users and DGRV administrators.
- **Assessment Management**: Create, save, and submit sustainability assessments with dynamic question sets.
- **Reporting**: Generate detailed reports with scores, visualizations, and recommendations.
- **Secure Architecture**: Built with security in mind, using encryption and compliant with data protection standards.

## Technology Stack

- **Backend**: Rust microservices for high performance and memory safety.
- **Frontend**: ReactJS for the user PWA and admin interface.
- **Database**: PostgreSQL for secure and scalable data storage.
- **Identity Management**: Keycloak for authentication and authorization.
- **Deployment**: Kubernetes on AWS for cloud-native scalability.
- **Other Tools**: Docker for containerization, GitHub Actions for CI/CD.

## Project Structure

The project is organized as follows:

```
/sustainability-tool
├── /backend                # Rust microservices for core functionality
├── /frontend               # ReactJS applications (User PWA and Admin Frontend)
├── /infrastructure         # Kubernetes, AWS, Keycloak, and database configurations
├── /docs                   # Project documentation and training materials
├── /scripts                # Utility scripts for setup, testing, and deployment
├── /tests                  # Integration and end-to-end tests
├── /.github                # CI/CD pipeline configurations
├── README.md               # Project overview and setup instructions
├── LICENSE                 # License file (to be defined)
└── docker-compose.yml      # Local development environment setup
```

For a detailed breakdown, see the [project structure documentation](link-to-project-structure-artifact).

## Installation and Setup

### Prerequisites

- Docker and Docker Compose
- Node.js (v14 or later)
- Rust (stable version)
- AWS CLI (if deploying to AWS)
- Git

### Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/sustainability-tool.git
   cd sustainability-tool
   ```

2. **Set Up Environment Variables**
   - Copy the example env file:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` to include database credentials, Keycloak settings, and other required variables.

3. **Start Local Development Environment**
   - Launch services with Docker Compose:
     ```bash
     docker-compose up -d
     ```
   - This starts PostgreSQL, Keycloak, and other dependencies.

4. **Build and Run Backend Services**
   - Navigate to a backend service directory (e.g., `/backend/sustainability-service`) and run:
     ```bash
     cargo build
     cargo run
     ```

5. **Build and Run Frontend Applications**
   - For the user PWA:
     ```bash
     cd frontend/user-pwa
     npm install
     npm start
     ```
   - For the admin frontend:
     ```bash
     cd frontend/admin-frontend
     npm install
     npm start
     ```

6. **Configure Keycloak**
   - Access the Keycloak admin console at `http://localhost:8080`.
   - Import realm settings from `/infrastructure/keycloak/realms`.

7. **Apply Database Migrations**
   - Run migrations using the db-migrator binary:
     ```bash
     cd backend
     cargo run --bin db-migrator
     ```
   - This will connect to the database and apply all migrations if they haven't been applied yet.

For production deployment, refer to the [deployment documentation](link-to-deployment-docs).

## Usage

### Accessing the PWA

- Open `http://localhost:3000` in your browser.
- Register or log in with provided credentials.
- Start a new sustainability assessment or continue a draft.

### Accessing the Admin Interface

- Navigate to `http://localhost:3001`.
- Log in with DGRV admin credentials.
- Manage users, configure assessment questions, and generate reports.

### Example Workflow

#### Cooperative User
1. Log in to the PWA.
2. Select "New Assessment" and choose a sustainability template.
3. Answer questions, saving drafts as needed.
4. Submit the assessment.
5. View the generated report with scores and recommendations.

#### DGRV Admin
1. Log in to the admin interface.
2. Add new users or assign roles.
3. Update assessment questions or weights.
4. Generate aggregate reports for multiple cooperatives.

## Security Considerations

- **Authentication**: Users authenticate via Keycloak using OAuth2.
- **Data Encryption**: Sensitive data is encrypted at rest and in transit.
- **Access Control**: Role-based permissions restrict access to authorized features.
- **Compliance**: Designed to meet GDPR and other data protection standards.

## Contributing

We welcome contributions! To contribute:

1. Fork the repository.
2. Create a branch for your feature or bugfix.
3. Submit a pull request with a clear description of your changes.

For major updates, please open an issue first to discuss your ideas.

## Documentation

- **Technical Documentation**: See the `/docs` directory for architecture and API details.
- **User Manuals & Training**: Refer to `/docs/user-guides` and `/docs/training`.

## Support

For issues or questions, open an issue on the GitHub repository or contact the development team.

## License

This project is licensed under the [License Name] - see the `LICENSE` file for details.

---

### Notes
- **Placeholders**: Replace `link-to-project-structure-artifact`, `link-to-deployment-docs`, and `[License Name]` with actual links or text in your repository.
- **License**: Update the `LICENSE` file with the specific license (e.g., MIT, Apache 2.0).
- **Environment Variables**: Ensure `.env.example` includes all necessary variables.
- **Keycloak**: Provide detailed setup instructions in `/infrastructure/keycloak` if needed.
- **Migrations**: Specify the migration tool in the setup steps.
