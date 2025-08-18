/*
 * Header component for the manage organizations page
 * Displays title, description and create organization button
 */

import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OrganizationHeaderProps {
  onCreateClick: () => void;
}

export const OrganizationHeader: React.FC<OrganizationHeaderProps> = ({
  onCreateClick,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <Building2 className="w-8 h-8 text-dgrv-blue" />
            <h1 className="text-3xl font-bold text-dgrv-blue">
              {t("manageOrganizations.title", {
                defaultValue: "Manage Organizations",
              })}
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            {t("manageOrganizations.subtitle", {
              defaultValue:
                "Create and manage organizations for sustainability assessments",
            })}
          </p>
        </div>
        <Button
          onClick={onCreateClick}
          className="bg-dgrv-green hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("manageOrganizations.createOrganization", {
            defaultValue: "Create Organization",
          })}
        </Button>
      </div>
    </div>
  );
};
