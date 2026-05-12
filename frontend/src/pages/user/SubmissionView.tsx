import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOfflineSubmissions, useOfflineSubmissionsMutation } from "@/hooks/useOfflineSubmissions";
import type { Submission_content_responses } from "../../openapi-rq/requests/types.gen";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import { useOfflineCategoryCatalogs } from "@/hooks/useCategoryCatalogs";
import { normalizeCategoryName } from "@/utils/categoryUtils";
import type { OfflineCategoryCatalog } from "@/types/offline";

// Locally extend the type to include question_category
interface SubmissionResponseWithCategory extends Submission_content_responses {
  question_category?: string;
  question_text?: string;
  display_order?: number;
  question_revision_id?: string;
}

export const SubmissionView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = localStorage.getItem("i18n_language") || i18n.language || "en";
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const {
    data: submissionsData,
    isLoading: submissionLoading,
    error: submissionError,
  } = useOfflineSubmissions();

  const submission = submissionsData?.submissions?.find(s => s.submission_id === submissionId);

  const { deleteSubmission: deleteSubmissionMutation } = useOfflineSubmissionsMutation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    if (submissionId) {
      await deleteSubmissionMutation(submissionId);
      navigate("/assessments");
    }
    setIsDeleteDialogOpen(false);
  };

  const responses = submission?.content?.responses as SubmissionResponseWithCategory[] | undefined;

  const { data: questionsData } = useOfflineQuestions();
  const { data: categoriesData } = useOfflineCategoryCatalogs();

  const categoryCatalogMap = React.useMemo(() => {
    if (!categoriesData) return new Map<string, OfflineCategoryCatalog>();
    const map = new Map<string, OfflineCategoryCatalog>();
    categoriesData.forEach((category) => {
      map.set(category.category_catalog_id, category as OfflineCategoryCatalog);
    });
    return map;
  }, [categoriesData]);

  const categoryNameToIdMap = React.useMemo(() => {
    if (!categoriesData) return new Map<string, string>();
    const map = new Map<string, string>();
    categoriesData.forEach((category) => {
      map.set(category.name.toLowerCase(), category.category_catalog_id);
      const translations = (category as any).name_translations as Record<string, string> | undefined;
      if (translations) {
        Object.values(translations).forEach((name) => {
          if (name) map.set(name.toLowerCase(), category.category_catalog_id);
        });
      }
    });
    return map;
  }, [categoriesData]);

  const getCategoryDisplayName = React.useCallback((rawNameOrId?: string): string => {
    if (!rawNameOrId) return "Uncategorized";
    const normalizedRaw = rawNameOrId.trim();
    if (!normalizedRaw || normalizedRaw.toLowerCase() === "uncategorized" || normalizedRaw.toLowerCase().includes("unknown")) {
      return normalizedRaw || "Uncategorized";
    }

    const byId = categoryCatalogMap.get(normalizedRaw);
    if (byId) {
      const translations = (byId as any).name_translations as Record<string, string> | undefined;
      return translations?.[currentLanguage] || byId.name;
    }

    const id = categoryNameToIdMap.get(normalizedRaw.toLowerCase());
    const byName = id ? categoryCatalogMap.get(id) : undefined;
    if (byName) {
      const translations = (byName as any).name_translations as Record<string, string> | undefined;
      return translations?.[currentLanguage] || byName.name;
    }

    return normalizedRaw;
  }, [categoryCatalogMap, categoryNameToIdMap, currentLanguage]);

  const [questionsMap, questionsTextMap, qRevToCategoryMap, questionTranslationsByRevision, questionsByAnyTextMap] = React.useMemo(() => {
    const map = new Map<string, number>();
    const textMap = new Map<string, number>();
    const catMap = new Map<string, string>();
    const translationMap = new Map<string, Record<string, string>>();
    const anyTextMap = new Map<string, Record<string, string>>();

    // Create a mapping from category_id to category name
    const categoryIdToName = new Map<string, string>();
    const categoryNameToId = new Map<string, string>();
    if (categoriesData) {
      categoriesData.forEach(cat => {
        categoryIdToName.set(cat.category_catalog_id, cat.name);
        categoryNameToId.set(cat.name.toLowerCase(), cat.category_catalog_id);
      });
    }

    if (questionsData) {
      questionsData.forEach(q => {
        if (q.latest_revision) {
          const revId = q.latest_revision.question_revision_id;
          const displayOrder = q.display_order || 0;
          map.set(revId, displayOrder);

          const rawText = q.latest_revision.text;
          const textRecord: Record<string, string> = typeof rawText === 'string' ? { en: rawText } : (rawText as Record<string, string>) || {};
          translationMap.set(revId, textRecord);

          const qText = textRecord.en || Object.values(textRecord).find((v) => typeof v === "string") || "";
          if (qText) {
            textMap.set(qText, displayOrder);
          }
          Object.values(textRecord).forEach((text) => {
            if (typeof text === "string" && text.trim()) {
              anyTextMap.set(text.trim().toLowerCase(), textRecord);
            }
          });

          // Map the revision ID to the actual proper category name
          let catName = 'Uncategorized';
          const qCat = q.category || q.category_id; // Frontend returns category as string or UUID
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
    return [map, textMap, catMap, translationMap, anyTextMap];
  }, [questionsData, categoriesData]);

  const getLocalizedQuestionText = React.useCallback((textRecord?: Record<string, string>): string | undefined => {
    if (!textRecord) return undefined;
    const translated = textRecord[currentLanguage];
    if (typeof translated === "string" && translated.trim()) return translated;
    const english = textRecord.en;
    if (typeof english === "string" && english.trim()) return english;
    return Object.values(textRecord).find((v) => typeof v === "string" && v.trim());
  }, [currentLanguage]);

  const getQuestionDisplayText = React.useCallback((response: SubmissionResponseWithCategory): string => {
    if (response.question_revision_id && questionTranslationsByRevision.has(response.question_revision_id)) {
      const localizedText = getLocalizedQuestionText(questionTranslationsByRevision.get(response.question_revision_id));
      if (localizedText) return localizedText;
    }

    if (typeof response.question === "object" && response.question !== null) {
      const questionObj = response.question as Record<string, string> | { text?: Record<string, string> };
      const textRecord = "text" in questionObj && typeof questionObj.text === "object" && questionObj.text !== null
        ? questionObj.text
        : questionObj as Record<string, string>;
      const localizedText = getLocalizedQuestionText(textRecord);
      if (localizedText) return localizedText;
    }

    const plainText = typeof response.question === "string" && response.question.trim()
      ? response.question
      : response.question_text;
    if (typeof plainText === "string" && plainText.trim()) {
      const textRecord = questionsByAnyTextMap.get(plainText.trim().toLowerCase());
      const localizedText = getLocalizedQuestionText(textRecord);
      if (localizedText) return localizedText;
      return plainText;
    }

    return t("question", { defaultValue: "Question" });
  }, [getLocalizedQuestionText, questionTranslationsByRevision, questionsByAnyTextMap, t]);

  // Group responses by category and sort them
  const groupedByCategory = React.useMemo(() => {
    const groups: Record<string, SubmissionResponseWithCategory[]> = {};
    if (responses) {
      for (const resp of responses) {
        // Find category from backend enrichment OR local lookup map
        let cat = resp.question_category;

        // If it's a completely local draft lacking enrichment, or the backend returned 'Unknown'/'Unknown category'
        if (!cat || cat.toLowerCase() === 'uncategorized' || cat.toLowerCase().includes('unknown')) {
          if (resp.question_revision_id && qRevToCategoryMap.has(resp.question_revision_id)) {
            cat = qRevToCategoryMap.get(resp.question_revision_id);
          }
        }

        cat = normalizeCategoryName(getCategoryDisplayName(cat));

        if (!groups[cat]) groups[cat] = [];

        // Enrich with display_order for sorting
        const questionTextStr = typeof resp.question === 'object' ? (resp.question as any).en : resp.question;
        let displayOrder = 9999;

        if (resp.question_revision_id && questionsMap.has(resp.question_revision_id)) {
          displayOrder = questionsMap.get(resp.question_revision_id)!;
        } else if (questionTextStr && questionsTextMap.has(questionTextStr)) {
          displayOrder = questionsTextMap.get(questionTextStr)!;
        }

        groups[cat].push({ ...resp, display_order: displayOrder });
      }

      // Sort each group
      for (const cat in groups) {
        groups[cat].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      }
    }
    return groups;
  }, [responses, questionsMap, questionsTextMap, qRevToCategoryMap, getCategoryDisplayName]);
  const categories = Object.keys(groupedByCategory);

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
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-700">{t("assessment.yesNo", { defaultValue: "Yes/No" })}</span>
          <div className="flex space-x-4 mt-1">
            <Button
              type="button"
              variant={yesNoValue === true ? "default" : "outline"}
              className={
                yesNoValue === true
                  ? "bg-dgrv-green text-white border-dgrv-green"
                  : "bg-white text-dgrv-green border-dgrv-green hover:bg-dgrv-green/10"
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
        <div className="border-b border-gray-200 my-2" />
        {/* Percentage */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-700">{t("assessment.percentage", { defaultValue: "Percentage" })}</span>
          <div className="flex space-x-2 mt-1">
            {[0, 25, 50, 75, 100].map((val) => (
              <Button
                key={val}
                type="button"
                variant={percentageValue === val ? "default" : "outline"}
                className={
                  percentageValue === val
                    ? "bg-dgrv-blue text-white border-dgrv-blue"
                    : "bg-white text-dgrv-blue border-dgrv-blue hover:bg-dgrv-blue/10"
                }
                tabIndex={-1}
                style={{ pointerEvents: "none", opacity: 1 }}
              >
                {val}%
              </Button>
            ))}
          </div>
        </div>
        <div className="border-b border-gray-200 my-2" />
        {/* Text Input */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-700">{t("staticText.submissionView.textResponse", { defaultValue: "Text Response" })}</span>
          <Textarea
            value={typeof textValue === "string" ? textValue : ""}
            readOnly
            className="mt-1 bg-gray-50 border border-gray-200 focus:ring-0 focus:border-dgrv-blue text-gray-800"
            rows={3}
            placeholder={t("staticText.submissionView.noAnswer", { defaultValue: "No answer" })}
            style={{ opacity: 1 }}
          />
        </div>
        <div className="border-b border-gray-200 my-2" />
        {/* File List */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-700">{t("staticText.submissionView.files", { defaultValue: "Files" })}</span>
          {files.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              {files.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                  download={file.name}
                >
                  {file.name || t("staticText.submissionView.fileNumber", { count: idx + 1, defaultValue: "File {{count}}" })}
                </a>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400">{t("staticText.submissionView.noFilesUploaded", { defaultValue: "No files uploaded" })}</span>
          )}
        </div>
      </div>
    );
  };

  if (submissionLoading) {
    return <LoadingSpinner size="hero" fullPage text={t("loading")} />;
  }
  if (submissionError || !submission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pb-8 flex items-center justify-center">
          <div className="text-red-600">{t("staticText.submissionView.loadError", { defaultValue: "Error loading submission details." })}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Remove online status indicator */}

        <div className="mb-6">
          <Card className="shadow-md bg-white/90 border-0">
            <CardHeader className="border-b pb-2 mb-2">
              <CardTitle className="text-2xl font-bold text-dgrv-blue tracking-tight text-left">
                {t("viewSubmission")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-col md:flex-row md:space-x-8 space-y-2 md:space-y-0">
                <div className="flex-1">
                  <span className="block text-xs text-gray-500 font-medium mb-1">
                    {t("status")}
                  </span>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {submission.review_status
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
                <div className="flex-1">
                  <span className="block text-xs text-gray-500 font-medium mb-1">
                    {t("submittedAt")}
                  </span>
                  <span className="text-sm text-gray-700">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </span>
                </div>
                {submission.reviewed_at && (
                  <div className="flex-1">
                    <span className="block text-xs text-gray-500 font-medium mb-1">
                      {t("reviewedAt")}
                    </span>
                    <span className="text-sm text-gray-700">
                      {new Date(submission.reviewed_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              {/* Grouped by category with dropdown */}
              <div className="mt-6">
                <Accordion type="multiple" className="w-full divide-y divide-gray-100">
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <AccordionItem key={category} value={category} className="bg-white/80">
                        <AccordionTrigger className="text-left text-lg font-semibold text-dgrv-blue px-6 py-4 hover:bg-dgrv-blue/5 focus:bg-dgrv-blue/10 rounded-md justify-start items-start">
                          {category}
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2">
                          {groupedByCategory[category].map((response, idx) => (
                            <Card key={idx} className="mb-4">
                              <CardHeader>
                                <CardTitle className="text-base font-semibold text-dgrv-blue">
                                  {getQuestionDisplayText(response)}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>{renderReadOnlyAnswer(response)}</CardContent>
                            </Card>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))
                  ) : (
                    <div className="text-gray-500">{t("noData")}</div>
                  )}
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            {t("deleteSubmission")}
          </Button>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t("confirmDeletion")}
        description={t("confirmDeletionDescription")}
      />
    </div>
  );
};
