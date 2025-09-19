# Category Assignment Feature - Implementation Roadmap

## Executive Summary

This document provides a comprehensive roadmap for implementing the category assignment feature in the DGAT Sustainability Assessment Platform. The feature enables organization administrators to assign specific categories to assessments during creation, ensuring normal users only answer questions from assigned categories.

## Implementation Strategy

### Chosen Approach: JSON Array Field in Assessments Table
- **Rationale**: Simple implementation, maintains backward compatibility, sufficient for current use case
- **Storage**: JSONB column storing array of category UUIDs
- **Backward Compatibility**: Empty array defaults for existing assessments

## Phase 1: Database Migration (Day 1)

### Tasks
1. **Create Migration File**
   - Add `categories` JSONB column to assessments table
   - Default value: empty array `[]`
   - Nullable for backward compatibility

2. **Run Migration**
   - Test migration in development environment
   - Verify rollback procedure works

### Deliverables
- ✅ Database migration script
- ✅ Rollback procedure documentation
- ✅ Migration tested in dev environment

## Phase 2: Backend Implementation (Days 2-3)

### Tasks
1. **Update Assessment Model**
   - Add categories field with JSON type
   - Update ActiveModelBehavior for default values

2. **Update Assessment Service**
   - Modify `create_assessment` to accept categories parameter
   - Add category validation logic
   - Ensure categories belong to organization

3. **Update API Models**
   - Add `categories` field to `CreateAssessmentRequest`
   - Add `categories` field to `Assessment` response model

4. **Update Assessment Handler**
   - Modify create assessment endpoint to handle categories
   - Add proper error handling and validation

### Deliverables
- ✅ Updated assessment entity with categories support
- ✅ Category validation service methods
- ✅ Updated API models and handlers
- ✅ Comprehensive unit tests

## Phase 3: Frontend Implementation (Days 4-6)

### Tasks
1. **Update CreateAssessmentModal**
   - Add category selection UI
   - Checkbox list of available categories
   - Display category weights

2. **Update Assessment Page Logic**
   - Add category filtering for questions
   - Maintain backward compatibility
   - Update progress tracking

3. **Update Assessment Creation**
   - Pass selected categories to API
   - Handle API responses with categories

4. **Add Internationalization**
   - Translation keys for new UI elements
   - Localized category labels

### Deliverables
- ✅ Enhanced CreateAssessmentModal with category selection
- ✅ Category-based question filtering
- ✅ Updated assessment creation flow
- ✅ Comprehensive React component tests

## Phase 4: Testing & QA (Days 7-8)

### Testing Scope
1. **Unit Tests**
   - Category validation logic
   - Assessment creation with categories
   - Permission checks

2. **Integration Tests**
   - End-to-end assessment creation flow
   - Category filtering for normal users
   - Error handling scenarios

3. **User Acceptance Testing**
   - Org admin can assign categories
   - Normal user sees only assigned questions
   - Backward compatibility verified

### Deliverables
- ✅ Complete test suite coverage
- ✅ UAT sign-off from stakeholders
- ✅ Performance baseline established

## Deployment Strategy

### Staged Rollout
1. **Development** → **Staging** → **Production**
2. **Database First**: Migrate database before code deployment
3. **Backend First**: Deploy backend before frontend
4. **Monitoring**: Track performance and error rates

### Rollback Plan
- **Database**: Remove categories column if needed
- **Backend**: Revert to version ignoring categories field
- **Frontend**: Revert to version without category selection

## Success Metrics

### Quantitative
- ✅ 100% of new assessments have categories assigned
- ✅ < 5% performance impact on question loading
- ✅ 0% regression in existing functionality
- ✅ < 1% error rate in category assignment

### Qualitative
- ✅ Org admins find category assignment intuitive
- ✅ Normal users only see relevant questions
- ✅ System maintains backward compatibility
- ✅ Error messages are clear and actionable

## Risk Management

### Identified Risks
1. **Data Migration Issues**
   - Mitigation: Use nullable field, phased rollout

2. **Performance Impact**
   - Mitigation: Proper indexing, query optimization

3. **Permission Escalation**
   - Mitigation: Strict role-based access control

4. **Backward Compatibility**
   - Mitigation: Maintain old behavior when categories empty

### Contingency Plans
- Immediate rollback if critical issues detected
- Feature flag to disable category assignment if needed
- Extended monitoring period post-deployment

## Timeline Summary

| Phase | Duration | Start Date | End Date | Status |
|-------|----------|------------|----------|--------|
| Database Migration | 1 day | 2025-09-17 | 2025-09-17 | Planned |
| Backend Implementation | 2 days | 2025-09-18 | 2025-09-19 | Planned |
| Frontend Implementation | 3 days | 2025-09-20 | 2025-09-22 | Planned |
| Testing & QA | 2 days | 2025-09-23 | 2025-09-24 | Planned |
| **Total** | **8 days** | **2025-09-17** | **2025-09-24** | **Planned** |

## Resource Requirements

### Development Team
- **Backend Developer**: 1 FTE (8 days)
- **Frontend Developer**: 1 FTE (8 days) 
- **QA Engineer**: 0.5 FTE (4 days)

### Infrastructure
- Development environment with latest database
- Staging environment for testing
- Performance monitoring tools
- Error tracking system

## Dependencies

1. **Category Management System**: Must be stable and operational
2. **Organization/User Roles**: Role-based access must work correctly
3. **Question Categorization**: Questions must have proper category assignments
4. **API Documentation**: OpenAPI spec must be updated

## Post-Implementation Tasks

1. **Documentation Updates**
   - Update API documentation
   - Create user guides for category assignment
   - Update admin training materials

2. **Monitoring & Optimization**
   - Monitor category assignment usage
   - Optimize category filtering performance
   - Gather user feedback for improvements

3. **Future Enhancements**
   - Bulk category assignment
   - Category templates
   - Advanced filtering and reporting

## Approval & Sign-off

**Technical Lead**: ___________________ Date: _________
**Product Owner**: ___________________ Date: _________
**QA Manager**: ___________________ Date: _________

---

*Roadmap Created: 2025-09-16*
*Target Completion: 2025-09-24*