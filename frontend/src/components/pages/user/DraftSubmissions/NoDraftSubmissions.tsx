/**
 * @file NoDraftSubmissions.tsx
 * @description This file defines the component to be displayed when there are no draft submissions.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

export const NoDraftSubmissions: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Clock className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          {t("user.draftSubmissions.noDraftSubmissions", {
            defaultValue: "No Draft Submissions",
          })}
        </h3>
        <p className="text-gray-500 text-center max-w-md">
          {t("user.draftSubmissions.noDraftSubmissionsDescription", {
            defaultValue:
              "There are currently no draft submissions pending approval. Check back later for new submissions.",
          })}
        </p>
      </CardContent>
    </Card>
  );
};