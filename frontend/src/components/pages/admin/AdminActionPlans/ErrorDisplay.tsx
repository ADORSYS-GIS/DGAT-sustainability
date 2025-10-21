// /frontend/src/components/pages/admin/AdminActionPlans/ErrorDisplay.tsx
/**
 * @file Error display component for the Admin Action Plans page.
 * @description This component displays an error message and a retry button when data fetching fails.
 */
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorDisplayProps {
  error: Error;
  onRetry: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error.message}</p>
          <Button onClick={onRetry} className="mt-2">
            {t('adminActionPlans.retry', { defaultValue: 'Retry' })}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;