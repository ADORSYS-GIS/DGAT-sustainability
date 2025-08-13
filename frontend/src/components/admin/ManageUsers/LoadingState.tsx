/*
 * Loading state component for user management page
 * Displays spinner animation while data is being fetched
 */

export const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
      </div>
    </div>
  );
}; 