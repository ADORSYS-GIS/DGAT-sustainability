
# Technical Implementation Details: Category Assignment Feature

## Database Migration

### Migration File
```rust
// backend/src/common/migrations/m20250916_000016_add_categories_to_assessments.rs
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .add_column(
                        ColumnDef::new(Assessments::Categories)
                            .json_binary()
                            .default(Value::Json(Some(JsonValue::Array(vec![]))))
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .drop_column(Assessments::Categories)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
    OrgId,
    Language,
    Name,
    Categories, // New field
    CreatedAt,
}
```

## Backend Implementation

### 1. Update Assessment Model
```rust
// backend/src/common/database/entity/assessments.rs
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "assessments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub assessment_id: Uuid,
    pub org_id: String,
    pub language: String,
    pub name: String,
    #[sea_orm(column_type = "JsonBinary")]
    pub categories: Json, // Store as JSON array of UUIDs
    pub created_at: DateTime<Utc>,
}

// Update ActiveModelBehavior to handle JSON default
impl ActiveModelBehavior for ActiveModel {
    fn new() -> Self {
        Self {
            categories: Set(Json::from(Vec::<Uuid>::new())),
            ..ActiveModelBehavior::default().new()
        }
    }
}
```

### 2. Update Assessment Service
```rust
// backend/src/common/database/entity/assessments.rs
pub async fn create_assessment(
    &self,
    org_id: String,
    language: String,
    name: String,
    categories: Vec<Uuid>,
) -> Result<Model, DbErr> {
    // Validate categories exist and belong to organization
    let valid_categories = self.validate_categories(&categories, &org_id).await?;
    
    let assessment = ActiveModel {
        assessment_id: Set(Uuid::new_v4()),
        org_id: Set(org_id),
        language: Set(language),
        name: Set(name),
        categories: Set(Json::from(valid_categories)),
        created_at: Set(Utc::now()),
    };

    self.db_service.create(assessment).await
}

async fn validate_categories(
    &self,
    category_ids: &[Uuid],
    org_id: &str,
) -> Result<Vec<Uuid>, DbErr> {
    if category_ids.is_empty() {
        return Ok(vec![]);
    }

    // Get all categories to validate they exist
    let all_categories = self.get_categories_service().get_all_categories().await?;
    
    let valid_categories: Vec<Uuid> = category_ids
        .iter()
        .filter(|&&category_id| {
            all_categories.iter().any(|cat| 
                cat.category_id == category_id && 
                cat.template_id == org_id // Ensure category belongs to org
            )
        })
        .cloned()
        .collect();

    Ok(valid_categories)
}
```

### 3. Update API Models
```rust
// backend/src/web/api/models.rs
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAssessmentRequest {
    pub language: String,
    pub name: String,
    #[serde(default)]
    pub categories: Vec<Uuid>, // Optional field with default empty vec
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Assessment {
    pub assessment_id: Uuid,
    pub org_id: String,
    pub language: String,
    pub name: String,
    pub categories: Vec<Uuid>, // New field
    pub status: AssessmentStatus,
    pub created_at: String,
    pub updated_at: String,
}
```

### 4. Update Assessment Handler
```rust
// backend/src/web/api/handlers/assessments.rs
pub async fn create_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<CreateAssessmentRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // ... existing validation code ...
    
    // Create the new assessment with categories
    let assessment_model = app_state
        .database
        .assessments
        .create_assessment(org_id, request.language, request.name, request.categories)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create assessment: {e}")))?;

    // Convert to API model including categories
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        org_id: assessment_model.org_id,
        language: assessment_model.language,
        name: assessment_model.name,
        categories: assessment_model.categories.0, // Extract from Json wrapper
        status: AssessmentStatus::Draft,
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(),
    };

    // ... rest of method ...
}
```

## Frontend Implementation

