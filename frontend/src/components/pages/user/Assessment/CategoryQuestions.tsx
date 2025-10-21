/**
 * @file CategoryQuestions.tsx
 * @description This file defines the component for displaying the list of questions for a category.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Question, QuestionRevision } from "@/openapi-rq/requests/types.gen";
import React from "react";
import { QuestionCard } from "./QuestionCard";

type LocalAnswer = {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
  files?: { name: string; url: string }[];
};

interface CategoryQuestionsProps {
  currentCategoryName: string;
  questions: { question: Question; revision: QuestionRevision }[];
  answers: Record<string, LocalAnswer>;
  onAnswerChange: (question_revision_id: string, value: Partial<LocalAnswer>) => void;
  getRevisionKey: (revision: QuestionRevision) => string;
  currentLanguage: string;
}

export const CategoryQuestions: React.FC<CategoryQuestionsProps> = ({
  currentCategoryName,
  questions,
  answers,
  onAnswerChange,
  getRevisionKey,
  currentLanguage,
}) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl text-dgrv-blue">
          {currentCategoryName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {questions.map((question, index) => {
          let questionText = "";
          if (
            typeof question.revision.text === "object" &&
            question.revision.text !== null
          ) {
            const textObj = question.revision.text as Record<string, string>;
            questionText =
              typeof textObj[currentLanguage] === "string"
                ? textObj[currentLanguage]
                : (Object.values(textObj).find(
                    (v) => typeof v === "string"
                  ) as string) || "";
          } else if (typeof question.revision.text === "string") {
            questionText = question.revision.text;
          }
          const key = getRevisionKey(question.revision);
          return (
            <div
              key={key}
              className="border-b pb-6 last:border-b-0"
            >
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {index + 1}. {questionText}
                </h3>
              </div>
              <QuestionCard
                revision={question.revision}
                answer={answers[key]}
                onAnswerChange={onAnswerChange}
                getRevisionKey={getRevisionKey}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};