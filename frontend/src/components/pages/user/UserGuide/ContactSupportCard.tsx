/**
 * @file ContactSupportCard.tsx
 * @description This file defines the ContactSupportCard component for the UserGuide page.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const ContactSupportCard = () => {
  const { t } = useTranslation();

  return (
    <Card className="mt-8 border-dgrv-green border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3 text-dgrv-green">
          <HelpCircle className="w-6 h-6" />
          <span>{t("userGuide.needHelp.title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">{t("userGuide.needHelp.description")}</p>
        <div className="space-y-2">
          <p>{t("userGuide.needHelp.email")}</p>
          <p>{t("userGuide.needHelp.phone")}</p>
          <p>{t("userGuide.needHelp.website")}</p>
          <p>{t("userGuide.needHelp.contactAdmin")}</p>
        </div>
      </CardContent>
    </Card>
  );
};