### 1. Update CreateAssessmentModal Component
```typescript
// frontend/src/components/shared/CreateAssessmentModal.tsx
interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, categories: string[]) => void;
  isLoading?: boolean;
  availableCategories?: Category[];
}

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  availableCategories = [],
}) => {
  const { t } = useTranslation();
  const [assessmentName, setAssessmentName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assessmentName.trim()) {
      onSubmit(assessmentName.trim(), selectedCategories);
      setAssessmentName("");
      setSelectedCategories([]);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t('assessment.createAssessment')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="assessment-name">
              {t('assessment.assessmentName')}
            </Label>
            <Input
              id="assessment-name"
              value={assessmentName}
              onChange={(e) => setAssessmentName(e.target.value)}
              placeholder={t('assessment.enterAssessmentName')}
              required
              autoFocus
            />
          </div>

          {availableCategories.length > 0 && (
            <div>
              <Label>{t('assessment.selectCategories')}</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {availableCategories.map((category) => (
                  <div key={category.category_id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`category-${category.category_id}`}
                      checked={selectedCategories.includes(category.category_id)}
                      onChange={() => handleCategoryToggle(category.category_id)}
                      className="mr-2"
                    />
                    <Label htmlFor={`category-${category.category_id}`} className="text-sm">
                      {category.name} ({category.weight})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-dgrv-blue hover:bg-blue-700"
              disabled={isLoading || !assessmentName.trim()}
            >
              {isLoading 
                ? t('common.creating')
                : t('assessment.createAssessment')
              }
            </Button>
          </div>
        </form>
      </
DialogContent>
    </Dialog>
  );
};
```

### 2. Update Assessment Page Logic
```typescript
// frontend/src/pages/user/Assesment.tsx
// Add category filtering logic to the existing assessment page
const getFilteredQuestions = (assessment: Assessment, allQuestions: Question[]) => {
  // If assessment has no categories assigned, show all questions (backward compatibility)
  if (!assessment.categories || assessment.categories.length === 0) {
    return allQuestions;
  }

  // Filter questions to only include those from assigned categories
  return allQuestions.filter(question => 
    assessment.categories.includes(question.category)
  );
};

// Update the groupedQuestions calculation
const groupedQuestions = React.useMemo(() => {
  if (!questions极Data?.questions) return {};
  
  const filteredQuestions = getFilteredQuestions(assessmentDetail, questionsData.questions);
  
  const groups: Record<string, { question: Question; revision: QuestionRevision }[]> = {};
  filteredQuestions.forEach((question) => {
    const category = question.category;
    if (!groups[category]) groups[category] = [];
    groups[category].极ush({ question, revision: question.latest_revision });
  });

  // ... rest of existing logic ...
}, [questionsData?.questions, assessmentDetail]);
```

### 3. Update Assessment Creation
```typescript
// frontend/src/pages/user/Assesment.tsx
const handleCreateAssessment = async (assessmentName: string, selectedCategories: string[]) => {
  const newAssessment: CreateAssessmentRequest = { 
    language: currentLanguage,
    name: assessmentName,
    categories: selectedCategories, // Include selected categories
  };
  
  createAssessment(newAssessment, {
    onSuccess: (result) => {
      // ... existing success logic ...
    },
    onError: () => {
      // ... existing error logic ...
    },
    organizationId: orgInfo.orgId,
    userEmail: user.email,
  });
};
```

## API Documentation Updates

### OpenAPI Specification Updates
```yaml
# docs/openapi.yaml
components:
  schemas:
    CreateAssessmentRequest:
      type: object
      required:
        - language
       极 name
      properties:
        language:
          type: string
        name:
          type: string
        categories:
          type: array
          items:
            type: string
            format: uuid
          description: Array of category UUIDs to assign to this assessment

    Assessment:
      type: object
      properties:
        assessment_id:
          type极: string
          format: uuid
        org_id:
          type: string
        language:
          type: string
        name:
          type: string
        categories:
          type: array
          items:
            type: string
            format: uuid
        status:
          $ref: '#/components/schemas/AssessmentStatus'
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
```

## Testing Implementation

