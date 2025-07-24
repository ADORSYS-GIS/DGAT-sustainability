import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, User, LogOut, Home } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ss", name: "siSwati", flag: "🇸🇿" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
];

export const Navbar = () => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");
  const { isAuthenticated, user, login, logout } = useAuth();

  const currentLang =
      languages.find((lang) => lang.code === currentLanguage) || languages[0];

  // Helper to get user display name
  const getUserDisplay = () => {
    if (!user) return t("profile");
    return (
        user.profile?.name ||
        user.profile?.email ||
        user.profile?.sub ||
        t("profile")
    );
  };

  const handleLanguageChange = (langCode: string) => {
    setCurrentLanguage(langCode);
    i18n.changeLanguage(langCode);
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
                <h1 className="text-xl font-bold text-dgrv-blue">DGRV</h1>
                <p className="text-xs text-gray-600">{t("sustainability")}</p>
              </div>
              <Button
                  variant="ghost"
                  size="sm"
                  className="ml-4 flex items-center space-x-2"
                  onClick={() => (window.location.href = "/")}
                  aria-label={t("home")}
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">{t("home")}</span>
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
                    <span className="hidden sm:inline">{currentLang.name}</span>
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
                        <span>{lang.name}</span>
                      </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Auth/Profile */}
              {!isAuthenticated ? (
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        login();
                      }}
                      className="ml-2"
                  >
                    {t("login")}
                  </Button>
              ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2 ml-2"
                      >
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">{getUserDisplay()}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                          disabled
                          className="flex flex-col items-start"
                      >
                    <span className="font-semibold">
                      {user?.name ||
                          user?.preferred_username ||
                          user?.sub ||
                          t("profile")}
                    </span>
                        <span className="text-xs text-gray-500">
                      {user?.email || t("noData")}
                    </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                          onClick={logout}
                          className="flex items-center space-x-2 text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t("logout")}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </nav>
  );
};