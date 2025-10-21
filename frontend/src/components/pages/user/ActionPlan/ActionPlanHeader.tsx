/**
 * @file ActionPlanHeader.tsx
 * @description This file defines the header component for the Action Plan page.
 */
import { Kanban } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

export const ActionPlanHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <Kanban className="w-8 h-8 text-dgrv-blue" />
            <h1 className="text-3xl font-bold text-dgrv-blue">
              {t("user.actionPlan.title", { defaultValue: "Action Plan" })}
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            {t("user.dashboard.actionPlan.subtitle", {
              defaultValue: "Track your sustainability improvement tasks",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};