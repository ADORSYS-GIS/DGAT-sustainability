import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { AssessmentList as AssessmentListComponent } from "@/components/shared/AssessmentList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOfflineAssessments } from "../../hooks/useOfflineApi";
import { toast } from "sonner";
import { ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import { useTranslation } from "react-i18next";

export const AssessmentList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: assessmentsData, isLoading: assessmentsLoading } = useOfflineAssessments();

  // Filter assessments by organization and status for Org_User
  const availableAssessments = React.useMemo(() => {
    if (!assessmentsData?.assessments || !user?.organizations) {
      return [];
    }
    
    // Get the user's organization ID
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length === 0) {
      return [];
    }
    
    const orgData = (user.organizations as Record<string, { id: string; categories: string[] }>)[orgKeys[0]];
    const organizationId = orgData?.id;
    
    if (!organizationId) {
      return [];
    }
    
    // Filter by organization and status - show draft assessments for Org_User
    const filtered = assessmentsData.assessments.filter((assessment) => {
      const assessmentData = assessment as unknown as { 
        assessment_id?: string;
        status: string; 
        organization_id?: string;
        org_id?: string;
      };
      
      const isDraft = assessmentData.status === "draft";
      // Check both org_id and organization_id fields
      const isInOrganization = assessmentData.organization_id === organizationId || 
                              assessmentData.org_id === organizationId;
      
      return isDraft && isInOrganization;
    });
    
    return filtered;
  }, [assessmentsData?.assessments, user?.organizations]);

  // Handle assessment selection
  const handleSelectAssessment = (selectedAssessmentId: string) => {
    navigate(`/user/assessment/${selectedAssessmentId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="mb-4 flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("backToDashboard", { defaultValue: "Back to Dashboard" })}</span>
            </Button>
            
            <h1 className="text-3xl font-bold text-dgrv-blue mb-4">
              {t('assessment.selectAssessmentToAnswer', { defaultValue: 'Select Assessment to Answer' })}
            </h1>
            <p className="text-lg text-gray-600">
              {t('assessment.selectAssessmentDescription', { defaultValue: 'Choose an assessment to answer the questions.' })}
            </p>
          </div>

          {availableAssessments.length === 0 && !assessmentsLoading ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {t("assessment.noAssessmentsAvailable", { defaultValue: "No Assessments Available" })}
                </h2>
                <p className="text-gray-600 mb-4">
                  {t("assessment.noAssessmentsDescription", {
                    defaultValue: "No draft assessments are available for you to answer. Please contact your organization administrator to create an assessment.",
                  })}
                </p>
                <Button onClick={() => navigate("/dashboard")}>
                  {t("assessment.backToDashboard", { defaultValue: "Back to Dashboard" })}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <AssessmentListComponent
              assessments={availableAssessments}
              onSelectAssessment={handleSelectAssessment}
              isLoading={assessmentsLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}; 