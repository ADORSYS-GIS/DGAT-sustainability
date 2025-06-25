import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { FeatureCard } from "@/components/FeatureCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  CheckSquare,
  Download,
  History,
  Star,
  FileText,
} from "lucide-react";
import {
  getAssessmentsByUser,
  getRecommendationsByAssessment,
} from "@/services/dataService";
import { Assessment } from "@/services/indexedDB";
import jsPDF from "jspdf";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadUserAssessments();
    }
  }, [user]);

  const loadUserAssessments = async () => {
    try {
      const userAssessments = await getAssessmentsByUser(user!.id);
      setAssessments(userAssessments.slice(0, 3)); // Show only recent 3
    } catch (error) {
      console.error("Error loading assessments:", error);
    }
  };

  const dashboardActions = [
    {
      title: "Start Sustainability Assessment",
      description:
        "Assess environmental, social, and governance practices for sustainable growth.",
      icon: Leaf,
      color: "green" as const,
      onClick: () => (window.location.href = "/assessment/sustainability"),
    },
    {
      title: "View Assessments",
      description:
        "View all your assessments, drafts, and completed submissions with recommendations.",
      icon: FileText,
      color: "blue" as const,
      onClick: () => (window.location.href = "/assessments"),
    },
    {
      title: "Action Plan",
      description:
        "Track your progress with interactive tasks and recommendations using our Kanban board.",
      icon: CheckSquare,
      color: "blue" as const,
      onClick: () => (window.location.href = "/action-plan"),
    },
  ];

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

  const handleExportAllPDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Recent Sustainability Assessments", 10, 15);
    doc.setFontSize(12);
    let y = 30;
    for (let idx = 0; idx < assessments.length; idx++) {
      const assessment = assessments[idx];
      doc.text(`Assessment #${idx + 1}`, 10, y);
      y += 8;
      doc.text(`ID: ${assessment.assessmentId}`, 12, y);
      y += 8;
      doc.text(`Organization: ${user?.organizationName || ""}`, 12, y);
      y += 8;
      doc.text(`User: ${user?.firstName || ""} ${user?.lastName || ""}`, 12, y);
      y += 8;
      doc.text(
        `Date: ${new Date(assessment.createdAt).toLocaleDateString()}`,
        12,
        y,
      );
      y += 8;
      doc.text(`Score: ${assessment.score ?? "N/A"}%`, 12, y);
      y += 8;
      doc.text(`Status: ${formatStatus(assessment.status)}`, 12, y);
      y += 8;
      // Fetch recommendations for this assessment
      const recommendations = await getRecommendationsByAssessment(
        assessment.assessmentId,
      );
      if (recommendations.length > 0) {
        doc.text("Recommendations:", 12, y);
        y += 8;
        recommendations.forEach((rec, recIdx) => {
          const recText = rec.text?.en || "";
          doc.text(`- ${recText}`, 14, y);
          y += 8;
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
      } else {
        doc.text("No recommendations.", 12, y);
        y += 8;
      }
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
    doc.save("recent-assessments.pdf");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <Star className="w-8 h-8 text-dgrv-green" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                Welcome, {user?.organizationName || user?.firstName}!
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              Ready to continue your cooperative's sustainability journey?
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {dashboardActions.map((action, index) => (
              <div
                key={action.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <FeatureCard {...action} />
              </div>
            ))}
          </div>

          {/* Dashboard Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Assessments */}
            <Card className="lg:col-span-2 animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-dgrv-blue" />
                  <span>Recent Assessments</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/assessments")}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.assessmentId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-full bg-gray-100">
                          <Leaf className="w-5 h-5 text-dgrv-green" />
                        </div>
                        <div>
                          <h3 className="font-medium">
                            Sustainability Assessment
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(
                              assessment.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {assessment.score && (
                          <span className="text-sm font-medium">
                            Score: {assessment.score}%
                          </span>
                        )}
                        <Badge className={getStatusColor(assessment.status)}>
                          {formatStatus(assessment.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {assessments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>
                        No assessments yet. Start your first assessment above!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Sidebar */}
            <div className="space-y-6">
              <Card
                className="animate-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="w-5 h-5 text-dgrv-blue" />
                    <span>Export Reports</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Download your assessment reports in various formats.
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleExportAllPDF}
                    >
                      Export as PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      Export as Word
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      Export as CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="animate-fade-in"
                style={{ animationDelay: "300ms" }}
              >
                <CardHeader>
                  <CardTitle className="text-dgrv-green">Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Get support and training materials to make the most of your
                    assessments.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    View User Guide
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
