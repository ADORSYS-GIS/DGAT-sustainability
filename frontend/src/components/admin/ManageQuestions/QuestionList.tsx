/*
 * Question list component for displaying and managing assessment questions
 * Shows question cards with multilingual text display and edit/delete actions
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Edit, Trash2, BookOpen } from "lucide-react";
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

interface QuestionListProps {
  questions: QuestionWithLatestRevision[];
  onEdit: (question: QuestionWithLatestRevision) => void;
  onDelete: (questionId: string) => void;
  isPending: boolean;
}

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ss", name: "siSwati", flag: "🇸🇿" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
];

const QuestionText: React.FC<{ question: QuestionWithLatestRevision }> = ({ question }) => {
  const { t } = useTranslation();
  const currentLanguage = "en"; // Default to English

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">
        <strong>{t('manageQuestions.category')}:</strong> {question.category}
      </div>
      <div className="text-sm text-gray-600">
        <strong>{t('manageQuestions.weight')}:</strong> {question.latest_revision.weight}
      </div>
      <div className="text-sm text-gray-600">
        <strong>{t('manageQuestions.created')}:</strong>{" "}
        {new Date(question.created_at).toLocaleDateString()}
      </div>
      <div className="mt-3">
        <strong>{t('manageQuestions.questionText')}:</strong>
        <div className="mt-2 space-y-2">
          {LANGUAGES.map((lang) => {
            const text = question.latest_revision.text[lang.code];
            if (!text) return null;
            return (
              <div key={lang.code} className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">
                  {lang.flag} {lang.name}
                </div>
                <div className="text-sm">{text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  onEdit,
  onDelete,
  isPending,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <Card key={question.question_id} className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-dgrv-blue/10">
                  <BookOpen className="w-5 h-5 text-dgrv-blue" />
                </div>
                <span className="text-lg">
                  {question.latest_revision.text.en || t('manageQuestions.noEnglishText')}
                </span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(question)}
                  disabled={isPending}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(question.question_id)}
                  className="text-red-600 hover:text-red-700"
                  disabled={isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="details">
                <AccordionTrigger>
                  {t('manageQuestions.viewDetails')}
                </AccordionTrigger>
                <AccordionContent>
                  <QuestionText question={question} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      ))}

      {questions.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('manageQuestions.noQuestionsYet')}
            </h3>
            <p className="text-gray-600">
              {t('manageQuestions.getStarted')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 