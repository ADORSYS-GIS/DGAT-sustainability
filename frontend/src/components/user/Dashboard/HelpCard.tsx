/*
 * Displays help and support card with link to user guide
 * Shows support information and navigation to help resources
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface HelpCardProps {
  onViewGuide: () => void;
}

export const HelpCard: React.FC<HelpCardProps> = ({ onViewGuide }) => {
  const { t } = useTranslation();

  return (
    <Card
      className="animate-fade-in"
      style={{ animationDelay: "300ms" }}
    >
      <CardHeader>
        <CardTitle className="text-dgrv-green">{t('user.dashboard.needHelp')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {t('user.dashboard.getSupport')}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full bg-dgrv-green text-white hover:bg-green-700"
          onClick={onViewGuide}
        >
          {t('user.dashboard.viewUserGuide')}
        </Button>
      </CardContent>
    </Card>
  );
}; 