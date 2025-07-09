# Assessment System Data Model

This schema implements a version-safe assessment system with the following components:

## 1. Assessment Creation & Response Collection
- `ASSESSMENTS` creates a session for each user taking a test
- Users provide answers stored in `ASSESSMENTS_RESPONSE` (with version tracking for answer changes)
- File uploads are supported through `ASSESSMENTS_RESPONSE_FILE` → `FILE` relationship

## 2. Question Version Management
- `QUESTIONS` + `QUESTIONS_REVISIONS` ensure question edits don't affect existing assessments
- Each response links to a specific question revision, preserving historical accuracy

## 3. Submission & Reporting
- `ASSESSMENTS_SUBMISSION` creates an immutable snapshot when user submits
- `SUBMISSION_REPORTS` stores grading results and feedback tied to the submission

## Key Benefits
- ✅ **Immutable assessments** - completed tests remain unchanged even if questions are updated
- ✅ **Answer versioning** - tracks how responses evolve during the assessment
- ✅ **File attachment support** - handles document/image uploads
- ✅ **Audit trail** - complete history from draft to final grade

## Entity Relationships

```mermaid
erDiagram
ASSESSMENTS ||--o{ ASSESSMENTS_RESPONSE : "has"
ASSESSMENTS_SUBMISSION ||--o| SUBMISSION_REPORTS : "procudes"
QUESTIONS  || --o{ QUESTIONS_REVISIONS : "versions"
ASSESSMENTS_RESPONSE |o--o| QUESTIONS_REVISIONS : "one"
ASSESSMENTS_RESPONSE_FILE }o--|| ASSESSMENTS_RESPONSE : "one"
ASSESSMENTS_RESPONSE_FILE |o--o| FILE : "one"

    ASSESSMENTS_SUBMISSION {
        uuid assessment_id PK "from assessment table"
        varchar user_id "Keycloak sub (string UUID)"
        jsonb content "{question: response}[]"
    }

    ASSESSMENTS {
        uuid assessment_id PK
        varchar user_id "Keycloak sub (string UUID)"
        text language "resolved from frontend"
    }

    ASSESSMENTS_RESPONSE {
        uuid response_id PK
        uuid assessment_id FK
        uuid question_revision_id FK "modifiable"
        text response "modifiable"
        int version "auto-increment, from frontend"
        timestamp updated_at "auto-increment, from frontend"
    }

    ASSESSMENTS_RESPONSE_FILE {
        uuid response_id FK
        uuid file_id FK
    }

    FILE {
        uuid file_id PK
        blob content
        json metadata
    }

    QUESTIONS {
        uuid question_id PK
        text categoty
    }

    QUESTIONS_REVISIONS {
        uuid question_id PK
        uuid question_revision_id 
        jsonb text "{i18n}"
        float weight
        timestamp created_at "auto-update"
    }

    SUBMISSION_REPORTS {
        uuid report_id PK
        uuid assessment_id FK
        jsonb data "Report content"
    }
```

## Implementation

The database schema follows the ER diagram and provides:
- Clean separation between mutable draft state and immutable submission
- Full version history of questions and answers
- Support for file attachments
- Comprehensive reporting capabilities
