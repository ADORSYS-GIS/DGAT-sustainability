/*
 * Question list component for displaying and managing assessment questions
 * Shows questions grouped by category in accordion format
 */

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Edit, Trash2, BookOpen, Hash, Weight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface QuestionRevision {
  question_revision_id: string;
  question_id: string;
  text: Record<string, string>;
  weight: number;
  created_at: string;
}

interface QuestionWithLatestRevision {
  question_id: string;
  category: string;
  created_at: string;
  latest_revision: QuestionRevision;
}

interface Category {
  category_id: string;
  name: string;
  weight: number;
  order: number;
  template_id: string;
  created_at: string;
  updated_at: string;
}

interface QuestionListProps {
  questions: QuestionWithLatestRevision[];
  categories: Category[];
  onEdit: (question: QuestionWithLatestRevision) => void;
  onDelete: (questionRevisionId: string) => void;
  isPending: boolean;
}

const QuestionText = ({
  question,
}: {
  question: QuestionWithLatestRevision;
}) => {
  const { t } = useTranslation();
  if (!question.latest_revision || !question.latest_revision.text) {
    return <em className="text-gray-500">{t("manageQuestions.noText")}</em>;
  }

  const text = question.latest_revision.text;
  const languages = Object.keys(text).filter(
    (lang) => text[lang] && text[lang].trim(),
  );

  if (languages.length === 0) {
    return <em className="text-gray-500">{t("manageQuestions.noText")}</em>;
  }

  // Show English first, then other languages
  const sortedLanguages = languages.sort((a, b) => {
    if (a === "en") return -1;
    if (b === "en") return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-3">
      {sortedLanguages.map((lang) => {
        const langText = text[lang];
        if (!langText || !langText.trim()) return null;

        const isEnglish = lang === "en";

        return (
          <div
            key={lang}
            className={`${isEnglish ? "bg-blue-50 border-l-4 border-blue-200" : "bg-gray-50"} rounded-lg p-3`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${isEnglish ? "text-blue-700" : "text-gray-600"}`}
              >
                {t(`languages.${lang}`)}
              </span>
              {isEnglish && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Primary
                </span>
              )}
            </div>
            <p
              className={`text-sm leading-relaxed ${isEnglish ? "text-gray-900" : "text-gray-700"}`}
            >
              {langText}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  categories,
  onEdit,
  onDelete,
  isPending,
}) => {
  const { t } = useTranslation();

  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {categories.map((category) => {
        const categoryQuestions = questions.filter(
          (q) => q.category === category.name,
        );
        return (
          <AccordionItem
            key={category.category_id}
            value={category.category_id}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 transition-colors no-underline [&[data-state=open]]:no-underline [&[data-state=closed]]:no-underline">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-dgrv-blue/10 rounded-full flex items-center justify-center">
                    <Hash className="w-4 h-4 text-dgrv-blue" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {categoryQuestions.length} question
                      {categoryQuestions.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4 pt-4">
                {categoryQuestions.length > 0 ? (
                  categoryQuestions.map((question, index) => (
                    <div
                      key={question.question_id}
                      className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Question Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                              {index + 1}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Weight className="w-4 h-4" />
                              <span className="font-medium">
                                Weight: {question.latest_revision?.weight || 0}
                              </span>
                            </div>
                          </div>

                          {/* Question Content */}
                          <div className="space-y-3">
                            <QuestionText question={question} />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(question)}
                            className="h-8 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(question.question_id)}
                            className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      No Questions Yet
                    </h3>
                    <p className="text-gray-500">
                      {t("manageQuestions.noQuestionsInCategory")}
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
      {categories.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Categories Available
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {t("manageQuestions.noCategories")}
          </p>
        </div>
      )}
    </Accordion>
  );
};
