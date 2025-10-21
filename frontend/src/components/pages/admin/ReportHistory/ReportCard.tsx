// /frontend/src/components/pages/admin/ReportHistory/ReportCard.tsx
/**
 * @file Card component for displaying report details.
 * @description This component renders a card with information about a report, including actions to view or download it.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { AdminReport } from '@/openapi-rq/requests/types.gen';
import { Building2, Calendar, Download, Eye, FileText } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ReportCardProps {
  report: AdminReport;
  onView: (reportId: string) => void;
  onDownload: (reportId: string, orgName: string) => void;
  index: number;
}

const ReportCard: React.FC<ReportCardProps> = ({
  report,
  onView,
  onDownload,
  index,
}) => {
  const { t } = useTranslation();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'generating':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Generating</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card
      className="animate-fade-in hover:shadow-lg transition-shadow"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-blue-50">
              <FileText className="w-5 h-5 text-dgrv-blue" />
            </div>
            <div>
              <div className="font-semibold text-dgrv-blue">{report.org_name}</div>
              <div className="text-xs text-gray-500">{t('reportHistory.reportId')}: {report.report_id}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(report.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>{report.org_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(report.generated_at).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => onView(report.report_id)} className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>{t('reportHistory.view')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDownload(report.report_id, report.org_name)} className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>{t('reportHistory.download')}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportCard;