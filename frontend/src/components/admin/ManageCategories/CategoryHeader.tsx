/*
 * Header component for the manage categories page
 * Displays title and description for category management interface
 */

import { List } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CategoryHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-4">
        <List className="w-8 h-8 text-dgrv-blue" />
        <h1 className="text-3xl font-bold text-dgrv-blue mb-6">
          {t('manageCategories.title')}
        </h1>
      </div>
      <p className="text-lg text-gray-600">
        {t('manageCategories.configureCategories')}
      </p>
    </div>
  );
}; 