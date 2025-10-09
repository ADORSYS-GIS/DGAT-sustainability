# Category Assignment Feature Implementation

## Overview

This document describes the implementation of the category assignment feature for the DGAT Sustainability Assessment Platform. The feature allows organization administrators to assign specific categories to assessments during creation, and normal users to only answer questions from the categories assigned to their assessment.

## Architecture Changes

### Database Schema

**Migration**: [`m20250123_000014_create_categories_table.rs`](backend/src/common/migrations/m20250123_000014_create_categories_table.rs:1)
- Added `categories` table with UUID primary key, name, weight, order, and template_id fields

**Assessment Table Update**: [`m20250706_000003_create_assessments_table.rs`](backend/src/common/migrations/m20250706_000003_create_assessments_table.rs:1)
- Added `categories` column as `JSONB` type to store array of category UUIDs
- This approach maintains backward compatibility and allows flexible category assignment

### Backend Changes

#### Models
- [`Assessment`](backend/src/common/database/entity/assessments.rs:1): Added `categories` field as `Option<Json<Vec<String>>>`
- [`CreateAssessmentRequest`](backend/src/common/models/mod.rs:1): Added optional `categories` field for category assignment

#### Service Layer
- [`AssessmentService::create`](backend/src/common/services/mod.rs:1): Updated to handle category assignment with proper validation
- Only organization administrators can assign categories to assessments
- Validates that assigned categories exist in the database

#### API Handlers
- [`assessments.rs`](backend/src/web/api/handlers/assessments.rs:1): Updated to accept categories in create assessment requests
- Proper error handling for invalid category assignments

### Frontend Changes

#### TypeScript Types
- [`CreateAssessmentRequest`](frontend/src/openapi-rq/requests/types.gen.ts:715): Added optional `categories` field
- [`Assessment`](frontend/src/openapi-rq/requests/types.gen.ts:77): Added `categories` field to assessment response

#### Components
- [`CreateAssessmentModal`](frontend/src/components/shared/CreateAssessmentModal.tsx:1): Added category selection UI for organization administrators
  - Multi-select checkbox interface for available categories
  - Only visible to users with `org_admin` role
  - Optional field - if no categories selected, all available categories are included

#### Assessment Flow
- [`Assessment`](frontend/src/pages/user/Assesment.tsx:65): Updated to handle category-based question filtering
  - Organization administrators can assign categories during assessment creation
  - Normal users only see questions from categories assigned to their assessment
  - Proper error handling for users with no assigned categories

## API Changes

### Create Assessment Endpoint
**Endpoint**: `POST /api/v1/assessments`

**Request Body**:
```typescript
{
  "language": "en",
  "name": "Assessment Name",
  "categories": ["category-uuid-1", "category-uuid-2"] // Optional, org_admin only
}
```

**Response**:
```typescript
{
  "assessment": {
    "assessment_id": "uuid",
    "org_id": "uuid",
    "language": "en",
    "name": "Assessment Name",
    "status": "draft",
    "created_at": "2025-09-16T15:00:00Z",
    "updated_at": "2025-09-16T15:00:00Z",
    "categories": ["category-uuid-1", "category-uuid-2"] // Only if assigned
  }
}
```

## Permission Model

### Organization Administrators (`org_admin`)
- Can assign specific categories to assessments during creation
- Can see and manage all categories
- If no categories are selected, all available categories are included in the assessment

### Normal Users (`org_user`)
- Can only answer questions from categories assigned to their assessment
- Cannot assign or modify categories
- If no categories are assigned to the user, they see an appropriate message

## Data Flow

1. **Assessment Creation**:
   - Org admin creates assessment and selects categories (optional)
   - Categories are stored as JSON array in the `assessments.categories` column
   - If no categories selected, all available categories are included

2. **Question Filtering**:
   - When user accesses assessment, system filters questions based on assigned categories
   - If assessment has specific categories, only questions from those categories are shown
   - If assessment has no specific categories, all questions are shown

3. **Response Handling**:
   - Users can only answer questions from their assigned categories
   - Responses are validated against the user's category permissions

## Security Considerations

- **Role-based Access Control**: Only organization administrators can assign categories
- **Input Validation**: Backend validates that assigned categories exist in the database
- **Data Integrity**: Foreign key validation ensures category references are valid
- **Error Handling**: Proper error messages for unauthorized category assignment attempts

## Performance Optimizations

- **JSONB Storage**: Categories stored as JSONB for efficient querying and indexing
- **Eager Loading**: Category data is loaded efficiently with assessments
- **Caching**: Category data is cached to reduce database queries
- **Offline Support**: Category assignments work in offline mode with proper sync

## Testing

### Backend Tests
- Category assignment validation
- Permission checks for org_admin vs org_user
- Error handling for invalid category assignments
- Database migration testing

### Frontend Tests
- Category selection UI for org_admins
- Category filtering for normal users
- Error states for users with no assigned categories
- Offline functionality testing

## Migration Strategy

The implementation uses a backward-compatible approach:
1. Existing assessments continue to work with all categories
2. New assessments can have specific category assignments
3. Database migration adds the `categories` column without breaking existing data

## Usage Examples

### Organization Administrator Creating Assessment
```typescript
// Org admin selects specific categories
const assessment = {
  language: "en",
  name: "Sustainability Assessment Q3 2025",
  categories: ["sustainability-uuid", "environment-uuid"]
};
```

### Normal User Accessing Assessment
```typescript
// User only sees questions from assigned categories
const userCategories = assessment.categories || allCategories;
const filteredQuestions = questions.filter(q => 
  userCategories.includes(q.category_id)
);
```

## Error Handling

- **Invalid Categories**: Returns 400 Bad Request with validation errors
- **Unauthorized Access**: Returns 403 Forbidden for non-admin category assignment
- **Database Errors**: Returns 500 Internal Server Error with appropriate logging
- **Offline Errors**: Graceful degradation with offline storage and sync

## Monitoring and Logging

- Category assignment attempts are logged for audit purposes
- Error rates for category validation are monitored
- Performance metrics for category-based filtering are tracked
- User experience metrics for category assignment flow

## Future Enhancements

- Bulk category assignment for multiple assessments
- Category templates for common assessment types
- Advanced category filtering and search
- Category-based reporting and analytics
- Category permissions at the user level

## Dependencies

- PostgreSQL JSONB support
- SeaORM for database operations
- React Query for data fetching
- TypeScript for type safety
- OpenAPI for API documentation

## Related Files

- [`backend/src/common/migrations/m20250123_000014_create_categories_table.rs`](backend/src/common/migrations/m20250123_000014_create_categories_table.rs:1)
- [`backend/src/common/database/entity/assessments.rs`](backend/src/common/database/entity/assessments.rs:1)
- [`backend/src/common/models/mod.rs`](backend/src/common/models/mod.rs:1)
- [`backend/src/common/services/mod.rs`](backend/src/common/services/mod.rs:1)
- [`frontend/src/components/shared/CreateAssessmentModal.tsx`](frontend/src/components/shared/CreateAssessmentModal.tsx:1)
- [`frontend/src/pages/user/Assesment.tsx`](frontend/src/pages/user/Assesment.tsx:65)
- [`frontend/src/openapi-rq/requests/types.gen.ts`](frontend/src/openapi-rq/requests/types.gen.ts:715)

## Version History

- **2025-09-16**: Initial implementation completed
- **2025-09-15**: Feature design and architecture planning
- **2025-09-14**: Requirements gathering and analysis

## Contributors

- DGAT Development Team
- Sustainability Assessment Platform Working Group

---
*Last updated: 2025-09-16*