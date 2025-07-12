import { Navbar } from "@/components/shared/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubmissionsServiceGetSubmissions } from "../../openapi-rq/queries/queries";
import type { Submission } from "../../openapi-rq/requests/types.gen";
import { Calendar, Download, Eye, FileText, Star } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";

export const Assessments: React.FC = () => {
  const { data, isLoading } = useSubmissionsServiceGetSubmissions();
  const submissions: Submission[] = data?.submissions ?? [];
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-dgrv-green text-white";
      case "pending_review":
        return "bg-blue-500 text-white";
      case "under_review":
        return "bg-orange-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
      case "revision_requested":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "pending_review":
        return "Pending Review";
      case "under_review":
        return "Under Review";
      case "rejected":
        return "Rejected";
      case "revision_requested":
        return "Revision Requested";
      default:
        return "Unknown";
    }
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
              <Button
                onClick={() => navigate("/assessment/sustainability")}
                className="bg-dgrv-green hover:bg-green-700"
              >
                Start New Assessment
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {submissions.map((submission, index) => (
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
                          Sustainability Assessment
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Submitted:{" "}
                              {new Date(
                                submission.submitted_at,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          {submission.reviewed_at && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Reviewed:{" "}
                                {new Date(
                                  submission.reviewed_at,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardTitle>
                    <div className="flex items-center space-x-3">
                      <Badge
                        className={getStatusColor(submission.review_status)}
                      >
                        {formatStatus(submission.review_status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <p>Submission ID: {submission.submission_id}</p>
                      <p>Assessment ID: {submission.assessment_id}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/submission-view/${submission.submission_id}`,
                          )
                        }
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {submissions.length === 0 && (
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
                  <Button
                    onClick={() => navigate("/assessment/sustainability")}
                    className="bg-dgrv-green hover:bg-green-700"
                  >
                    Start Assessment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
