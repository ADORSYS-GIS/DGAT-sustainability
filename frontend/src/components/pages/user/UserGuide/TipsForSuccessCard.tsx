/**
 * @file TipsForSuccessCard.tsx
 * @description This file defines the TipsForSuccessCard component for the UserGuide page.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

export const TipsForSuccessCard = () => {
  const { t } = useTranslation();

  return (
    <Card className="mt-8 bg-dgrv-blue text-white">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <Star className="w-6 h-6" />
          <span>{t("userGuide.tipsForSuccess.title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">
              {t("userGuide.tipsForSuccess.beforeStarting.title")}
            </h4>
            <ul className="space-y-1 text-sm">
              {(
                t("userGuide.tipsForSuccess.beforeStarting.items", {
                  returnObjects: true,
                }) as string[]
              ).map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">
              {t("userGuide.tipsForSuccess.duringAssessment.title")}
            </h4>
            <ul className="space-y-1 text-sm">
              {(
                t("userGuide.tipsForSuccess.duringAssessment.items", {
                  returnObjects: true,
                }) as string[]
              ).map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};