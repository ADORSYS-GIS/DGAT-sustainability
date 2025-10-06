import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useOfflineDraftSubmissions } from "@/hooks/useOfflineApi";
import { useOfflineAssessmentsMutation } from "@/hooks/useOfflineApi";
import { toast } from "sonner";
import { 
  Clock, 
  CheckCircle, 
  Eye, 
  ArrowLeft, 
  Building2, 
  Calendar,
  FileText,
  Users,
  TrendingUp
} from "lucide-react";
import type { Submission_content_responses } from "@/openapi-rq/requests/types.gen";

// Locally extend the type to include question_category and question_text
interface SubmissionResponseWithCategory extends Submission_content_responses {
  question_category?: string;
  question_text?: string;
}

interface DraftSubmission {
  submission_id: string;
  assessment_id: string;
  assessment_name: string; // Added assessment_name
  org_id: string;
  org_name: string;
  content: {
    assessment: {
      assessment_id: string;
      language: string;
    };
    responses: SubmissionResponseWithCategory[];
  };
  review_status: string;
  submitted_at: string;
  reviewed_at: string | null;
}

export default function DraftSubmissions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: draftSubmissionsData, isLoading, error, refetch } = useOfflineDraftSubmissions();
  const { approveAssessment, isPending } = useOfflineAssessmentsMutation();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<DraftSubmission | null>(null);

  const handleApprove = async (assessmentId: string) => {
    setApprovingId(assessmentId);
    try {
      console.log('🔍 handleApprove: Starting approval for assessmentId:', assessmentId);
      await approveAssessment(assessmentId, {
        onSuccess: (result) => {
          console.log('🔍 handleApprove: onSuccess called with result:', result);
          toast.success(t("user.draftSubmissions.approvedSuccessfully", { 
            defaultValue: "Assessment approved successfully!" 
          }));
          // Navigate back to dashboard after successful approval
          setTimeout(() => {
            console.log('🔍 handleApprove: Navigating to dashboard');
            navigate("/user/dashboard");
          }, 1500);
        },
        onError: (error) => {
          console.log('🔍 handleApprove: onError called with error:', error);
          toast.error(t("user.draftSubmissions.failedToApprove", { 
            defaultValue: "Failed to approve assessment." 
          }));
        },
      });
    } catch (error) {
      console.log('🔍 handleApprove: Caught error:', error);
      toast.error(t("user.draftSubmissions.failedToApprove", { 
        defaultValue: "Failed to approve assessment." 
      }));
    } finally {
      setApprovingId(null);
    }
  };

  const handleViewDetails = (submission: DraftSubmission) => {
    setSelectedSubmission(submission);
  };

  const handleBackToList = () => {
    setSelectedSubmission(null);
  };

  // Helper to parse and display the answer
  const renderReadOnlyAnswer = (response: SubmissionResponseWithCategory) => {
    let answer: Record<string, unknown> | string | undefined = undefined;
    try {
      if (response?.response) {
        let parsed: unknown = undefined;
        if (Array.isArray(response.response) && response.response.length > 0) {
          parsed = JSON.parse(response.response[0]);
        } else if (typeof response.response === "string") {
          let arr: unknown = undefined;
          try {
            arr = JSON.parse(response.response);
          } catch {
            arr = undefined;
          }
          if (
            Array.isArray(arr) &&
            arr.length > 0 &&
            typeof arr[0] === "string"
          ) {
            parsed = JSON.parse(arr[0]);
          } else if (typeof arr === "object" && arr !== null) {
            parsed = arr;
          } else {
            parsed = JSON.parse(response.response);
          }
        }
        if (
          typeof parsed === "string" ||
          (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
        ) {
          answer = parsed as string | Record<string, unknown>;
        } else {
          answer = undefined;
        }
      }
    } catch {
      answer = Array.isArray(response?.response)
        ? response?.response[0]
        : response?.response;
    }
    const yesNoValue =
      typeof answer === "object" && answer !== null && "yesNo" in answer
        ? (answer as { yesNo?: boolean }).yesNo
        : undefined;
    const percentageValue =
      typeof answer === "object" && answer !== null && "percentage" in answer
        ? (answer as { percentage?: number }).percentage
        : undefined;
    const textValue =
      typeof answer === "object" && answer !== null && "text" in answer
        ? (answer as { text?: string }).text
        : "";
    const files: { name?: string; url?: string }[] =
      typeof answer === "object" &&
      answer !== null &&
      Array.isArray((answer as { files?: { name?: string; url?: string }[] }).files)
        ? (answer as { files: { name?: string; url?: string }[] }).files
        : [];
    return (
      <div className="space-y-6">
        {/* Yes/No */}
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-gray-700">{t("user.draftSubmissions.yesNoResponse", { defaultValue: "Yes/No Response" })}</span>
          <div className="flex space-x-4">
            <Button
              type="button"
              variant={yesNoValue === true ? "default" : "outline"}
              className={
                yesNoValue === true
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-600/10"
              }
              tabIndex={-1}
              style={{ pointerEvents: "none", opacity: 1 }}
            >
              {t("common.yes", { defaultValue: "Yes" })}
            </Button>
            <Button
              type="button"
              variant={yesNoValue === false ? "default" : "outline"}
              className={
                yesNoValue === false
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-white text-red-500 border-red-500 hover:bg-red-500/10"
              }
              tabIndex={-1}
              style={{ pointerEvents: "none", opacity: 1 }}
            >
              {t("common.no", { defaultValue: "No" })}
            </Button>
          </div>
        </div>
        
        {/* Percentage */}
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-gray-700">{t("user.draftSubmissions.percentageResponse", { defaultValue: "Percentage Response" })}</span>
          <div className="flex space-x-2">
            {[0, 25, 50, 75, 100].map((val) => (
              <Button
                key={val}
                type="button"
                variant={percentageValue === val ? "default" : "outline"}
                className={
                  percentageValue === val
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-600 border-blue-600 hover:bg-blue-600/10"
                }
                tabIndex={-1}
                style={{ pointerEvents: "none", opacity: 1 }}
              >
                {val}%
              </Button>
            ))}
          </div>
        </div>
        
        {/* Text Input */}
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-gray-700">{t("user.draftSubmissions.textResponse", { defaultValue: "Text Response" })}</span>
          <Textarea
            value={typeof textValue === "string" ? textValue : ""}
            readOnly
            className="bg-gray-50 border border-gray-200 focus:ring-0 focus:border-blue-600 text-gray-800"
            rows={4}
            placeholder={t("user.draftSubmissions.noTextResponseProvided", { defaultValue: "No text response provided" })}
            style={{ opacity: 1 }}
          />
        </div>
        
        {/* File List */}
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-gray-700">{t("user.draftSubmissions.attachedFiles", { defaultValue: "Attached Files" })}</span>
          {files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {files.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  download={file.name}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {file.name || `File ${idx + 1}`}
                </a>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-500 italic">{t("user.draftSubmissions.noFilesAttached", { defaultValue: "No files attached" })}</span>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-lg text-gray-600">{t("user.draftSubmissions.loadingDraftSubmissions", { defaultValue: "Loading draft submissions..." })}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-lg text-red-600 mb-2">
                {t("user.draftSubmissions.errorLoadingDraftSubmissions", { defaultValue: "Error loading draft submissions" })}
              </div>
              <Button onClick={() => refetch()} variant="outline">
                {t("user.draftSubmissions.tryAgain", { defaultValue: "Try Again" })}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle both possible response structures
  const submissions = ((draftSubmissionsData as { submissions?: DraftSubmission[] })?.submissions || draftSubmissionsData?.draft_submissions || []) as DraftSubmission[];

  // If viewing a specific submission
  if (selectedSubmission) {
    const groupedByCategory: Record<string, SubmissionResponseWithCategory[]> = {};
    if (selectedSubmission.content?.responses) {
      for (const resp of selectedSubmission.content.responses) {
        const cat = resp.question_category || "Uncategorized";
        if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
        groupedByCategory[cat].push(resp);
      }
    }
    const categories = Object.keys(groupedByCategory);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleBackToList}
              className="mb-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("user.draftSubmissions.backToDraftSubmissions", { defaultValue: "Back to Draft Submissions" })}
            </Button>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedSubmission.assessment_name || t("user.draftSubmissions.assessment", { defaultValue: "Assessment" })}
                  </h1>
                  <p className="text-gray-600">
                    {t("user.draftSubmissions.reviewAndApprove", { defaultValue: "Review and approve this draft submission" })}
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className="px-3 py-1 text-sm font-medium bg-amber-100 text-amber-800 border-amber-200"
                >
                  {selectedSubmission.review_status
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </Badge>
              </div>

              {/* Submission Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedSubmission.org_name}</p>
                    <p className="text-xs text-gray-500">{t("user.draftSubmissions.organization", { defaultValue: "Organization" })}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedSubmission.submitted_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">{t("user.draftSubmissions.submitted", { defaultValue: "Submitted" })}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedSubmission.content?.responses?.length || 0} {t("user.draftSubmissions.responses", { defaultValue: "Responses" })}
                    </p>
                    <p className="text-xs text-gray-500">{t("user.draftSubmissions.questionsAnswered", { defaultValue: "Questions Answered" })}</p>
                  </div>
                </div>
              </div>

              {/* Responses */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("user.draftSubmissions.assessmentResponses", { defaultValue: "Assessment Responses" })}</h2>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <Card key={category} className="border-0 shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                        <CardTitle className="text-lg font-semibold text-blue-900 flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2" />
                          {category}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          {groupedByCategory[category].map((response, idx) => (
                            <div key={idx} className="border-l-4 border-blue-200 pl-6">
                              <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                                {response.question_text || `Question ${idx + 1}`}
                              </h3>
                              {renderReadOnlyAnswer(response)}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{t("user.draftSubmissions.noResponsesAvailable", { defaultValue: "No responses available" })}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleBackToList}
                  className="px-6"
                >
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </Button>
                <Button
                  onClick={() => handleApprove(selectedSubmission.assessment_id)}
                  disabled={isPending || approvingId === selectedSubmission.assessment_id}
                  className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {approvingId === selectedSubmission.assessment_id
                    ? t("user.draftSubmissions.approving", { defaultValue: "Approving..." })
                    : t("user.draftSubmissions.approveSubmission", { defaultValue: "Approve Submission" })
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t("user.draftSubmissions.title", { defaultValue: "Draft Submissions" })}
          </h1>
          <p className="text-lg text-gray-600">
            {t("user.draftSubmissions.description", { defaultValue: "Review and approve draft assessments submitted by organization users" })}
          </p>
        </div>

        {submissions.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {t("user.draftSubmissions.noDraftSubmissions", { defaultValue: "No Draft Submissions" })}
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                {t("user.draftSubmissions.noDraftSubmissionsDescription", { 
                  defaultValue: "There are currently no draft submissions pending approval. Check back later for new submissions." 
                })}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {submissions.map((submission) => (
              <Card key={submission.submission_id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">
                            {submission.org_name}
                          </span>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="bg-amber-100 text-amber-800 border-amber-200"
                        >
                          {submission.review_status
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>{submission.assessment_name || t("user.draftSubmissions.assessment", { defaultValue: "Assessment" })}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>{t("user.draftSubmissions.submitted", { defaultValue: "Submitted" })} {new Date(submission.submitted_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>{submission.content?.responses?.length || 0} {t("user.draftSubmissions.responses", { defaultValue: "responses" })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleViewDetails(submission)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t("user.draftSubmissions.viewDetails", { defaultValue: "View Details" })}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
