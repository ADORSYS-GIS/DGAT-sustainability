import { Navbar } from "@/components/shared/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/shared/useAuth";
// TODO: Replace with org-scoped assessment listing endpoint when available
import { useAssessmentsServiceGetAssessments } from "@/openapi-rq/queries/queries";
import { useResponsesServiceGetAssessmentsByAssessmentIdResponses } from "@/openapi-rq/queries/queries";
import type { Assessment } from "@/openapi-rq/requests/types.gen";
import { Calendar, Download, Eye, FileText, Star } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";

// Extend Assessment type to include status for local use
type AssessmentWithStatus = Assessment & { status?: string };

export const Assessments: React.FC = () => {
  const { user } = useAuth();
  // Helper to get org_id from token
  const orgId = React.useMemo(() => {
    if (!user || !user.organizations) return "";
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length === 0) return "";
    const orgObj = user.organizations[orgKeys[0]] || {};
    return orgObj.id || "";
  }, [user]);

  const { data, isLoading } = useAssessmentsServiceGetAssessments();
  const assessments: AssessmentWithStatus[] = data?.assessments || [];
  const navigate = useNavigate();

  // Helper to count unique categories completed and total for an assessment
  const useCategoryCounts = (assessmentId: string) => {
    // Fetch responses for this assessment
    const { data: responsesData } =
      useResponsesServiceGetAssessmentsByAssessmentIdResponses({
        assessmentId,
      });
    // Count unique categories answered
    const completed = React.useMemo(() => {
      if (!responsesData?.responses) return 0;
      const categories = new Set<string>();
      for (const resp of responsesData.responses) {
        // Assume question_revision_id encodes category, or fetch category if available
        // For now, just count unique question_revision_id as a proxy
        categories.add(resp.question_revision_id);
      }
      return categories.size;
    }, [responsesData]);
    // For total, you may need to fetch questions for the assessment
    // For now, just return completed as total (placeholder)
    const total = completed;
    return { completed, total };
  };

  // Placeholder: If you want to show status, you may need to fetch submissions separately
  const getStatusColor = (_status: string) => "bg-gray-500 text-white";
  const formatStatus = (_status: string) => "-";

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

  // Child component to render each assessment card and use hooks safely
  const AssessmentCard: React.FC<{
    assessment: AssessmentWithStatus;
    user: any;
    navigate: any;
    index: number;
  }> = ({ assessment, user, navigate, index }) => {
    const { completed, total } = useCategoryCounts(assessment.assessment_id);
    return (
      <Card
        key={assessment.assessment_id}
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
                  Sustainability Assessment
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Created:{" "}
                      {assessment.created_at
                        ? new Date(assessment.created_at).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </CardTitle>
            <div className="flex items-center space-x-3">
              <Badge
                className={
                  assessment.status === "submitted"
                    ? "bg-dgrv-green text-white"
                    : "bg-gray-500 text-white"
                }
              >
                {assessment.status
                  ? assessment.status.charAt(0).toUpperCase() +
                    assessment.status.slice(1)
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
              {user?.roles?.includes("org_admin") ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(`/submission-view/${assessment.assessment_id}`)
                  }
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              ) : assessment.status === "submitted" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(`/submission-view/${assessment.assessment_id}`)
                  }
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Submission
                </Button>
              ) : null}
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
              {user?.roles?.includes("org_admin") &&
                user?.organizations &&
                Object.keys(user.organizations).length > 0 && (
                  <Button
                    onClick={() => navigate("/assessment/sustainability")}
                    className="bg-dgrv-green hover:bg-green-700"
                  >
                    Start New Assessment
                  </Button>
                )}
            </div>
          </div>

          <div className="grid gap-6">
            {assessments
              .filter((a) => a.status === "submitted")
              .map((assessment, index) => (
                <AssessmentCard
                  key={assessment.assessment_id}
                  assessment={assessment}
                  user={user}
                  navigate={navigate}
                  index={index}
                />
              ))}

            {assessments.length === 0 && (
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
                  {user?.organizations &&
                    Object.keys(user.organizations).length > 0 && (
                      <Button
                        onClick={() => navigate("/assessment/sustainability")}
                        className="bg-dgrv-green hover:bg-green-700"
                      >
                        Start Assessment
                      </Button>
                    )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
