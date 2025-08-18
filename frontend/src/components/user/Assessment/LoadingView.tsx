import { useTranslation } from "react-i18next";

interface LoadingViewProps {
  creationAttempts?: number;
  isCreating?: boolean;
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  creationAttempts = 0,
  isCreating = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
        <p className="text-gray-600">
          {isCreating
            ? t("assessment.creating", {
                defaultValue: "Creating assessment...",
              })
            : t("loading")}
        </p>
        {isCreating && (
          <>
            <p className="text-sm text-gray-500 mt-2">
              {t("assessment.pleaseWait", {
                defaultValue: "Please wait while we set up your assessment.",
              })}
            </p>
            {creationAttempts > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {t("assessment.attempt", { defaultValue: "Attempt" })}{" "}
                {creationAttempts}/3
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
