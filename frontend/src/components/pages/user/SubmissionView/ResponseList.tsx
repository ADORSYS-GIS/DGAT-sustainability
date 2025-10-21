/**
 * @file ResponseList.tsx
 * @description This file defines the ResponseList component for displaying submission responses.
 */
import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Submission_content_responses } from "@/openapi-rq/requests/types.gen";
import { useTranslation } from "react-i18next";

interface SubmissionResponseWithCategory extends Submission_content_responses {
  question_category?: string;
  question_text?: string;
}

interface ResponseListProps {
  responses?: SubmissionResponseWithCategory[];
}

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
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">Yes/No</span>
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
            Yes
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
            No
          </Button>
        </div>
      </div>
      <div className="border-b border-gray-200 my-2" />
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">Percentage</span>
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
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">Text Response</span>
        <Textarea
          value={typeof textValue === "string" ? textValue : ""}
          readOnly
          className="mt-1 bg-gray-50 border border-gray-200 focus:ring-0 focus:border-dgrv-blue text-gray-800"
          rows={3}
          placeholder="No answer"
          style={{ opacity: 1 }}
        />
      </div>
      <div className="border-b border-gray-200 my-2" />
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">Files</span>
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
                {file.name || `File ${idx + 1}`}
              </a>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-400">No files uploaded</span>
        )}
      </div>
    </div>
  );
};

export const ResponseList: React.FC<ResponseListProps> = ({ responses }) => {
  const { t } = useTranslation();

  const groupedByCategory = React.useMemo(() => {
    const groups: Record<string, SubmissionResponseWithCategory[]> = {};
    if (responses) {
      for (const resp of responses) {
        const cat = resp.question_category || "Uncategorized";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(resp);
      }
    }
    return groups;
  }, [responses]);
  const categories = Object.keys(groupedByCategory);

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
                  <Card key={idx} className="mb-4">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-dgrv-blue">
                        {response.question_text || t("category")}
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
  );
};