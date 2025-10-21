// /frontend/src/components/pages/admin/AdminGuide/GuideHeader.tsx
/**
 * @file Header component for the Admin Guide page.
 * @description This component displays the back button, title, and subtitle for the admin guide.
 */
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const GuideHeader: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/admin/dashboard")}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('adminGuide.backToDashboard')}</span>
        </Button>
      </div>
      <div className="flex items-center space-x-3 mb-4">
        <BookOpen className="w-8 h-8 text-dgrv-blue" />
        <h1 className="text-3xl font-bold text-dgrv-blue">
          {t('adminGuide.title')}
        </h1>
      </div>
      <p className="text-lg text-gray-600">
        {t('adminGuide.subtitle')}
      </p>
    </div>
  );
};

export default GuideHeader;