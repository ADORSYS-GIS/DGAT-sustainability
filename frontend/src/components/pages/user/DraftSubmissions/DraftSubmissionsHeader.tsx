/**
 * @file DraftSubmissionsHeader.tsx
 * @description This file defines the header component for the Draft Submissions page.
 */
import React from "react";
import { useTranslation } from "react-i18next";

export const DraftSubmissionsHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        {t("user.draftSubmissions.title", {
          defaultValue: "Draft Submissions",
        })}
      </h1>
      <p className="text-lg text-gray-600">
        {t("user.draftSubmissions.description", {
          defaultValue:
            "Review and approve draft assessments submitted by organization users",
        })}
      </p>
    </div>
  );
};