/*
 * Error state component for review assessments page
 * Displays error message with retry functionality when loading fails
 */

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  error: Error | null;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Error loading submissions</p>
          <Button onClick={onRetry} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}; 