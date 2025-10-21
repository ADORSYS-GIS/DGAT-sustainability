/**
 * @file DashboardSidebar.tsx
 * @description This file defines the sidebar component for the Dashboard page.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, HelpCircle } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface DashboardSidebarProps {
  onExportPDF: () => void;
  onExportDOCX: () => void;
  isLoading: boolean;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  onExportPDF,
  onExportDOCX,
  isLoading,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
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
              disabled={isLoading}
            >
              {t("user.dashboard.exportAsPDF")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={onExportDOCX}
              disabled={isLoading}
            >
              {t("user.dashboard.exportAsDOCX")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
        <CardHeader>
          <CardTitle className="text-dgrv-green">
            {t("user.dashboard.needHelp")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {t("user.dashboard.getSupport")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-dgrv-green text-white hover:bg-green-700"
            onClick={() => navigate("/user/guide")}
          >
            {t("user.dashboard.viewUserGuide")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};