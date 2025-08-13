/*
 * Organization list component for displaying and managing organizations
 * Shows organization cards with edit/delete actions in a grid layout
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OrganizationDomain {
  name: string;
  verified?: boolean;
}

interface OrganizationResponseFixed {
  id: string;
  name: string;
  alias?: string;
  enabled: boolean;
  description?: string | null;
  redirectUrl?: string | null;
  domains?: OrganizationDomain[];
  attributes?: { [key: string]: string[] };
}

interface OrganizationListProps {
  organizations: OrganizationResponseFixed[];
  onEdit: (org: OrganizationResponseFixed) => void;
  onDelete: (orgId: string) => void;
  isPending: boolean;
}

export const OrganizationList: React.FC<OrganizationListProps> = ({
  organizations,
  onEdit,
  onDelete,
  isPending,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {organizations.map((org, index) => (
        <Card
          key={org.id}
          className="animate-fade-in hover:shadow-lg transition-shadow"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-dgrv-blue/10">
                <Building2 className="w-5 h-5 text-dgrv-blue" />
              </div>
              <span className="text-lg">{org.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {org.domains && org.domains.length > 0 && (
                <div className="text-sm text-gray-600">
                  <b>{t('manageOrganizations.domains', { defaultValue: 'Domains' })}:</b>{" "}
                  {org.domains.map((d) => d.name).join(", ")}
                </div>
              )}
              {org.description && (
                <div className="text-sm text-gray-600">
                  <b>{t('manageOrganizations.description', { defaultValue: 'Description' })}:</b> {org.description}
                </div>
              )}
              <div className="flex space-x-2 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(org)}
                  className="flex-1"
                  disabled={isPending}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {t('manageOrganizations.edit', { defaultValue: 'Edit' })}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(org.id)}
                  className="text-red-600 hover:bg-red-50"
                  disabled={isPending}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('manageOrganizations.delete', { defaultValue: 'Delete' })}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {organizations.length === 0 && (
        <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
          <CardContent>
            <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('manageOrganizations.noOrganizations', { defaultValue: 'No organizations yet' })}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('manageOrganizations.getStarted', { defaultValue: 'Create your first organization to get started.' })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 