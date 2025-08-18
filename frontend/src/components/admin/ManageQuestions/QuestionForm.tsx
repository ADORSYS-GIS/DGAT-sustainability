/*
 * Question form component for creating and editing assessment questions
 * Provides dialog interface with multilingual text support and category assignment
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState as useLocalState } from "react";

interface QuestionRevision {
  question_revision_id: string;
  question_id: string;
  text: Record<string, string>;
  weight: number;
  created_at: string;
}

interface QuestionWithLatestRevision {
  question_id: string;
  category: string;
  created_at: string;
  latest_revision: QuestionRevision;
}

interface Category {
  category_id: string;
  name: string;
  weight: number;
  order: number;
  template_id: string;
  created_at: string;
  updated_at: string;
}

interface QuestionFormData {
  text: Record<string, string>;
  weight: number;
  categoryName: string;
  order: number;
}

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ss", name: "siSwati", flag: "🇸🇿" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
];

interface QuestionFormProps {
  categories: Category[];
  formData: QuestionFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuestionFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  editingQuestion: QuestionWithLatestRevision | null;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  resetForm: () => void;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  categories,
  formData,
  setFormData,
  onSubmit,
  isPending,
  editingQuestion,
  isDialogOpen,
  setIsDialogOpen,
  resetForm,
}) => {
  // Track which language dropdown is open (only one at a time)
  const [openLang, setOpenLang] = useLocalState<string | null>(null);
  const { t } = useTranslation();

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        if (!open) resetForm();
        setIsDialogOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="bg-dgrv-blue hover:bg-blue-700"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("manageQuestions.addQuestion")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingQuestion
              ? t("manageQuestions.editQuestion")
              : t("manageQuestions.addQuestion")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* English always visible */}
          <div>
            <Label htmlFor="text_en">🇺🇸 English (Required)</Label>
            <Textarea
              id="text_en"
              value={formData.text["en"] || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  text: { ...prev.text, en: e.target.value },
                }))
              }
              placeholder={t("manageQuestions.questionEnPlaceholder")}
              required
            />
          </div>
          {/* Other languages as dropdowns */}
          <div className="space-y-2">
            {LANGUAGES.filter((lang) => lang.code !== "en").map((lang) => (
              <Select
                key={lang.code}
                open={openLang === lang.code}
                onOpenChange={(isOpen) =>
                  setOpenLang(isOpen ? lang.code : null)
                }
                value={openLang === lang.code ? lang.code : ""}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={lang.name}>{lang.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Label htmlFor={`text_${lang.code}`}>{lang.name}</Label>
                    <Textarea
                      id={`text_${lang.code}`}
                      value={formData.text[lang.code] || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          text: { ...prev.text, [lang.code]: e.target.value },
                        }))
                      }
                      placeholder={t(
                        "manageQuestions.questionLangPlaceholder",
                        { lang: lang.name },
                      )}
                    />
                  </div>
                </SelectContent>
              </Select>
            ))}
          </div>
          <div>
            <Label htmlFor="categoryName">
              {t("manageQuestions.category")}
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
              <SelectTrigger>
                <SelectValue
                  placeholder={t("manageQuestions.selectCategoryPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.category_id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">{t("manageQuestions.weightLabel")}</Label>
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
                required
              />
            </div>
            <div>
              <Label htmlFor="order">{t("manageQuestions.displayOrder")}</Label>
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
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-dgrv-blue hover:bg-blue-700"
            disabled={isPending}
          >
            {isPending
              ? t("manageQuestions.saving")
              : editingQuestion
                ? t("manageQuestions.updateQuestion")
                : t("manageQuestions.createQuestion")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
