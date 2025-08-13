/*
 * Loading state component for review assessments page
 * Displays spinner animation while submissions are being fetched
 */

export const LoadingState: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading submissions...</p>
        </div>
      </div>
    </div>
  );
}; 