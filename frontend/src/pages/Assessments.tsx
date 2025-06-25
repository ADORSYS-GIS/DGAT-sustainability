import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Assessment } from "@/services/indexedDB";
import { getAssessmentsByUser } from "@/services/dataService";
import { FileText, Calendar, Star, Download, Eye } from "lucide-react";

export const Assessments: React.FC = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadAssessments();
    }
  }, [user]);

  const loadAssessments = async () => {
    try {
      const userAssessments = await getAssessmentsByUser(user!.id);
      setAssessments(
        userAssessments.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    } catch (error) {
      console.error("Error loading assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-dgrv-green text-white";
      case "submitted":
        return "bg-blue-500 text-white";
      case "under_review":
        return "bg-orange-500 text-white";
      case "draft":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "submitted":
        return "Submitted";
      case "under_review":
        return "Under Review";
      case "draft":
        return "Draft";
      default:
        return "Unknown";
    }
  };

  if (loading) {
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
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    Your Assessments
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  View and manage all your sustainability assessments
                </p>
              </div>
              <Button
                onClick={() =>
                  (window.location.href = "/assessment/sustainability")
                }
                className="bg-dgrv-green hover:bg-green-700"
              >
                Start New Assessment
              </Button>
            </div>
          </div>

          {/* Assessments Grid */}
          <div className="grid gap-6">
            {assessments.map((assessment, index) => (
              <Card
                key={assessment.assessmentId}
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
                              {new Date(
                                assessment.createdAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          {assessment.submittedAt && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Submitted:{" "}
                                {new Date(
                                  assessment.submittedAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardTitle>
                    <div className="flex items-center space-x-3">
                      {assessment.score && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">
                            {assessment.score}%
                          </span>
                        </div>
                      )}
                      <Badge className={getStatusColor(assessment.status)}>
                        {formatStatus(assessment.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <p>Organization: {user?.organizationName}</p>
                      {assessment.categoryScores && (
                        <p>
                          Categories completed:{" "}
                          {Object.keys(assessment.categoryScores).length}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {assessment.status === "draft" ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            (window.location.href =
                              "/assessment/sustainability")
                          }
                          className="bg-dgrv-blue hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Continue
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            (window.location.href = `/assessment-view/${assessment.assessmentId}`)
                          }
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      )}
                      {assessment.status === "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-dgrv-green border-dgrv-green hover:bg-green-50"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {assessments.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No assessments yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Start your first sustainability assessment to track your
                    cooperative's progress.
                  </p>
                  <Button
                    onClick={() =>
                      (window.location.href = "/assessment/sustainability")
                    }
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
