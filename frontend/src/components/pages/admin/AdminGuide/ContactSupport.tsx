// /frontend/src/components/pages/admin/AdminGuide/ContactSupport.tsx
/**
 * @file Contact support component for the Admin Guide page.
 * @description This component displays a card with contact information for support.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const ContactSupport: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="mt-8 border-dgrv-blue border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3 text-dgrv-blue">
          <HelpCircle className="w-6 h-6" />
          <span>{t('adminGuide.contactInfo.title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          {t('adminGuide.contactInfo.description')}
        </p>
        <div className="space-y-2">
          <p>{t('adminGuide.contactInfo.email')}</p>
          <p>{t('adminGuide.contactInfo.phone')}</p>
          <p>{t('adminGuide.contactInfo.website')}</p>
          <p>{t('adminGuide.contactInfo.documentation')}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactSupport;