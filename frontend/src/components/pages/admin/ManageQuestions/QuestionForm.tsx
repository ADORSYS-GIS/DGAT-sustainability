/**
 * @file Question form component for the Manage Questions page.
 * @description This component provides a form for creating and editing questions.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OfflineCategoryCatalog, OfflineQuestion } from "@/types/offline";
import { FileText, Globe, Layers, Sparkles, Target } from "lucide-react";
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

export interface QuestionFormData {
  text: Record<string, string>;
  weight: number;
  categoryName: string;
  order: number;
}

interface QuestionFormProps {
  categories: OfflineCategoryCatalog[];
  selectedCategory?: string;
  formData: QuestionFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuestionFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  editingQuestion: OfflineQuestion | null;
  onCancel: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  categories,
  selectedCategory,
  formData,
  setFormData,
  onSubmit,
  isPending,
  editingQuestion,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="text-center pb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          {editingQuestion ? t('manageQuestions.editQuestion') : t('manageQuestions.addNewQuestion')}
        </h3>
        {selectedCategory && (
          <p className="text-sm text-gray-500 mt-1">
            Adding to category: <span className="font-medium text-blue-600">{selectedCategory}</span>
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          {t('manageQuestions.category')} <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.categoryName}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              categoryName: value,
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('manageQuestions.selectCategoryPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.category_catalog_id} value={category.name}>
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-gray-500" />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="text_en" className="text-sm font-medium text-gray-700">
          🇺🇸 English Question <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="text_en"
          value={formData.text["en"] || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              text: { ...prev.text, en: e.target.value },
            }))
          }
          placeholder="Enter the question in English..."
          className="min-h-[100px] resize-none"
          required
        />
      </div>
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
          <Globe className="w-4 h-4" />
          <span>Additional Languages (Optional)</span>
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {LANGUAGES.filter((lang) => lang.code !== "en").map((lang) => (
            <div key={lang.code} className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 flex items-center space-x-1">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </Label>
              <Textarea
                id={`text_${lang.code}`}
                value={formData.text[lang.code] || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    text: { ...prev.text, [lang.code]: e.target.value },
                  }))
                }
                placeholder={`Enter the question in ${lang.name}...`}
                className="min-h-[80px] resize-none text-sm"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weight" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
            <Target className="w-4 h-4" />
            <span>{t('manageQuestions.weightLabel')}</span>
          </Label>
          <Input
            id="weight"
            type="number"
            min="1"
            max="10"
            value={formData.weight}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                weight: parseInt(e.target.value) || 1,
              }))
            }
            className="text-center"
            required
          />
          <p className="text-xs text-gray-500">Higher weight = more important</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="order" className="text-sm font-medium text-gray-700">
            {t('manageQuestions.displayOrder')}
          </Label>
          <Input
            id="order"
            type="number"
            min="1"
            value={formData.order}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                order: parseInt(e.target.value) || 1,
              }))
            }
            className="text-center"
            required
          />
          <p className="text-xs text-gray-500">Display sequence</p>
        </div>
      </div>
      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isPending}
        >
          Cancel
        </Button>
      <Button
        type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        disabled={isPending}
      >
          {isPending ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>{editingQuestion ? 'Update Question' : 'Create Question'}</span>
            </div>
          )}
      </Button>
      </div>
    </form>
  );
};

export default QuestionForm;