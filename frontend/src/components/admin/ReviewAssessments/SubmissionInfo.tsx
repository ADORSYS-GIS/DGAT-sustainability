/*
 * Submission info component for review dialog
 * Displays submission details including organization, date, and status
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminSubmissionDetail } from '@/openapi-rq/requests/types.gen';

interface SubmissionInfoProps {
  selectedSubmission: AdminSubmissionDetail;
  getStatusBadge: (status: string) => { variant: string; className: string; text: string };
}

export const SubmissionInfo: React.FC<SubmissionInfoProps> = ({
  selectedSubmission,
  getStatusBadge,
}) => {
  const { t } = useTranslation();
  const statusBadge = getStatusBadge(selectedSubmission.review_status);

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <FileText className="w-5 h-5 text-blue-600" />
          <span>{t('reviewAssessments.submissionDetails', { defaultValue: 'Submission Details' })}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-lg border">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('reviewAssessments.organization', { defaultValue: 'Organization' })}
            </label>
            <p className="text-sm font-mono text-gray-900 mt-1">
              {selectedSubmission.org_name || selectedSubmission.submission_id}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('reviewAssessments.organization', { defaultValue: 'Organization' })}
            </label>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {selectedSubmission.org_name || t('reviewAssessments.unknown', { defaultValue: 'Unknown' })}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('reviewAssessments.submissionDate', { defaultValue: 'Submission Date' })}
            </label>
            <p className="text-sm text-gray-900 mt-1">
              {selectedSubmission.submitted_at 
                ? new Date(selectedSubmission.submitted_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : t('reviewAssessments.unknown', { defaultValue: 'Unknown' })
              }
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="bg-white p-3 rounded-lg border">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('reviewAssessments.status', { defaultValue: 'Status' })}
            </label>
            <div className="mt-1">
              <Badge variant={statusBadge.variant as any} className={statusBadge.className}>
                {statusBadge.text}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 