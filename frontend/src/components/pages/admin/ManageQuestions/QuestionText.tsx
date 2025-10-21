/**
 * @file Question text component for the Manage Questions page.
 * @description This component displays the text of a question in multiple languages.
 */
import type { OfflineQuestion } from "@/types/offline";
import React from "react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ss", name: "siSwati", flag: "🇸🇿" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
];

const QuestionText = ({
  question,
}: {
  question: OfflineQuestion;
}) => {
  const { t } = useTranslation();
  if (!question.latest_revision || !question.latest_revision.text) {
    return <em className="text-gray-500">{t('manageQuestions.noText')}</em>;
  }

  const text = question.latest_revision.text;
  const languages = Object.keys(text).filter(lang => text[lang] && text[lang].trim());

  if (languages.length === 0) {
    return <em className="text-gray-500">{t('manageQuestions.noText')}</em>;
  }

  return (
    <div className="space-y-3">
      {text.en && (
        <div className="space-y-1">
          <span className="text-sm font-medium text-gray-600 flex items-center space-x-1">
            <span>🇺🇸</span>
            <span>English</span>
          </span>
          <p className="text-gray-900 leading-relaxed">{text.en}</p>
        </div>
      )}
      
      {languages.filter(lang => lang !== 'en').map((lang) => {
        const langText = text[lang];
        if (!langText) return null;

        const langInfo = LANGUAGES.find(l => l.code === lang);

        return (
          <div key={lang} className="space-y-1">
            <span className="text-sm font-medium text-gray-600 flex items-center space-x-1">
              <span>{langInfo?.flag || '🌐'}</span>
              <span>{langInfo?.name || lang}</span>
            </span>
            <p className="text-gray-700 leading-relaxed text-sm">{langText}</p>
          </div>
        );
      })}
    </div>
  );
};

export default QuestionText;