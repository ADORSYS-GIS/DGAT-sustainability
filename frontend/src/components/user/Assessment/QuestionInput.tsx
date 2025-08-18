/*
 * Question input component for assessment answers
 * Provides yes/no, percentage, text, and file upload input types
 */

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";

type FileData = { name: string; url: string };

type LocalAnswer = {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
  files?: FileData[];
};

interface QuestionInputProps {
  questionId: string;
  answer: LocalAnswer;
  onAnswerChange: (questionId: string, value: Partial<LocalAnswer>) => void;
  onFileUpload: (questionId: string, files: FileList | null) => void;
  showPercentInfo: boolean;
  setShowPercentInfo: (show: boolean) => void;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({
  questionId,
  answer,
  onAnswerChange,
  onFileUpload,
  showPercentInfo,
  setShowPercentInfo,
}) => {
  const { t } = useTranslation();

  const yesNoValue = answer?.yesNo;
  const percentageValue = answer?.percentage;
  const textValue = answer?.text || "";
  const files: FileData[] = answer?.files || [];

  return (
    <div className="space-y-4">
      <div>
        <Label>
          {t("assessment.yesNo")} <span className="text-red-500">*</span>
        </Label>
        <div className="flex space-x-4 mt-1">
          <Button
            type="button"
            variant={yesNoValue === true ? "default" : "outline"}
            className={
              yesNoValue === true ? "bg-dgrv-green hover:bg-green-700" : ""
            }
            onClick={() => onAnswerChange(questionId, { yesNo: true })}
          >
            Yes
          </Button>
          <Button
            type="button"
            variant={yesNoValue === false ? "default" : "outline"}
            className={
              yesNoValue === false ? "bg-red-500 hover:bg-red-600" : ""
            }
            onClick={() => onAnswerChange(questionId, { yesNo: false })}
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
            onClick={() => setShowPercentInfo((prev) => !prev)}
            aria-label="Show percentage explanation"
          >
            <Info className="w-4 h-4" />
          </button>
          {showPercentInfo && (
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
              variant={percentageValue === val ? "default" : "outline"}
              className={
                percentageValue === val
                  ? "bg-dgrv-blue text-white border-dgrv-blue"
                  : "bg-white text-dgrv-blue border-dgrv-blue hover:bg-dgrv-blue/10"
              }
              onClick={() => onAnswerChange(questionId, { percentage: val })}
            >
              {val}%
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor={`input-text-${questionId}`}>
          {t("assessment.yourResponse")} <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id={`input-text-${questionId}`}
          value={textValue}
          onChange={(e) => onAnswerChange(questionId, { text: e.target.value })}
          placeholder={t("assessment.enterYourResponse")}
          className="mt-1"
          rows={4}
        />
        <div className="mt-2 flex items-center space-x-2">
          <label className="flex items-center cursor-pointer text-dgrv-blue hover:underline">
            <Paperclip className="w-4 h-4 mr-1" />
            <span>{t("assessment.addFile")}</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => onFileUpload(questionId, e.target.files)}
            />
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file: FileData, idx: number) => (
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
