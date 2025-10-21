/**
 * @file Header.tsx
 * @description This file defines the Header component for the SubmissionView page.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface HeaderProps {
  status: string;
  submittedAt: string;
  reviewedAt?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  submittedAt,
  reviewedAt,
}) => {
  const { t } = useTranslation();

  return (
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
              {status
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
          <div className="flex-1">
            <span className="block text-xs text-gray-500 font-medium mb-1">
              {t("submittedAt")}
            </span>
            <span className="text-sm text-gray-700">
              {new Date(submittedAt).toLocaleString()}
            </span>
          </div>
          {reviewedAt && (
            <div className="flex-1">
              <span className="block text-xs text-gray-500 font-medium mb-1">
                {t("reviewedAt")}
              </span>
              <span className="text-sm text-gray-700">
                {new Date(reviewedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};