/*
 * Displays individual response cards with question title and answer content
 * Wraps ResponseDisplay component in a card layout with proper styling
 * Handles question text extraction from multilingual objects
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { ResponseDisplay } from "./ResponseDisplay";
import type { Submission_content_responses } from "@/openapi-rq/requests/types.gen";

// Locally extend the type to include question_category
interface SubmissionResponseWithCategory extends Submission_content_responses {
  question_category?: string;
}

interface ResponseCardProps {
  response: SubmissionResponseWithCategory;
  index: number;
}

export const ResponseCard: React.FC<ResponseCardProps> = ({
  response,
  index,
}) => {
  const { t } = useTranslation();

  return (
    <Card key={index} className="mb-4">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-dgrv-blue">
          {(() => {
            const q = response.question;
            if (q && typeof q === "object") {
              // @ts-expect-error: OpenAPI type is too loose, but backend always sends { en: string }
              return q.en ?? t("category");
            }
            if (typeof q === "string") {
              return q;
            }
            return t("category");
          })()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponseDisplay response={response} />
      </CardContent>
    </Card>
  );
};
