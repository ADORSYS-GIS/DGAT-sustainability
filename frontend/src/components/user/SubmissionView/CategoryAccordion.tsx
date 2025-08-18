/*
 * Displays grouped responses in an accordion layout organized by category
 * Renders collapsible sections for each category with response cards inside
 * Handles empty state when no categories or responses are available
 */

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import { ResponseCard } from "./ResponseCard";
import type { Submission_content_responses } from "@/openapi-rq/requests/types.gen";

// Locally extend the type to include question_category
interface SubmissionResponseWithCategory extends Submission_content_responses {
  question_category?: string;
}

interface CategoryAccordionProps {
  groupedByCategory: Record<string, SubmissionResponseWithCategory[]>;
  categories: string[];
}

export const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  groupedByCategory,
  categories,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-6">
      <Accordion type="multiple" className="w-full divide-y divide-gray-100">
        {categories.length > 0 ? (
          categories.map((category) => (
            <AccordionItem
              key={category}
              value={category}
              className="bg-white/80"
            >
              <AccordionTrigger className="text-left text-lg font-semibold text-dgrv-blue px-6 py-4 hover:bg-dgrv-blue/5 focus:bg-dgrv-blue/10 rounded-md justify-start items-start">
                {category}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                {groupedByCategory[category].map((response, idx) => (
                  <ResponseCard key={idx} response={response} index={idx} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))
        ) : (
          <div className="text-gray-500">{t("noData")}</div>
        )}
      </Accordion>
    </div>
  );
};
