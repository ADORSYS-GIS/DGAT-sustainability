/*
 * Header component for the review assessments page
 * Displays title, description and navigation back to dashboard
 */

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const ReviewHeader: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('reviewAssessments.backToDashboard', { defaultValue: 'Back to Dashboard' })}</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('reviewAssessments.title', { defaultValue: 'Review Assessments' })}
          </h1>
          <p className="text-gray-600">
            {t('reviewAssessments.subtitle', { defaultValue: 'Review and approve submitted assessments' })}
          </p>
        </div>
      </div>
    </div>
  );
}; 