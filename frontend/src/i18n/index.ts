import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resources from "./resources";

// Get the saved language from localStorage or default to 'en'
const savedLanguage = localStorage.getItem("i18n_language") || "en";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Listen for language changes and save to localStorage
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("i18n_language", lng);
});

export default i18n;
