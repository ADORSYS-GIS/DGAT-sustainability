/**
 * @file Loading.tsx
 * @description This file defines the loading component for the Assessment page.
 */
import React from "react";
import { useTranslation } from "react-i18next";

export const Loading: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
        <p className="text-gray-600">{t("loading")}</p>
      </div>
    </div>
  );
};