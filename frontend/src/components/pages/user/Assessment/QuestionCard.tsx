/**
 * @file QuestionCard.tsx
 * @description This file defines the component for rendering a single question in the assessment.
 */
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuestionRevision } from "@/openapi-rq/requests/types.gen";
import { Info, Paperclip } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type FileData = { name: string; url: string };

type LocalAnswer = {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
  files?: FileData[];
};

interface QuestionCardProps {
  revision: QuestionRevision;
  answer: LocalAnswer;
  onAnswerChange: (question_revision_id: string, value: Partial<LocalAnswer>) => void;
  getRevisionKey: (revision: QuestionRevision) => string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  revision,
  answer,
  onAnswerChange,
  getRevisionKey,
}) => {
  const { t } = useTranslation();
  const [showPercentInfo, setShowPercentInfo] = useState<string | null>(null);
  const key = getRevisionKey(revision);

  const handleFileUpload = (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 1024 * 1024) {
      toast.error(t("assessment.fileTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = { name: file.name, url: e.target?.result as string };
      onAnswerChange(questionId, { files: [...(answer?.files || []), fileData] });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>
          {t("assessment.yesNo")} <span className="text-red-500">*</span>
        </Label>
        <div className="flex space-x-4 mt-1">
          <Button
            type="button"
            variant={answer?.yesNo === true ? "default" : "outline"}
            className={answer?.yesNo === true ? "bg-dgrv-green hover:bg-green-700" : ""}
            onClick={() => onAnswerChange(key, { yesNo: true })}
          >
            Yes
          </Button>
          <Button
            type="button"
            variant={answer?.yesNo === false ? "default" : "outline"}
            className={answer?.yesNo === false ? "bg-red-500 hover:bg-red-600" : ""}
            onClick={() => onAnswerChange(key, { yesNo: false })}
          >
            No
          </Button>
        </div>
      </div>
      <div>
        <div className="flex items-center space-x-2 relative">
          <Label>
            {t("assessment.percentage")} <span className="text-red-500">*</span>
          </Label>
          <button
            type="button"
            className="cursor-pointer text-dgrv-blue focus:outline-none"
            onClick={() => setShowPercentInfo(showPercentInfo === key ? null : key)}
            aria-label="Show percentage explanation"
          >
            <Info className="w-4 h-4" />
          </button>
          {showPercentInfo === key && (
            <div className="absolute left-8 top-6 z-10 bg-white border rounded shadow-md p-3 w-56 text-xs text-gray-700">
              <div>
                <b>0%:</b> {t("assessment.percentNotStarted")}
              </div>
              <div>
                <b>25%:</b> {t("assessment.percentSomeProgress")}
              </div>
              <div>
                <b>50%:</b> {t("assessment.percentHalfway")}
              </div>
              <div>
                <b>75%:</b> {t("assessment.percentAlmostDone")}
              </div>
              <div>
                <b>100%:</b> {t("assessment.percentFullyAchieved")}
              </div>
            </div>
          )}
        </div>
        <div className="flex space-x-2 mt-1">
          {[0, 25, 50, 75, 100].map((val) => (
            <Button
              key={val}
              type="button"
              variant={answer?.percentage === val ? "default" : "outline"}
              className={
                answer?.percentage === val
                  ? "bg-dgrv-blue text-white border-dgrv-blue"
                  : "bg-white text-dgrv-blue border-dgrv-blue hover:bg-dgrv-blue/10"
              }
              onClick={() => onAnswerChange(key, { percentage: val })}
            >
              {val}%
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor={`input-text-${key}`}>
          {t("assessment.yourResponse")} <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id={`input-text-${key}`}
          value={answer?.text || ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onAnswerChange(key, { text: e.target.value })}
          placeholder={t("assessment.enterYourResponse")}
          className="mt-1"
          rows={4}
        />
        <div className="mt-2 flex items-center space-x-2">
          <label className="flex items-center cursor-pointer text-dgrv-blue hover:underline">
            <Paperclip className="w-4 h-4 mr-1" />
            <span>{t("assessment.addFile")}</span>
            <input type="file" className="hidden" onChange={(e) => handleFileUpload(key, e.target.files)} />
          </label>
          {answer?.files && answer.files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {answer.files.map((file: FileData, idx: number) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                  download={file.name}
                >
                  {file.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};