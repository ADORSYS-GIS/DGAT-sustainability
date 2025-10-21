/**
 * @file QuickStartCard.tsx
 * @description This file defines the QuickStartCard component for the UserGuide page.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";

export const QuickStartCard = () => {
  const { t } = useTranslation();

  return (
    <Card className="mb-8 bg-dgrv-green text-white">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <Play className="w-6 h-6" />
          <span>{t("userGuide.quickStart.title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>{t("userGuide.quickStart.step1")}</p>
          <p>{t("userGuide.quickStart.step2")}</p>
          <p>{t("userGuide.quickStart.step3")}</p>
          <p>{t("userGuide.quickStart.step4")}</p>
          <p>{t("userGuide.quickStart.step5")}</p>
        </div>
      </CardContent>
    </Card>
  );
};