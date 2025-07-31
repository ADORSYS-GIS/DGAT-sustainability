import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineSubmissions } from "@/hooks/useOfflineApi";
import { offlineDB } from "@/services/indexeddb";
import type { Assessment } from "@/openapi-rq/requests/types.gen";
import type { Submission } from "@/openapi-rq/requests/types.gen";
import { Calendar, Eye, FileText, RefreshCw } from "lucide-react";
import * as React from "react";
import { useNavigate, NavigateFunction } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { syncService } from "@/services/syncService";
import { Navbar } from "@/components/shared/Navbar";

type AuthUser = {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  roles?: string[];
  organizations?: Record<string, unknown>;
  realm_access?: { roles?: string[] };
  organisation_name?: string;
  organisation?: string;
};

// Extend Assessment type to include status for local use
type AssessmentWithStatus = Assessment & { status?: string };

export const Assessments: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all submissions for the current user/org
  const { data, isLoading: remoteLoading, refetch } = useOfflineSubmissions();
  const submissions = data?.submissions || [];

  useEffect(() => {
    setIsLoading(remoteLoading);
  }, [remoteLoading]);

  // Helper function to count unique categories completed and total for a submission
  const getCategoryCounts = (submission: Submission) => {
    try {
      // Extract responses from submission content
      const responses = submission?.content?.responses || [];
      const completed = responses.length;
      
      // For total categories, we need to get the assessment details
      // For now, we'll use a reasonable estimate or fetch from assessment
      const total = completed > 0 ? Math.max(completed, 3) : 0; // Default to at least 3 categories
      
      return { completed, total };
    } catch (error) {
      console.warn('Error calculating category counts:', error);
      return { completed: 0, total: 0 };
    }
  };

  // Manual sync function
  const handleManualSync = async () => {
    try {
      toast.info("Syncing data with server...");
      await syncService.performFullSync();
      await refetch(); // Refresh the submissions list
      toast.success("Sync completed successfully");
    } catch (error) {
      console.error("Manual sync failed:", error);
      toast.error("Sync failed. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  // Card for each submission
  const SubmissionCard: React.FC<{
    submission: Submission;
    user: AuthUser | null;
    navigate: NavigateFunction;
    index: number;
  }> = ({ submission, user, navigate, index }) => {
    const { completed, total } = getCategoryCounts(submission);
    
    return (
      <Card
        key={submission.submission_id}
        className="animate-fade-in"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-dgrv-green/10">
                <FileText className="w-5 h-5 text-dgrv-green" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t("sustainability")} {t("assessment")} {t("submission", { defaultValue: "Submission" })}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {t("submittedAt")}: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </CardTitle>
            <div className="flex items-center space-x-3">
              <Badge
                className={
                  submission.review_status === "approved"
                    ? "bg-dgrv-green text-white"
                    : submission.review_status === "rejected"
                    ? "bg-red-500 text-white"
                    : submission.review_status === "under_review"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-500 text-white"
                }
              >
                {submission.review_status
                  ? submission.review_status.charAt(0).toUpperCase() +
                    submission.review_status.slice(1).replace('_', ' ')
                  : "-"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>
                {t("category")} {t("completed", { defaultValue: "Completed" })}: {completed}/{total}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(`/submission-view/${submission.submission_id}`)
                }
              >
                <Eye className="w-4 h-4 mr-1" />
                {t("viewSubmission")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                {t("yourSubmissions", { defaultValue: "Your Submissions" })}
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              {t("dashboard.assessments.subtitle", { defaultValue: "View and manage all your sustainability submissions" })}
            </p>
          </div>
          <Button onClick={handleManualSync} className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            {t("syncData", { defaultValue: "Sync Data" })}
          </Button>
        </div>

        <div className="grid gap-6">
          {submissions.map((submission: Submission, index) => (
            <SubmissionCard
              key={submission.submission_id}
              submission={submission}
              user={user}
              navigate={navigate}
              index={index}
            />
          ))}

          {submissions.length === 0 && !isLoading && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("noSubmissions", { defaultValue: "No Submissions" })}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t("dashboard.assessments.emptyState", { defaultValue: "Start your first sustainability assessment to track your cooperative's progress." })}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
