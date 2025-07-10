import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, User, LogOut, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NavbarProps {
  onLoginClick?: () => void;
}

const languages = [
  { code: "en", key: "navbar.languages.en", flag: "🇺🇸" },
  { code: "ss", key: "navbar.languages.ss", flag: "🇸🇿" },
  { code: "pt", key: "navbar.languages.pt", flag: "🇵🇹" },
  { code: "zu", key: "navbar.languages.zu", flag: "🇿🇦" },
  { code: "de", key: "navbar.languages.de", flag: "🇩🇪" },
  { code: "fr", key: "navbar.languages.fr", flag: "🇫🇷" },
];

export const Navbar: React.FC<NavbarProps> = ({ onLoginClick }) => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");

  const currentLang =
    languages.find((lang) => lang.code === currentLanguage) || languages[0];

  const handleLanguageChange = (code: string) => {
    setCurrentLanguage(code);
    i18n.changeLanguage(code);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-dgrv-blue to-dgrv-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-dgrv-blue">
                {t("navbar.brand")}
              </h1>
              <p className="text-xs text-gray-600">{t("navbar.subtitle")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-4 flex items-center space-x-2"
              onClick={() => (window.location.href = "/")}
              aria-label={t("navbar.home")}
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">{t("navbar.home")}</span>
            </Button>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Globe className="w-4 h-4" />
                  <span>{currentLang.flag}</span>
                  <span className="hidden sm:inline">{t(currentLang.key)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className="flex items-center space-x-2"
                  >
                    <span>{lang.flag}</span>
                    <span>{t(lang.key)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};
