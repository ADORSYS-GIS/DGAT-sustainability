/*
 * Submissions table component for review assessments interface
 * Displays list of submissions with status badges and review actions
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminSubmissionDetail } from '@/openapi-rq/requests/types.gen';

interface SubmissionsTableProps {
  submissions: AdminSubmissionDetail[];
  onReviewSubmission: (submission: AdminSubmissionDetail) => void;
  getStatusBadge: (status: string) => { variant: string; className: string; text: string };
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  submissions,
  onReviewSubmission,
  getStatusBadge,
}) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>
            {t('reviewAssessments.submissionsUnderReview', { defaultValue: 'Submissions Under Review' })} ({submissions.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {t('reviewAssessments.noSubmissionsUnderReview', { defaultValue: 'No submissions under review' })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => {
              const statusBadge = getStatusBadge(submission.review_status);
              return (
                <div key={submission.submission_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {submission.org_name || t('reviewAssessments.unknownOrganization', { defaultValue: 'Unknown Organization' })}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('reviewAssessments.organization', { defaultValue: 'Organization' })}: {submission.org_name || t('reviewAssessments.unknown', { defaultValue: 'Unknown' })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('reviewAssessments.submitted', { defaultValue: 'Submitted' })}: {submission.submitted_at 
                          ? new Date(submission.submitted_at).toLocaleDateString()
                          : t('reviewAssessments.unknown', { defaultValue: 'Unknown' })
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div>
                        <Badge variant={statusBadge.variant as any} className={statusBadge.className}>
                          {statusBadge.text}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onReviewSubmission(submission)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>{t('reviewAssessments.review', { defaultValue: 'Review' })}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 