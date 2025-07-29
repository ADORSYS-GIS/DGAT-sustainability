// Data Transformation Service
// Converts API data to offline format for IndexedDB storage

import type {
  Question,
  QuestionRevision,
  Assessment,
  Response,
  Submission,
  Report,
  Category,
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  FileMetadata,
  CreateResponseRequest,
  AdminSubmissionDetail
} from "@/openapi-rq/requests/types.gen";

import type {
  OfflineQuestion,
  OfflineAssessment,
  OfflineResponse,
  OfflineCategory,
  OfflineSubmission,
  OfflineReport,
  OfflineOrganization,
  OfflineUser,
  OfflineInvitation
} from "@/types/offline";

export class DataTransformationService {
  /**
   * Transform API Question to OfflineQuestion
   */
  static transformQuestion(question: Question, userOrganizationId?: string): OfflineQuestion {
    const now = new Date().toISOString();
    
    // Debug logging
    console.log('🔍 Transforming question:', {
      question_id: question.question_id,
      category: question.category,
      has_latest_revision: !!question.latest_revision,
      question_type: typeof question,
      question_keys: Object.keys(question)
    });
    
    // Validate required fields
    if (!question.category) {
      console.error('❌ Question missing category:', question);
      throw new Error(`Question ${question.question_id} is missing category property`);
    }
    
    return {
      ...question,
      category_id: question.category,
      revisions: question.latest_revision ? [question.latest_revision] : [],
      search_text: this.generateSearchText(question),
      updated_at: now,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform API Category to OfflineCategory
   */
  static transformCategory(category: Category): OfflineCategory {
    const now = new Date().toISOString();
    
    return {
      ...category,
      question_count: 0, // Will be calculated when questions are loaded
      is_active: true,
      updated_at: now,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform API Assessment to OfflineAssessment
   */
  static transformAssessment(
    assessment: Assessment, 
    userOrganizationId?: string,
    userEmail?: string
  ): OfflineAssessment {
    const now = new Date().toISOString();
    
    return {
      ...assessment,
      organization_id: userOrganizationId,
      user_email: userEmail,
      status: 'draft' as const, // Default status
      progress_percentage: 0,
      last_activity: assessment.created_at,
      updated_at: now,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform API Response to OfflineResponse
   */
  static transformResponse(
    response: Response | CreateResponseRequest,
    questionText?: string,
    questionCategory?: string,
    assessmentId?: string
  ): OfflineResponse {
    const now = new Date().toISOString();
    
    // Handle both Response objects (from API) and CreateResponseRequest objects (for creation)
    const responseId = 'response_id' in response ? response.response_id : crypto.randomUUID();
    const assessmentIdValue = 'assessment_id' in response ? response.assessment_id : assessmentId;
    const version = 'version' in response ? response.version : 1;
    const updatedAt = 'updated_at' in response ? response.updated_at : now;
    
    return {
      response_id: responseId,
      assessment_id: assessmentIdValue || '',
      question_revision_id: typeof response.question_revision_id === 'string' ? response.question_revision_id : '',
      response: typeof response.response === 'string' ? response.response : '',
      version: version,
      updated_at: updatedAt,
      question_text: questionText,
      question_category: questionCategory,
      files: [],
      is_draft: false,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform API Submission to OfflineSubmission
   */
  static transformSubmission(
    submission: Submission,
    userOrganizationId?: string,
    reviewerEmail?: string
  ): OfflineSubmission {
    const now = new Date().toISOString();
    
    return {
      ...submission,
      organization_id: userOrganizationId,
      reviewer_id: submission.reviewed_at ? submission.submission_id : undefined,
      reviewer_email: reviewerEmail,
      review_comments: '',
      files: [],
      updated_at: now,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform API AdminSubmissionDetail to OfflineSubmission
   */
  static transformAdminSubmission(
    adminSubmission: AdminSubmissionDetail,
    userOrganizationId?: string,
    reviewerEmail?: string
  ): OfflineSubmission {
    const now = new Date().toISOString();
    
    // Convert AdminSubmissionDetail to regular Submission format for IndexedDB
    const submission: Submission = {
      submission_id: adminSubmission.submission_id,
      assessment_id: adminSubmission.assessment_id,
      user_id: adminSubmission.user_id,
      content: adminSubmission.content as Submission['content'], // Type assertion for compatibility
      review_status: adminSubmission.review_status,
      submitted_at: adminSubmission.submitted_at,
      reviewed_at: adminSubmission.reviewed_at
    };
    
    return {
      ...submission,
      organization_id: userOrganizationId || (adminSubmission.org_id || 'unknown'),
      org_name: (adminSubmission.org_name as string) || 'Unknown Organization', // Store organization name
      reviewer_id: adminSubmission.reviewed_at ? adminSubmission.submission_id : undefined,
      reviewer_email: reviewerEmail,
      review_comments: '',
      files: [],
      updated_at: now,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform API Report to OfflineReport
   */
  static transformReport(
    report: Report,
    userOrganizationId?: string,
    userId?: string
  ): OfflineReport {
    const now = new Date().toISOString();
    
    return {
      ...report,
      organization_id: userOrganizationId,
      user_id: userId,
      file_path: undefined,
      is_downloaded: false,
      updated_at: now,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform API Organization to OfflineOrganization
   */
  static transformOrganization(organization: Organization): OfflineOrganization {
    const now = new Date().toISOString();
    
    return {
      ...organization,
      member_count: 0, // Will be calculated when members are loaded
      assessment_count: 0, // Will be calculated when assessments are loaded
      submission_count: 0, // Will be calculated when submissions are loaded
      is_active: true,
      updated_at: now,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform API OrganizationMember to OfflineUser
   */
  static transformUser(
    user: OrganizationMember,
    organizationId: string
  ): OfflineUser {
    const now = new Date().toISOString();
    
    return {
      ...user,
      organization_id: organizationId,
      assessment_count: 0, // Will be calculated when assessments are loaded
      submission_count: 0, // Will be calculated when submissions are loaded
      last_login: user.joinedAt || now,
      permissions: this.generatePermissions(user.roles),
      updated_at: now,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform API OrganizationInvitation to OfflineInvitation
   */
  static transformInvitation(
    invitation: OrganizationInvitation,
    inviterEmail?: string,
    organizationName?: string
  ): OfflineInvitation {
    const now = new Date().toISOString();
    
    return {
      ...invitation,
      inviter_email: inviterEmail,
      organization_name: organizationName,
      updated_at: now,
      sync_status: 'synced' as const,
      local_changes: false,
      last_synced: now
    };
  }

  /**
   * Transform multiple questions with category information
   */
  static transformQuestionsWithCategories(
    questions: Question[],
    categories: Category[],
    userOrganizationId?: string
  ): OfflineQuestion[] {
    const categoryMap = new Map(categories.map(cat => [cat.name, cat]));
    
    return questions.map(question => {
      const category = categoryMap.get(question.category);
      const transformed = this.transformQuestion(question, userOrganizationId);
      
      // Add category-specific information if available
      if (category) {
        transformed.category_id = category.category_id;
      }
      
      return transformed;
    });
  }

  /**
   * Transform assessments with user and organization information
   */
  static transformAssessmentsWithContext(
    assessments: Assessment[],
    userOrganizationId?: string,
    userEmail?: string
  ): OfflineAssessment[] {
    return assessments.map(assessment => 
      this.transformAssessment(assessment, userOrganizationId, userEmail)
    );
  }

  /**
   * Transform responses with question context
   */
  static transformResponsesWithContext(
    responses: Response[],
    questions: Question[]
  ): OfflineResponse[] {
    // Create a map of question_revision_id to question for quick lookup
    const questionRevisionMap = new Map<string, Question>();
    questions.forEach(question => {
      if (question.latest_revision?.question_revision_id) {
        questionRevisionMap.set(question.latest_revision.question_revision_id, question);
      }
    });
    
    return responses.map(response => {
      const question = questionRevisionMap.get(response.question_revision_id);
      const questionText = question?.latest_revision?.text?.en || '';
      const questionCategory = typeof question?.category === 'string' ? question.category : '';
      
      return this.transformResponse(response, questionText, questionCategory || '');
    });
  }

  /**
   * Transform submissions with organization context
   */
  static transformSubmissionsWithContext(
    submissions: Submission[],
    userOrganizationId?: string,
    reviewerEmail?: string
  ): OfflineSubmission[] {
    return submissions.map(submission => 
      this.transformSubmission(submission, userOrganizationId, reviewerEmail)
    );
  }

  /**
   * Transform admin submissions with organization context
   */
  static transformAdminSubmissionsWithContext(
    adminSubmissions: AdminSubmissionDetail[],
    userOrganizationId?: string,
    reviewerEmail?: string
  ): OfflineSubmission[] {
    return adminSubmissions.map(submission => 
      this.transformAdminSubmission(submission, userOrganizationId, reviewerEmail)
    );
  }

  /**
   * Transform reports with user and organization context
   */
  static transformReportsWithContext(
    reports: Report[],
    userOrganizationId?: string,
    userId?: string
  ): OfflineReport[] {
    return reports.map(report => 
      this.transformReport(report, userOrganizationId, userId)
    );
  }

  /**
   * Transform organization members with organization context
   */
  static transformUsersWithContext(
    users: OrganizationMember[],
    organizationId: string
  ): OfflineUser[] {
    return users.map(user => this.transformUser(user, organizationId));
  }

  /**
   * Transform organization invitations with context
   */
  static transformInvitationsWithContext(
    invitations: OrganizationInvitation[],
    inviterEmail?: string,
    organizationName?: string
  ): OfflineInvitation[] {
    return invitations.map(invitation => 
      this.transformInvitation(invitation, inviterEmail, organizationName)
    );
  }

  /**
   * Generate search text for questions
   */
  private static generateSearchText(question: Question): string {
    const text = question.latest_revision?.text;
    if (!text) return '';
    
    // Extract text from multilingual object
    const searchableText = Object.values(text)
      .filter(val => typeof val === 'string')
      .join(' ');
    
    return searchableText.toLowerCase();
  }

  /**
   * Generate permissions based on user roles
   */
  private static generatePermissions(roles: string[] | undefined): string[] {
    const permissions: string[] = [];
    
    if (!roles || !Array.isArray(roles)) {
      console.warn('⚠️ No roles provided for user, using default permissions');
      return ['view_own_data']; // Default minimal permissions
    }
    
    if (roles.includes('drgv_admin')) {
      permissions.push('admin_all', 'manage_organizations', 'manage_users', 'manage_categories', 'manage_questions', 'review_submissions');
    }
    
    if (roles.includes('org_admin')) {
      permissions.push('manage_Org_Users', 'create_assessments', 'view_org_data', 'manage_org_settings');
    }
    
    if (roles.includes('Org_User')) {
      permissions.push('answer_assessments', 'view_own_data', 'export_reports');
    }
    
    return permissions;
  }

  /**
   * Validate transformed data
   */
  static validateTransformedData<T>(data: T[], entityType: string): boolean {
    if (!Array.isArray(data)) {
      console.error(`Invalid ${entityType} data: not an array`);
      return false;
    }

    for (const item of data) {
      if (!item || typeof item !== 'object') {
        console.error(`Invalid ${entityType} item: not an object`);
        return false;
      }

      // Check for required offline fields
      const offlineItem = item as { sync_status?: unknown; updated_at?: unknown };
      if (!offlineItem.sync_status || !offlineItem.updated_at) {
        console.error(`Invalid ${entityType} item: missing offline fields`);
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate derived statistics for organizations
   */
  static calculateOrganizationStats(
    organization: OfflineOrganization,
    users: OfflineUser[],
    assessments: OfflineAssessment[],
    submissions: OfflineSubmission[]
  ): OfflineOrganization {
    const orgUsers = users.filter(user => user.organization_id === organization.id);
    const orgAssessments = assessments.filter(assessment => assessment.organization_id === organization.id);
    const orgSubmissions = submissions.filter(submission => submission.organization_id === organization.id);

    return {
      ...organization,
      member_count: orgUsers.length,
      assessment_count: orgAssessments.length,
      submission_count: orgSubmissions.length
    };
  }

  /**
   * Calculate derived statistics for users
   */
  static calculateUserStats(
    user: OfflineUser,
    assessments: OfflineAssessment[],
    submissions: OfflineSubmission[]
  ): OfflineUser {
    const userAssessments = assessments.filter(assessment => assessment.user_id === user.id);
    const userSubmissions = submissions.filter(submission => submission.user_id === user.id);

    return {
      ...user,
      assessment_count: userAssessments.length,
      submission_count: userSubmissions.length
    };
  }

  /**
   * Calculate derived statistics for categories
   */
  static calculateCategoryStats(
    category: OfflineCategory,
    questions: OfflineQuestion[]
  ): OfflineCategory {
    const categoryQuestions = questions.filter(question => question.category_id === category.category_id);

    return {
      ...category,
      question_count: categoryQuestions.length
    };
  }
} 