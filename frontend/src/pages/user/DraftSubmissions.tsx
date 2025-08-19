import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOfflineDraftSubmissions } from "@/hooks/useOfflineApi";
import { useOfflineAssessmentsMutation } from "@/hooks/useOfflineApi";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, Eye } from "lucide-react";

export default function DraftSubmissions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: draftSubmissionsData, isLoading, error, refetch } = useOfflineDraftSubmissions();
  const { approveAssessment, isPending } = useOfflineAssessmentsMutation();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApprove = async (assessmentId: string) => {
    setApprovingId(assessmentId);
    try {
      await approveAssessment(assessmentId, {
        onSuccess: () => {
          toast.success(t("user.draftSubmissions.approvedSuccessfully", { 
            defaultValue: "Assessment approved successfully!" 
          }));
          refetch();
        },
        onError: () => {
          toast.error(t("user.draftSubmissions.failedToApprove", { 
            defaultValue: "Failed to approve assessment." 
          }));
        },
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleView = (assessmentId: string) => {
    navigate(`/user/assessment/${assessmentId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">{t("common.loading", { defaultValue: "Loading..." })}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">
            {t("common.error", { defaultValue: "Error loading draft submissions" })}
          </div>
        </div>
      </div>
    );
  }

  const draftSubmissions = draftSubmissionsData?.draft_submissions || [];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {t("user.draftSubmissions.title", { defaultValue: "Draft Submissions" })}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("user.draftSubmissions.description", { 
            defaultValue: "Review and approve draft assessments submitted by organization users." 
          })}
        </p>
      </div>

      {draftSubmissions.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">
                {t("user.draftSubmissions.noDrafts", { 
                  defaultValue: "No draft submissions pending approval." 
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {draftSubmissions.map((submission: unknown) => {
            const typedSubmission = submission as {
              submission_id: string;
              assessment_id: string;
              user_id: string;
              submitted_at: string;
            };
            return (
              <Card key={typedSubmission.submission_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {t("user.draftSubmissions.assessment", { 
                          defaultValue: "Assessment" 
                        })} #{typedSubmission.assessment_id.slice(0, 8)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t("user.draftSubmissions.submittedBy", { 
                          defaultValue: "Submitted by" 
                        })}: {typedSubmission.user_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("user.draftSubmissions.submittedAt", { 
                          defaultValue: "Submitted at" 
                        })}: {new Date(typedSubmission.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {t("user.draftSubmissions.pendingApproval", { 
                        defaultValue: "Pending Approval" 
                      })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(typedSubmission.assessment_id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t("user.draftSubmissions.view", { defaultValue: "View" })}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(typedSubmission.assessment_id)}
                      disabled={isPending || approvingId === typedSubmission.assessment_id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {approvingId === typedSubmission.assessment_id
                        ? t("user.draftSubmissions.approving", { defaultValue: "Approving..." })
                        : t("user.draftSubmissions.approve", { defaultValue: "Approve" })
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