### Unit Tests
```rust
// backend/src/common/database/entity/assessments.rs
#[cfg(test)]
mod tests {
    // ... existing tests ...
    
    #[tokio::test]
    async fn test_create_assessment_with_categories() -> Result<(), Box<dyn std::error::Error>> {
        let mock_assessment = Model {
            assessment_id: Uuid::new_v4(),
            org_id: "test_org".to_string(),
            language: "en".to_string(),
            name: "Test Assessment".to_string(),
            categories: Json::from(vec![Uuid::new_v4(), Uuid::new_v4()]),
            created_at: Utc::now(),
        };

        // Test that categories are properly stored and retrieved
        assert_eq!(mock_assessment.categories.0.len(), 2);
        Ok(())
    }

    #[tokio::test]
    async fn test_validate_categories() -> Result<(), Box<dyn std极:error::Error>> {
        // Test category validation logic
        // Should filter out non-existent categories
        // Should ensure categories belong to correct organization
        Ok(())
    }
}
```

### Integration Tests
```typescript
// frontend/src/components/shared/__tests__/CreateAssessmentModal.test.tsx
describe('CreateAssessmentModal', () => {
  it('should allow category selection when available', () => {
    const availableCategories = [
      { category_id: 'cat1', name: 'Category 1', weight: 10 },
      { category_id: 'cat2', name: 'Category 2', weight: 20 },
    ];

    render(
      <CreateAssessmentModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        availableCategories={availableCategories}
      />
    );

    expect(screen.getByText('Category 1 (10)')).toBeInTheDocument();
    expect(screen.getByText('Category 2 (20)')).toBeInTheDocument();
  });

  it('should submit selected categories', async () => {
    const onSubmit = jest.f极n();
    const availableCategories = [
      { category极id: 'cat1', name: 'Category 1', weight: 10 },
    ];

    render(
      <CreateAssessmentModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        availableCategories={availableCategories}
      />
    );

    // Fill assessment name
    fireEvent.change(screen.getByLabelText(/assessment name/i), {
      target: { value: 'Test Assessment' }
    });

    // Select category
    fireEvent.click(screen.getByLabelText(/category 1/i));

    // Submit
    fireEvent.click(screen.getByText(/create assessment/i));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Test Assessment', ['cat1']);
    });
  });
});
```

## Migration and Deployment Strategy

### Phase 1: Database Migration
1. Run migration to add `categories` column to assessments table
2. Column is nullable with default empty array for backward compatibility

### Phase 2: Backend Deployment
1. Deploy updated backend with category support
2. New API accepts categories field but doesn't require it
3. Existing assessments continue to work with empty categories array

### Phase 3: Frontend Deployment
1. Deploy updated frontend with category selection
2. Org admins can now assign categories during assessment creation
3. Normal users see filtered questions based on assigned categories

### Phase 4: Data Migration (Optional)
1. Migrate existing assessments to have appropriate categories
2极. Can be done gradually based on organization needs

## Rollback Procedures

### Database Rollback
```sql
-- If needed, remove the categories column
ALTER TABLE assessments DROP COLUMN categories;
```

### Backend Rollback
1. Revert to previous version that ignores categories field
2. API will continue to work with existing clients

### Frontend Rollback
1. Revert to previous version without category selection
2. Assessment creation will work without categories

## Performance Considerations

1. **Indexing**: Ensure proper indexing on categories JSONB field if needed
2. **Query Optimization**: Use GIN indexes for JSON array queries if necessary
3. **Caching**: Cache category data to avoid repeated database queries
4. **Pagination**: Consider pagination for organizations with many categories

## Security Considerations

1. **Input Validation**: Validate category UUIDs and ensure they belong to user's organization
2. **Permission Checks**: Only org_admins can assign categories
3. **Data Access**: Users should only see categories they have access to
4. **SQL Injection**: Use parameterized queries for JSON operations

## Monitoring and Logging

1. **Log Category Assignments**: Log when categories are assigned to assessments
2. **Monitor Performance**: Track query performance for category filtering
3. **Error Tracking**: Monitor for validation errors in category assignment
4. **Usage Metrics**: Track how often category assignment is used

---

*Technical Implementation Details Created: 2025-09-16*