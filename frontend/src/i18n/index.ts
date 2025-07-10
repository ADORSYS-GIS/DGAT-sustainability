import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ss from "./locales/ss.json";
import pt from "./locales/pt.json";
import zu from "./locales/zu.json";
import de from "./locales/de.json";

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ss: { translation: ss },
  pt: { translation: pt },
  zu: { translation: zu },
  de: { translation: de },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
