// /frontend/src/components/pages/admin/ManageOrganizations/OrganizationCard.tsx
/**
 * @file Card component for displaying organization details.
 * @description This component renders a card with information about an organization, including actions to edit, delete, or assign categories.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrganizationResponse } from '@/openapi-rq/requests/types.gen';
import { Building2, Edit, ListTree, Trash2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface OrganizationCardProps {
  org: OrganizationResponse;
  onEdit: (org: OrganizationResponse) => void;
  onDelete: (org: OrganizationResponse) => void;
  onAssign: (org: OrganizationResponse) => void;
  index: number;
}

const OrganizationCard: React.FC<OrganizationCardProps> = ({
  org,
  onEdit,
  onDelete,
  onAssign,
  index,
}) => {
  const { t } = useTranslation();

  return (
    <Card
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
        <div className="space-y-4">
          {org.domains && org.domains.length > 0 && (
            <div className="text-sm text-gray-600">
              <b>{t('manageOrganizations.domains')}:</b>{" "}
              {org.domains
                .map((d: { name: string } | string) => (typeof d === 'string' ? d : d.name))
                .join(", ")}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex flex-col space-y-2 w-full">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(org)}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-1" />
              {t('manageOrganizations.edit')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(org)}
              className="text-red-600 hover:bg-red-50 flex-1"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('manageOrganizations.delete')}
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAssign(org)}
            className="w-full"
          >
            <ListTree className="w-4 h-4 mr-1" />
            {t('manageOrganizations.assignCategories')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default OrganizationCard;