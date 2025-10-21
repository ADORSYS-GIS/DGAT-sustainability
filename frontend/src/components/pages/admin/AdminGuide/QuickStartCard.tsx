// /frontend/src/components/pages/admin/AdminGuide/QuickStartCard.tsx
/**
 * @file Quick start card component for the Admin Guide page.
 * @description This component displays a quick start guide with a few steps to get started.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const QuickStartCard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="mb-8 bg-dgrv-blue text-white">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6" />
          <span>{t('adminGuide.quickStart.title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>{t('adminGuide.quickStart.step1')}</p>
          <p>{t('adminGuide.quickStart.step2')}</p>
          <p>{t('adminGuide.quickStart.step3')}</p>
          <p>{t('adminGuide.quickStart.step4')}</p>
          <p>{t('adminGuide.quickStart.step5')}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickStartCard;