/**
 * @file DashboardHeader.tsx
 * @description This file defines the header component for the Dashboard page.
 */
import { Star } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

interface DashboardHeaderProps {
  userName: string;
  orgName: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  orgName,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Star className="w-8 h-8 text-dgrv-green" />
          <h1 className="text-3xl font-bold text-dgrv-blue">
            {t("user.dashboard.welcome", { user: userName, org: orgName })}
          </h1>
        </div>
      </div>
      <p className="text-lg text-gray-600">
        {t("user.dashboard.readyToContinue")}
      </p>
    </div>
  );
};