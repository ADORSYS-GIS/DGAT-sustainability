import { Navbar } from "@/components/shared/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/shared/useAuth";
// TODO: Replace with org-scoped assessment listing endpoint when available
import { useSubmissionsServiceGetSubmissions } from "@/openapi-rq/queries/queries";
import { useSyncStatus } from "@/hooks/shared/useSyncStatus";
import { offlineDB } from "@/services/indexeddb";
import { useResponsesServiceGetAssessmentsByAssessmentIdResponses } from "@/openapi-rq/queries/queries";
import type { Assessment } from "@/openapi-rq/requests/types.gen";
import type { Submission } from "../../openapi-rq/requests/types.gen";
import { Calendar, Download, Eye, FileText, Star } from "lucide-react";
import * as React from "react";
import { useNavigate, NavigateFunction } from "react-router-dom";
import { useState, useEffect } from "react";

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
  const { user } = useAuth();
  const { isOnline } = useSyncStatus();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all submissions for the current user/org
  const { data, isLoading: remoteLoading } = useSubmissionsServiceGetSubmissions();
  const submissions = data?.submissions || [];

  useEffect(() => {
    setIsLoading(remoteLoading);
  }, [remoteLoading]);

  // Helper to count unique categories completed and total for a submission
  // (You may want to update this logic based on your actual submission structure)
  const useCategoryCounts = (submission: Submission) => {
    // If your submission includes responses, you can count them here
    const completed = submission?.content?.responses?.length || 0;
    // For total, you may need to fetch questions for the assessment
    // For now, just return completed as total (placeholder)
    const total = completed;
    return { completed, total };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
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
    const { completed, total } = useCategoryCounts(submission);
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
                  Sustainability Assessment Submission
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : "-"}
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
                    : "bg-gray-500 text-white"
                }
              >
                {submission.review_status
                  ? submission.review_status.charAt(0).toUpperCase() +
                    submission.review_status.slice(1)
                  : "-"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>
                Categories Completed: {completed}/{total}
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
                View Submission
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

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    Your Submissions
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  View and manage all your sustainability submissions
                </p>
              </div>
            </div>
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
                    No submissions yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Start your first sustainability assessment to track your
                    cooperative's progress.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
