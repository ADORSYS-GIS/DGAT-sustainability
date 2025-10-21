// /frontend/src/components/pages/admin/AdminGuide/BestPractices.tsx
/**
 * @file Best practices component for the Admin Guide page.
 * @description This component displays a card with best practices for administrators.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const BestPractices: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="mt-8 bg-dgrv-green text-white">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <Star className="w-6 h-6" />
          <span>{t('adminGuide.bestPractices.title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">{t('adminGuide.bestPractices.regularReviews.title')}</h4>
            <ul className="space-y-1 text-sm">
              {(t('adminGuide.bestPractices.regularReviews.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">{t('adminGuide.bestPractices.qualityAssurance.title')}</h4>
            <ul className="space-y-1 text-sm">
              {(t('adminGuide.bestPractices.qualityAssurance.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BestPractices;