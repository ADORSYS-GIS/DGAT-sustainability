/*
 * Question card component for assessment interface
 * Displays questions for current category with input components
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Question, QuestionRevision } from "@/openapi-rq/requests/types.gen";
import { QuestionInput } from "./QuestionInput";

type FileData = { name: string; url: string };

type LocalAnswer = {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
  files?: FileData[];
};

interface QuestionCardProps {
  currentCategory: string;
  currentQuestions: { question: Question; revision: QuestionRevision }[];
  answers: Record<string, LocalAnswer>;
  onAnswerChange: (key: string, value: Partial<LocalAnswer>) => void;
  onFileUpload: (questionId: string, files: FileList | null) => void;
  showPercentInfo: boolean;
  setShowPercentInfo: (show: boolean) => void;
  getRevisionKey: (revision: QuestionRevision) => string;
  currentLanguage: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  currentCategory,
  currentQuestions,
  answers,
  onAnswerChange,
  onFileUpload,
  showPercentInfo,
  setShowPercentInfo,
  getRevisionKey,
  currentLanguage,
}) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl text-dgrv-blue">{currentCategory}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {currentQuestions.map((question, index) => {
          let questionText = "";
          if (typeof question.revision.text === "object" && question.revision.text !== null) {
            const textObj = question.revision.text as Record<string, unknown>;
            questionText = typeof textObj[currentLanguage] === "string" ? textObj[currentLanguage] : (Object.values(textObj).find((v) => typeof v === "string") as string) || "";
          } else if (typeof question.revision.text === "string") {
            questionText = question.revision.text;
          }

          const key = getRevisionKey(question.revision);
          const answer = answers[key] || {};

          return (
            <div key={key} className="border-b pb-6 last:border-b-0">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {index + 1}. {questionText}
                </h3>
              </div>
              <QuestionInput
                key={key}
                answer={answer}
                onAnswerChange={onAnswerChange}
                onFileUpload={onFileUpload}
                showPercentInfo={showPercentInfo}
                setShowPercentInfo={setShowPercentInfo}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}; 