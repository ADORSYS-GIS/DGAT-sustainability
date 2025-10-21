/**
 * @file Header.tsx
 * @description This file defines the Header component for the UserGuide page.
 */
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard")}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("userGuide.backToDashboard")}</span>
        </Button>
      </div>
      <div className="flex items-center space-x-3 mb-4">
        <BookOpen className="w-8 h-8 text-dgrv-green" />
        <h1 className="text-3xl font-bold text-dgrv-blue">
          {t("userGuide.title")}
        </h1>
      </div>
      <p className="text-lg text-gray-600">{t("userGuide.subtitle")}</p>
    </div>
  );
};