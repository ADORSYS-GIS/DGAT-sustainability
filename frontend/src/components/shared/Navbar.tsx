import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, User, LogOut, Home, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import React from "react";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Get the saved language from localStorage or use i18n's current language
    return localStorage.getItem('i18n_language') || i18n.language || "en";
  });
  const { isAuthenticated, user, login, logout } = useAuth();

  const currentLang =
    languages.find((lang) => lang.code === currentLanguage) || languages[0];

  // Helper to get user display name
  const getUserDisplay = () => {
    if (!user) return t("profile");
    return (
      user.name ||
      user.preferred_username ||
      user.email ||
      t("profile")
    );
  };

  // Helper to determine the appropriate home route based on user role
  const getHomeRoute = () => {
    if (!isAuthenticated || !user) {
      return "/";
    }
    
    // Check if user has drgv_admin role
    const hasDgrvAdminRole = user.roles?.some(role => 
      role.toLowerCase() === 'drgv_admin'
    ) || user.realm_access?.roles?.some(role => 
      role.toLowerCase() === 'drgv_admin'
    );
    
    if (hasDgrvAdminRole) {
      return "/admin/dashboard";
    }
    
    
    // For org_user, org_admin, or any other authenticated user
    return "/dashboard";
  };

  const handleLanguageChange = (langCode: string) => {
    setCurrentLanguage(langCode);
    i18n.changeLanguage(langCode);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Listen for i18n language changes to keep state in sync
  React.useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(i18n.language);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-28 h-28 flex items-center justify-center">
                <img 
                  src="/dgrv.jpg" 
                  alt="DGRV Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div></div>
              {/* Desktop Home Button */}
              <Button
                variant="ghost"
                size="sm"
                className="ml-4 hidden md:flex items-center space-x-2"
                onClick={() => (window.location.href = getHomeRoute())}
                aria-label={t("home")}
              >
                <Home className="w-5 h-5" />
                <span>{t("home")}</span>
              </Button>
            </div>


            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Language Selector - Always visible */}
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

              {/* Desktop Auth/Profile */}
              <div className="hidden md:block">
                {!isAuthenticated ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={login}
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
                            user?.email ||
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

              {/* Mobile Hamburger Menu */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="md:hidden"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-blue-50 to-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 md:hidden ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-blue-100 bg-white">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img 
                  src="/dgrv.jpg" 
                  alt="DGRV Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-dgrv-blue">DGRV</h2>
                <p className="text-xs text-gray-600">{t("sustainability")}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeSidebar}
              className="p-2 hover:bg-blue-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-600" />
            </Button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 p-6 space-y-6">
            {/* Navigation Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Navigation
              </h3>
              
              {/* Home Button */}
              <Button
                variant="ghost"
                size="lg"
                className="w-full justify-start items-center space-x-4 h-12 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg"
                onClick={() => {
                  window.location.href = getHomeRoute();
                  closeSidebar();
                }}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">{t("home")}</span>
              </Button>
            </div>

            {/* Auth Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Account
              </h3>
              
              {!isAuthenticated ? (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    login();
                    closeSidebar();
                  }}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 rounded-lg font-medium"
                >
                  <User className="w-5 h-5 mr-2" />
                  {t("login")}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-800">
                          {user?.name ||
                            user?.preferred_username ||
                            user?.email ||
                            t("profile")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user?.email || t("noData")}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      logout();
                      closeSidebar();
                    }}
                    className="w-full h-12 bg-red-50 hover:bg-red-100 text-red-600 border-red-200 rounded-lg font-medium"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("logout")}
                  </Button>
                </div>
              )}
            </div>

            {/* Additional Info Section */}
            <div className="mt-auto pt-6 border-t border-blue-100">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">
                  DGRV Sustainability Platform
                </p>
                <div className="flex justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
