import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useOfflineDraftSubmissions, useOfflineDraftSubmissionsMutation } from "@/hooks/useOfflineDraftSubmissions";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSync";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import {
  Clock,
  CheckCircle,
  Eye,
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Users,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import type { Submission_content_responses } from "@/openapi-rq/requests/types.gen";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import { useOfflineCategoryCatalogs } from "@/hooks/useCategoryCatalogs";
import type { OfflineCategoryCatalog } from "@/types/offline";

// Locally extend the type to include question_category and question_text
interface SubmissionResponseWithCategory extends Submission_content_responses {
  question_category?: string;
  question_text?: string;
  question_revision_id?: string;
  questionRevisionId?: string;
}

interface DraftSubmission {
  submission_id: string;
  assessment_id: string;
  assessment_name: string; // Added assessment_name
  org_id?: string;
  org_name?: string;
  content?: {
    assessment?: {
      assessment_id?: string;
      language?: string;
    };
    responses?: SubmissionResponseWithCategory[];
  };
  review_status: string;
  submitted_at: string;
  reviewed_at?: string | null;
}

export default function DraftSubmissions() {
  const { t, i18n } = useTranslation();
  const currentLanguage = localStorage.getItem("i18n_language") || i18n.language || "en";
  const navigate = useNavigate();
  const { data: draftSubmissions, isLoading, error, refetch } = useOfflineDraftSubmissions();
  const { data: questionsData } = useOfflineQuestions();
  const { data: categoriesData } = useOfflineCategoryCatalogs();
  const { approveDraftSubmission } = useOfflineDraftSubmissionsMutation();
  const { isOnline } = useOfflineSyncStatus();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<DraftSubmission | null>(null);

  /** Reusable amber offline notice */
  const offlineBanner = !isOnline ? (
    <div className="flex items-center gap-2 px-4 py-3 mb-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
      <WifiOff className="w-4 h-4 shrink-0" />
      You are offline — viewing cached data. Changes will sync when you reconnect.
    </div>
  ) : null;

  // Handle both possible response structures
  const submissions = (draftSubmissions?.draft_submissions || []) as unknown as DraftSubmission[];

  const categoryCatalogMap = React.useMemo(() => {
    if (!categoriesData) return new Map<string, OfflineCategoryCatalog>();
    const map = new Map<string, OfflineCategoryCatalog>();
    categoriesData.forEach(c => {
      map.set(c.category_catalog_id, c as OfflineCategoryCatalog);
    });
    return map;
  }, [categoriesData]);

  const categoryNameToIdMap = React.useMemo(() => {
    if (!categoriesData) return new Map<string, string>();
    const map = new Map<string, string>();
    categoriesData.forEach(c => {
      map.set(c.name.toLowerCase(), c.category_catalog_id);
      const translations = (c as any).name_translations as Record<string, string> | undefined;
      if (translations) {
        Object.values(translations).forEach(name => {
          if (name) map.set(name.toLowerCase(), c.category_catalog_id);
        });
      }
    });
    return map;
  }, [categoriesData]);

  const getCategoryDisplayName = (rawNameOrId: string, language: string) => {
    if (!rawNameOrId || rawNameOrId.toLowerCase() === 'uncategorized' || rawNameOrId.toLowerCase().includes('unknown')) return rawNameOrId;
    const catalog = categoryCatalogMap.get(rawNameOrId);
    if (catalog) {
      const translations = (catalog as any).name_translations as Record<string, string> | undefined;
      return translations?.[language] || catalog.name;
    }
    const id = categoryNameToIdMap.get(rawNameOrId.toLowerCase());
    if (id) {
      const byId = categoryCatalogMap.get(id);
      if (byId) {
        const translations = (byId as any).name_translations as Record<string, string> | undefined;
        return translations?.[language] || byId.name;
      }
    }
    return rawNameOrId;
  };

  const qRevToCategoryMap = React.useMemo(() => {
    const catMap = new Map<string, string>();

    // Create a mapping from category_id to category name
    const categoryIdToName = new Map<string, string>();
    const categoryNameToId = new Map<string, string>();
    if (categoriesData) {
      categoriesData.forEach((cat: { category_catalog_id: string; name: string }) => {
        categoryIdToName.set(cat.category_catalog_id, cat.name);
        categoryNameToId.set(cat.name.toLowerCase(), cat.category_catalog_id);
      });
    }

    if (questionsData) {
      questionsData.forEach(q => {
        if (q.latest_revision) {
          const revId = q.latest_revision.question_revision_id;

          let catName = 'Uncategorized';
          const qCat = q.category || q.category_id;
          if (qCat) {
            if (categoryIdToName.has(qCat)) {
              catName = categoryIdToName.get(qCat)!;
            } else if (categoryNameToId.has(qCat.toLowerCase())) {
              catName = categoryIdToName.get(categoryNameToId.get(qCat.toLowerCase())!) || qCat;
            } else {
              catName = qCat;
            }
          }
          catMap.set(revId, catName);
        }
      });
    }
    return catMap;
  }, [questionsData, categoriesData]);

  const questionsTextMap = React.useMemo(() => {
    if (!questionsData) return new Map<string, Record<string, string>>();
    const map = new Map<string, Record<string, string>>();
    questionsData.forEach(q => {
      if (q.latest_revision) {
        const revId = q.latest_revision.question_revision_id;
        const qText = q.latest_revision.text;
        const textRecord: Record<string, string> = typeof qText === 'string' ? { en: qText } : (qText as Record<string, string>) || {};
        map.set(revId, textRecord);
      }
    });
    return map;
  }, [questionsData]);

  const assessmentNameMap = React.useMemo(() => {
    const nameMap = new Map<string, string>();
    // If we have assessments in the draftSubmissions or separately, we could build a map
    // But better to rely on what useOfflineDraftSubmissions already did or do a final fallback here
    return nameMap;
  }, []);

  const enrichedSubmissions = React.useMemo(() => {
    return submissions.map(sub => {
      if (!sub.assessment_name || sub.assessment_name === 'Unknown Assessment') {
        // Try to find it in the local assessments store if possible
        // Note: Since this is a hook-less memo, we can't call await offlineDB.
        // The hook already does this, but if it failed, we're stuck here.
        // We'll trust the hook's attempt but ensure we don't crash.
      }
      return sub;
    });
  }, [submissions]);

  const handleApprove = (submissionId: string) => {
    setApprovingId(submissionId);
    approveDraftSubmission.mutate(submissionId, {
      onSuccess: () => {
        console.log("Mutation successful for submission:", submissionId);
        toast.success(t("user.draftSubmissions.approvedOfflineSuccessfully", {
          defaultValue: "Successfully approved, will sync when you come back online"
        }));
        // The query invalidation will remove the item from the list.
        // Reset the selected submission and navigate back to the dashboard.
        setSelectedSubmission(null);
        navigate("/user/dashboard");
      },
      onError: (error) => {
        console.error("Mutation failed for submission:", submissionId, error);
        toast.error(t("user.draftSubmissions.failedToApprove", {
          defaultValue: "Failed to approve assessment."
        }));
      },
      onSettled: () => {
        console.log("Mutation settled for submission:", submissionId);
        setApprovingId(null);
      }
    });
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
    return <LoadingSpinner size="hero" fullPage text={t("user.draftSubmissions.loadingDraftSubmissions", { defaultValue: "Loading draft submissions..." })} />;
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

  // If viewing a specific submission
  if (selectedSubmission) {
    const submissionLanguage = (selectedSubmission.content?.assessment?.language as string) || currentLanguage || 'en';

    const getRevisionId = (response: SubmissionResponseWithCategory): string | undefined => {
      return (
        response.question_revision_id ||
        response.questionRevisionId ||
        (response as any)?.question_revision?.question_revision_id ||
        (response as any)?.question_revision?.id
      );
    };

    const getLocalizedQuestionText = (textRecord?: Record<string, string>): string | undefined => {
      if (!textRecord) return undefined;
      const translated = textRecord[submissionLanguage];
      if (typeof translated === 'string' && translated.trim()) return translated;
      const english = textRecord.en;
      if (typeof english === 'string' && english.trim()) return english;
      return Object.values(textRecord).find((v) => typeof v === 'string' && v.trim());
    };

    const getQuestionDisplayText = (response: SubmissionResponseWithCategory): string => {
      const revisionId = getRevisionId(response);

      // Prefer the question revision source because cached response.question_text can be in a different UI language.
      if (revisionId && questionsTextMap.has(revisionId)) {
        const localizedText = getLocalizedQuestionText(questionsTextMap.get(revisionId));
        if (localizedText) return localizedText;
      }

      if (typeof response.question === 'object' && response.question !== null) {
        const localizedText = getLocalizedQuestionText(response.question as Record<string, string>);
        if (localizedText) return localizedText;
      }

      if (typeof response.question_text === 'string' && response.question_text.trim()) {
        return response.question_text;
      }

      return revisionId ? `Question (ID: ${revisionId})` : `Question`;
    };

    const groupedByCategory: Record<string, SubmissionResponseWithCategory[]> = {};
    if (selectedSubmission.content?.responses) {
      for (const resp of selectedSubmission.content.responses) {
        let rawCat = resp.question_category;
        const revisionId = getRevisionId(resp);

        // If it's a completely local draft lacking enrichment, or the backend returned 'Unknown'/'Unknown category'
        if (!rawCat || rawCat.toLowerCase() === 'uncategorized' || rawCat.toLowerCase().includes('unknown')) {
          if (revisionId && qRevToCategoryMap.has(revisionId)) {
            rawCat = qRevToCategoryMap.get(revisionId);
          }
        }

        rawCat = rawCat || 'Uncategorized';
        const cat = getCategoryDisplayName(rawCat, submissionLanguage);
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
            {offlineBanner}

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

              {/* Responses - Now Collapsible */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{t("user.draftSubmissions.assessmentResponses", { defaultValue: "Assessment Responses" })}</h2>
                  <p className="text-sm text-gray-500 italic">{t("user.draftSubmissions.clickToExpand", { defaultValue: "Click categories to expand" })}</p>
                </div>

                {categories.length > 0 ? (
                  <Accordion type="multiple" defaultValue={[categories[0]]} className="space-y-4">
                    {categories.map((category, catIdx) => (
                      <AccordionItem
                        key={category}
                        value={category}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                      >
                        <AccordionTrigger className="w-full px-6 py-4 hover:no-underline bg-gradient-to-r from-blue-50/50 to-indigo-50/50 hover:from-blue-50 hover:to-indigo-50 transition-colors border-b border-gray-100">
                          <div className="flex items-center text-left">
                            <div className="mr-4 p-2 bg-blue-100 rounded-lg">
                              <TrendingUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-blue-900">{category}</h3>
                              <p className="text-xs text-blue-600/70">{groupedByCategory[category].length} {t("user.draftSubmissions.responses", { defaultValue: "responses" })}</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 py-4 pt-6">
                          <div className="space-y-8">
                            {groupedByCategory[category].map((response, idx) => (
                              <div key={idx} className="relative pl-8 border-l-2 border-blue-200 last:pb-0 pb-8 last:border-l-transparent">
                                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
                                <h3 className="font-semibold text-gray-900 mb-4 text-lg leading-relaxed">
                                  {getQuestionDisplayText(response) || `Question ${idx + 1}`}
                                </h3>
                                <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
                                  {renderReadOnlyAnswer(response)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
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
                  onClick={() => handleApprove(selectedSubmission.submission_id)}
                  disabled={approveDraftSubmission.isPending || approvingId === selectedSubmission.submission_id}
                  className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {approvingId === selectedSubmission.submission_id
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
          {offlineBanner}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t("user.draftSubmissions.title", { defaultValue: "Draft Submissions" })}
          </h1>
          <p className="text-lg text-gray-600">
            {t("user.draftSubmissions.description", { defaultValue: "Review and approve draft assessments submitted by organization users" })}
          </p>
        </div>

        {enrichedSubmissions.length === 0 ? (
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
            {enrichedSubmissions.map((submission) => (
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
