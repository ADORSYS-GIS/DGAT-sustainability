/*
 * Displays export reports card with PDF export functionality
 * Shows export button and handles loading states for report generation
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ExportReportsProps {
  onExportPDF: () => void;
  isLoading: boolean;
  hasReports: boolean;
}

export const ExportReports: React.FC<ExportReportsProps> = ({
  onExportPDF,
  isLoading,
  hasReports,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="w-5 h-5 text-dgrv-blue" />
          <span>{t("user.dashboard.exportReports")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {t("user.dashboard.downloadReportsDescription")}
        </p>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onExportPDF}
            disabled={isLoading || !hasReports}
          >
            {t("user.dashboard.exportAsPDF")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
