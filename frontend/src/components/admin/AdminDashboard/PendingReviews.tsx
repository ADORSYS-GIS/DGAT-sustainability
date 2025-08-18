/*
 * Pending reviews display component for admin dashboard
 * Shows list of assessments awaiting review with status indicators
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Star, CheckSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface PendingReview {
  id: string;
  organization: string;
  type: string;
  submittedAt: string;
  reviewStatus: string;
}

interface PendingReviewsProps {
  reviews: PendingReview[];
  count: number;
  isLoading: boolean;
}

export const PendingReviews: React.FC<PendingReviewsProps> = ({
  reviews,
  count,
  isLoading,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="lg:col-span-2 animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <span>{t("adminDashboard.pendingReviewsCard")}</span>
        </CardTitle>
        <Badge className="bg-orange-500 text-white">
          {isLoading ? (
            <div className="flex items-center space-x-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
              <span>...</span>
            </div>
          ) : (
            `${count} ${t("adminDashboard.pendingCount", { count })}`
          )}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
              <p className="text-gray-600">
                {t("adminDashboard.loadingSubmissions", {
                  defaultValue: "Loading submissions...",
                })}
              </p>
            </div>
          ) : (
            <>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/admin/reviews`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-gray-100">
                      <Star className="w-5 h-5 text-dgrv-green" />
                    </div>
                    <div>
                      <h3 className="font-medium">Sustainability Assessment</h3>
                      <p className="text-sm text-gray-600">
                        {review.organization}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {review.submittedAt}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {review.reviewStatus === "under_review"
                        ? t("adminDashboard.underReview")
                        : t("adminDashboard.reviewRequired")}
                    </Badge>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t("adminDashboard.allUpToDate")}</p>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
