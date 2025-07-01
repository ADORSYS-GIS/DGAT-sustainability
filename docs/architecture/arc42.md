# Arc42 Documentation 

## 1. Introduction and Goals

The Sustainability Tool enables cooperative organizations, such as the National Cooperative Federation of Eswatini (NCFE) and DGRV Southern Africa, to assess sustainability across Institutional, Environmental, Social, and Governance aspects, based on the DGRV Sustainability Measurement Tool. It supports offline and online operations, multilingual question sets, and report generation in PDF and CSV formats. Integrated with Keycloak for secure identity management, the tool ensures scalability, security, and usability for multiple organizations.

### Goals

- **Facilitate Assessments**: Support structured ESG assessments with weighted questions.
- **Enable Offline Functionality**: Allow data entry and synchronization in disconnected environments.
- **Ensure Security**: Protect data with encryption and role-based access control.
- **Generate Actionable Reports**: Provide PDF/CSV reports for stakeholders.
- **Support Multi-Tenancy**: Manage isolated data for multiple organizations.

### Requirements Overview

- **Functional**: Create/edit assessments, manage questions, synchronize offline data, generate reports.
- **Non-Functional**: High availability, GDPR compliance, multilingual support, responsive UI.

*Cross-reference: See Section 2 for constraints and Section 9 for technical choices.*

## 2. Constraints

### Technical Constraints

- **Identity Management**: Integrate with Keycloak, using user_id (VARCHAR, Keycloak sub) and organization_id in JWT attributes.
- **Database**: PostgresSQL with JSONB for flexible storage of answers and multilingual text.
- **Encryption**: AES-256 for sensitive JSONB data.
- **Security**: PostgresSQL row-level security for user-specific access.
- **Performance**: GIN indexes on JSONB fields for query optimization.
- **Frontend**: React with Tailwind CSS, hosted via CDN.
- **Backend**: Rust microservices with RESTful APIs.

### Organizational Constraints

- **Multi-Tenancy**: Support organizations like NCFE with isolated data.
- **Questionnaire**: Align with DGRV's sustainability categories (Institutional, Environmental, Social, Governance).
- **Donor Compliance**: Adhere to donor reporting requirements.

### Legal Constraints

- **Data Protection**: Comply with GDPR and Eswatini data regulations.

*Cross-reference: See Section 3 for system boundaries and Section 8 for security details.*

## 3. Context and Scope

### Context Diagram (C4 System Context)

```mermaid
graph TD
    A[User] -->|Interacts| B[Frontend App]
    B -->|Authenticates| C[Keycloak]
    B -->|REST API| D[Backend Services]
    D -->|SQL| E[PostgreSQL]
    D -->|Queries| C
    F[Donors] -->|View Reports| B
    G[Auditors] -->|Access Compliance Data| B
```

### Scope

- **In Scope**: Assessment management, question authoring, offline synchronization, report generation, multilingual support.
- **Out of Scope**: User account creation (Keycloak), external auditing processes.

*Cross-reference: See Section 5 for components and Section 6 for interactions.*

## 4. Solution Strategy

The system employs a modular, cloud-native architecture:

- **Frontend**: React with Tailwind CSS for a responsive, offline-capable UI.
- **Backend**: Rust microservices for scalability and maintainability.
- **Database**: PostgreSQL with JSONB for flexible storage, optimized with relational design.
- **Authentication**: Keycloak for secure identity management.
- **Synchronization**: Queue-based mechanism for offline/online data sync.
- **Reporting**: PDF/CSV generation aligned with DGRV metrics.
- **Deployment**: AWS with CI/CD for rapid iteration.

**Justification**: This approach ensures scalability, supports DGRV's complex questionnaire, and meets offline and security requirements.

*Cross-reference: See Section 9 for detailed decisions and Section 11 for quality goals.*

## 5. Building Block View

### Level 1: Container Diagram (C4)

```mermaid
graph TD
    A[User] --> B[Frontend App: React]
    B -->|OAuth2| C[Keycloak]
    B -->|REST API| D[Backend Services: Rust]
    D -->|SQL| E[PostgresSQL]
    subgraph "Sustainability Tool"
        B
        D
        E
    end
    C[Keycloak: Identity Management]
```

### Level 2: Component Diagram (C4)

```mermaid
graph TD
    A[Frontend App: React] -->|REST| B[Authentication Service]
    A -->|REST| C[Assessment Service]
    A -->|REST| D[Sync Service]
    A -->|REST| E[Report Service]
    B -->|SQL| F[PostgreSQL]
    C -->|SQL| F
    D -->|SQL| F
    E -->|SQL| F
    B -->|OAuth2| G[Keycloak]
    subgraph "Backend Services"
        B[Authentication Service]
        C[Assessment Service]
        D[Sync Service]
        E[Report Service]
    end
```

