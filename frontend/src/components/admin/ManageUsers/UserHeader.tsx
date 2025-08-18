/*
 * Header component for the manage users page
 * Displays title and description for user management interface
 */

import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export const UserHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-4">
        <Users className="w-8 h-8 text-dgrv-blue" />
        <h1 className="text-3xl font-bold text-dgrv-blue">
          {t("manageUsers.title", { defaultValue: "Manage Users" })}
        </h1>
      </div>
      <p className="text-lg text-gray-600">
        {t("manageUsers.subtitle", {
          defaultValue: "Create and manage users for organizations",
        })}
      </p>
    </div>
  );
};
