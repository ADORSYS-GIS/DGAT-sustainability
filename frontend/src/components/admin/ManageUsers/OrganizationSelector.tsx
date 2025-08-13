/*
 * Organization selector component for user management
 * Displays grid of organizations for selection before managing users
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrganizationResponse } from "@/openapi-rq/requests/types.gen";

interface OrganizationSelectorProps {
  organizations: OrganizationResponse[];
  onSelectOrganization: (org: OrganizationResponse) => void;
}

function getDomainNames(domains: unknown): string[] {
  if (Array.isArray(domains)) {
    return domains.map((d) =>
      typeof d === "string"
        ? d
        : d && typeof d === "object" && "name" in d
          ? (d as { name: string }).name
          : "",
    );
  }
  return [];
}

function getOrgDescription(org: OrganizationResponse): string | undefined {
  // Use type assertion to access description which might be in attributes
  const orgAny = org as any;
  return orgAny.description ?? orgAny.attributes?.description?.[0];
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  organizations,
  onSelectOrganization,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <Building2 className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                {t('manageUsers.selectOrganization')}
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              {t('manageUsers.clickOrgToManage')}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org, index) => (
              <Card
                key={org.id}
                className="animate-fade-in hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-200 hover:border-dgrv-blue"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => onSelectOrganization(org)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-dgrv-blue" />
                    <span className="text-lg font-semibold">
                      {org.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 mb-1">
                    <b>Domains:</b> {getDomainNames(org.domains).join(", ")}
                  </div>
                  {getOrgDescription(org) && (
                    <div className="text-sm text-gray-600 mb-1">
                      <b>Description:</b> {getOrgDescription(org)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 