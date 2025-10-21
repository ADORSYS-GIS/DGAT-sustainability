// /frontend/src/components/pages/admin/AdminActionPlans/NoOrganizations.tsx
/**
 * @file Component to display when no organizations with action plans are found.
 * @description This component renders a message indicating that no organizations with recommendations are available.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const NoOrganizations: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="col-span-full text-center py-12">
      <CardContent>
        <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('adminActionPlans.noOrganizations', { defaultValue: 'No organizations with action plans' })}
        </h3>
        <p className="text-gray-600">
          {t('adminActionPlans.noOrganizationsDesc', { defaultValue: 'Organizations with recommendations will appear here' })}
        </p>
      </CardContent>
    </Card>
  );
};

export default NoOrganizations;