### Components

#### Frontend Application Architecture:
- Built with React, using JSX and Tailwind CSS for styling.
- Offline storage via IndexedDB for assessments and sync queue.
- Features: Authentication, assessment creation/editing, synchronization, report viewing.
- CDN-hosted via AWS S3 and CloudFront.

#### Backend API Design and Microservices Structure:
- **Authentication Service**: Validates Keycloak JWT tokens.
- **Assessment Service**: Manages CRUD for assessments and questions.
- **Sync Service**: Processes offline changes from SYNC_QUEUE.
- **Report Service**: Generates PDF/CSV reports.
- Built with Rust, exposing RESTful APIs.

#### Database Schema and Data Flow:
- **ASSESSMENTS**: Stores assessment_id (UUID PK), user_id (VARCHAR, Keycloak sub), data (JSONB for answers).
- **ORGANIZATION_CATEGORIES**: Stores category_id (UUID PK), organization_id (UUID), name (VARCHAR), description (VARCHAR, nullable), categories (JSONB, array of strings).
- **QUESTIONS**: Stores question_id (UUID PK), text (JSONB for multilingual), category_id (UUID FK to ORGANIZATION_CATEGORIES), weight (FLOAT).
- **SYNC_QUEUE**: Stores sync_id (UUID PK), user_id (VARCHAR), assessment_id (UUID FK), data (JSONB), status (ENUM: pending, processing, completed).
- **REPORTS**: Stores report_id (UUID PK), assessment_id (UUID FK), type (ENUM: PDF, CSV), data (JSONB).
- **Data Flow**: Users create assessments via frontend, stored in ASSESSMENTS. Questions are organized by categories per organization. Offline changes queue in SYNC_QUEUE, synced to database. Reports generated from ASSESSMENTS and stored in REPORTS.

#### Keycloak Integration:
- Manages user identities and roles.
- Provides JWT with user_id and organization_id.

*Cross-reference: See Section 6 for runtime scenarios and Section 7 for deployment details.*

## 6. Runtime View

### Scenario 1: Keycloak Authentication Flow
1. User navigates to frontend, redirected to Keycloak login.
2. Keycloak issues JWT with user_id (VARCHAR) and organization_id (JWT attribute).
3. Frontend stores token, uses it for API requests.
4. Authentication service validates token with Keycloak.

### Scenario 2: Offline/Online Synchronization
1. User creates/edits assessment offline.
2. Data stored in IndexedDB.
3. Sync queue entry added to SYNC_QUEUE with user_id, assessment_id, and data (JSONB).
4. When online, frontend sends queue to sync service.
5. Sync service updates ASSESSMENTS and ASSESSMENT_QUESTIONS, resolving conflicts (e.g., last-write-wins).

### Scenario 3: Report Generation
1. User submits completed assessment.
2. Frontend calls report service API.
3. Service fetches data from ASSESSMENTS and ASSESSMENT_QUESTIONS, generates PDF/CSV, stores in REPORTS.
4. Frontend provides download link.

*Cross-reference: See Section 5 for components and Section 8 for sync details.*

## 7. Deployment View

### Deployment Diagram (C4)

```mermaid
graph TD
    A[User] -->|HTTPS| B[CloudFront]
    B -->|Static Assets| C[S3: Frontend]
    B -->|REST API| D[ECS: Backend Services]
    D -->|SQL| E[RDS: PostgreSQL]
    D -->|OAuth2| F[Keycloak]
    D -->|Cache| G[ElastiCache: Redis]
    H[GitHub Actions] -->|CI/CD| D
    subgraph "AWS VPC"
        D[ECS: Backend Services]
        E[RDS: PostgreSQL]
        G[ElastiCache: Redis]
    end
```

### Deployment and DevOps Pipeline

#### Infrastructure:
- **Frontend**: Hosted on AWS S3 with CloudFront CDN.
- **Backend**: Rust microservices on ECS with auto-scaling.
- **Database**: RDS PostgreSQL with automated backups and multi-AZ.
- **Keycloak**: Managed instance for high availability.
- **Caching**: ElastiCache (Redis) for performance.

#### CI/CD Pipeline:
- **Version Control**: GitHub for source code.
- **Build**: GitHub Actions builds Docker images for backend services.
- **Test**: Automated unit and integration tests.
- **Deploy**: Images pushed to ECR, deployed to ECS via GitHub Actions.
- **Monitoring**: CloudWatch for logs and metrics, alerts for failures.

#### Environments:
- **Development**: Local Dockerized setup.
- **Staging**: AWS with anonymized data.
- **Production**: High-availability setup.

*Cross-reference: See Section 10 for deployment risks.*

