// /frontend/src/components/pages/admin/ReportHistory/OrganizationSelector.tsx
/**
 * @file Component for selecting an organization to view reports.
 * @description This component displays a grid of organizations, allowing the admin to select one to view its reports.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminReport } from '@/openapi-rq/requests/types.gen';
import { Building2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface OrganizationSelectorProps {
  reports: AdminReport[];
  selectedOrgId: string | null;
  onSelectOrg: (orgId: string | null) => void;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  reports,
  selectedOrgId,
  onSelectOrg,
}) => {
  const { t } = useTranslation();

  const organizations = Array.from(new Map(reports.map(r => [r.org_id, r.org_name])).entries());

  return (
    <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="w-5 h-5 text-dgrv-blue" />
          <span className="font-medium text-gray-700">{t('reportHistory.organizations')}</span>
        </div>
        {selectedOrgId && (
          <Button variant="outline" size="sm" onClick={() => onSelectOrg(null)}>
            {t('reportHistory.backToOrganizations')}
          </Button>
        )}
      </div>
      {!selectedOrgId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {organizations.map(([orgId, orgName]) => (
            <Card key={orgId} className="hover:shadow-md cursor-pointer" onClick={() => onSelectOrg(orgId)}>
              <CardHeader>
                <CardTitle className="text-dgrv-blue text-base">{orgName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  {t('reportHistory.reportsFound')}: {reports.filter(r => r.org_id === orgId).length}
                </div>
              </CardContent>
            </Card>
          ))}
          {reports.length === 0 && (
            <div className="text-center text-gray-500 py-8 col-span-full">
              {t('reportHistory.noReports')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationSelector;