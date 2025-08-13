/*
 * Header component for the admin dashboard page
 * Displays welcome message and introduction text for administrators
 */

import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

export const AdminDashboardHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Settings className="w-8 h-8 text-dgrv-blue" />
          <h1 className="text-3xl font-bold text-dgrv-blue">
            {t('adminDashboard.welcome')}
          </h1>
        </div>
      </div>
      <p className="text-lg text-gray-600">
        {t('adminDashboard.intro')}
      </p>
    </div>
  );
}; 