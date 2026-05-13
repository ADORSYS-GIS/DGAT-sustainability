import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { useTranslation } from "react-i18next";

/**
 * Displays a message when the user is not authorized to access a page.
 */

const Unauthorized = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-red-600 mb-4">{t("staticText.unauthorized.title")}</h1>
      <p className="mb-6 text-gray-700">
        {t("staticText.unauthorized.description")}
      </p>
      <Button onClick={() => navigate("/")}>{t("staticText.unauthorized.goHome")}</Button>
    </div>
  );
};

export default Unauthorized;
