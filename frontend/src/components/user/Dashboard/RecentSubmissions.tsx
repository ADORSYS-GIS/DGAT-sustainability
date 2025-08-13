/*
 * Displays recent submissions card with loading states and submission list
 * Shows submission status badges and handles view all navigation
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Leaf } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Submission } from "@/openapi-rq/requests/types.gen";

interface RecentSubmissionsProps {
  submissions: Submission[];
  isLoading: boolean;
  onViewAll: () => void;
  getStatusColor: (status: string) => string;
  formatStatus: (status: string) => string;
}

export const RecentSubmissions: React.FC<RecentSubmissionsProps> = ({
  submissions,
  isLoading,
  onViewAll,
  getStatusColor,
  formatStatus,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="lg:col-span-2 animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <History className="w-5 h-5 text-dgrv-blue" />
          <span>{t('user.dashboard.recentSubmissions')}</span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewAll}
        >
          {t('user.dashboard.viewAll')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('user.dashboard.loadingSubmissionsInline')}</p>
            </div>
          ) : (
            submissions.map((submission) => (
              <div
                key={submission.submission_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-full bg-gray-100">
                    <Leaf className="w-5 h-5 text-dgrv-green" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {t('user.dashboard.sustainabilityAssessment')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(
                        submission.submitted_at,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    className={getStatusColor(submission.review_status)}
                  >
                    {formatStatus(submission.review_status)}
                  </Badge>
                </div>
              </div>
            ))
          )}
          {submissions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>
                {t('user.dashboard.noSubmissions')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 