## 8. Cross-cutting Concepts

### Security:
- TLS for API communication.
- AES-256 encryption for JSONB fields.
- PostgreSQL row-level security.
- Keycloak role-based access control.

### Performance:
- GIN indexes on JSONB fields (data, text, answer).
- Redis caching for frequent queries.
- Asynchronous report generation.

### Internationalization:
- JSONB for multilingual question text (e.g., {'en': 'Text', 'fr': 'Texte'}).
- Frontend language switching.

### Offline/Online Synchronization:
- IndexedDB for local storage.
- SYNC_QUEUE for queuing changes.
- Conflict resolution via last-write-wins or user prompts.

### Logging/Monitoring:
- CloudWatch for metrics and logs.
- Audit logs for user actions.

*Cross-reference: See Section 9 for justifications.*

## 9. Design Decisions

| Decision | Justification                                                         | Alternatives Considered |
|----------|-----------------------------------------------------------------------|------------------------|
| Keycloak Integration | Simplifies authentication, supports multi-tenancy via JWT.            | Custom auth (higher maintenance). |
| JSONB in PostgreSQL | Flexible for DGRV's questionnaire and multilingual text.              | Relational tables (less adaptable). |
| React with Tailwind CSS | Responsive UI, rapid development.                                     | Angular (complexer setup). |
| Microservices Architecture | Scalability, independent deployment.                                  | Monolith (less flexible). |
| Sync Queue | Reliable offline sync with conflict resolution.                       | Real-time sync (requires connectivity). |
| AWS Deployment | Scalable, managed services.                                           | On-premises (higher costs). |
| Rust Backend | Memory safety, performance, concurrency. and low resource utilisation | Node.js (higher memory usage). |

*Cross-reference: See Section 4 for strategy and Section 11 for quality impacts.*

## 10. Risks and Technical Debt

### Risks
- **Sync Conflicts**: Mitigated by last-write-wins or user prompts.
- **JSONB Performance**: Addressed with GIN indexes.
- **Keycloak Downtime**: Mitigated with redundant instances.
- **Scalability Limits**: Monitored via CloudWatch.

### Technical Debt
- **Unused Questions**: Periodic cleanup of QUESTIONS.
- **Sync Queue Maintenance**: Failed syncs require monitoring.

*Cross-reference: See Section 7 for mitigation strategies.*

## 11. Quality Requirements

| Quality | Description | Scenario |
|---------|-------------|----------|
| Performance | API response <500ms. | 100-question assessment submission. |
| Scalability | Support 1,000 concurrent users. | Multiple organizations submit simultaneously. |
| Security | Data encryption, access control. | Unauthorized access attempt. |
| Usability | Intuitive UI, offline support. | Offline assessment and sync. |
| Maintainability | Modular design for updates. | Add new question category. |

*Cross-reference: See Section 9 for design impacts.*

## 12. Glossary

| Term | Definition |
|------|------------|
| DGRV | German Cooperative and Raiffeisen Confederation. |
| ESG | Environmental, Social, Governance criteria. |
| Keycloak | Identity and access management system. |
| JSONB | PostgreSQL binary JSON format. |
| Sync Queue | Mechanism for offline data synchronization. |

## Database ER Diagram

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ ASSESSMENTS : "linked via Keycloak JWT"
    ORGANIZATIONS ||--o{ ORGANIZATION_CATEGORIES : "has"
    ORGANIZATION_CATEGORIES ||--o{ QUESTIONS : "contains"
    ASSESSMENTS ||--o{ SYNC_QUEUE : "queued for"
    ASSESSMENTS ||--o| REPORTS : "generates"

    ORGANIZATIONS {
        uuid organization_id PK
        varchar name
        varchar country
    }

    ASSESSMENTS {
        uuid assessment_id PK
        varchar user_id "Keycloak sub"
        jsonb data "Answers: [{question_id, answer}]"
        assessment_status status "ENUM(Draft, Submitted, Completed)"
    }

    ORGANIZATION_CATEGORIES {
        uuid category_id PK
        uuid organization_id FK
        varchar name
        varchar description "nullable"
        jsonb categories "Array of strings"
    }

    QUESTIONS {
        uuid question_id PK
        jsonb text "Multilingual: {'en': 'Text', 'fr': 'Texte'}"
        uuid category_id FK
        float weight
    }

    SYNC_QUEUE {
        uuid sync_id PK
        varchar user_id "Keycloak sub"
        uuid assessment_id FK
        jsonb data "Changed fields"
        sync_status status "ENUM(pending, processing, completed)"
    }

    REPORTS {
        uuid report_id PK
        uuid assessment_id FK
        report_type type "ENUM(PDF, CSV)"
        jsonb data "Report content"
    }
```
