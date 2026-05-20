import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { RecommendationFormValues } from "@/utils/reportRecommendations";

export type RecommendationFormMode = "add" | "edit";

interface RecommendationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: RecommendationFormMode;
  categories: string[];
  initialValues?: RecommendationFormValues;
  isSubmitting?: boolean;
  onSubmit: (values: RecommendationFormValues) => void | Promise<void>;
}

export const RecommendationFormDialog: React.FC<RecommendationFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  categories,
  initialValues,
  isSubmitting = false,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [category, setCategory] = React.useState("");
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setCategory(initialValues?.category ?? categories[0] ?? "");
      setText(initialValues?.text ?? "");
    }
  }, [open, initialValues, categories]);

  const noCategories = categories.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (category && text.trim()) {
              await onSubmit({ category, text: text.trim() });
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-dgrv-blue">
              {t(
                mode === "add"
                  ? "user.actionPlan.recommendationForm.addTitle"
                  : "user.actionPlan.recommendationForm.editTitle"
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                mode === "add"
                  ? "user.actionPlan.recommendationForm.addDescription"
                  : "user.actionPlan.recommendationForm.editDescription"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {noCategories ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {t("user.actionPlan.recommendationForm.noCategories")}
              </p>
            ) : (
              <div className="space-y-2">
                <Label>{t("user.actionPlan.recommendationForm.categoryLabel")}</Label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "user.actionPlan.recommendationForm.categoryPlaceholder"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("user.actionPlan.recommendationForm.textLabel")}</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("user.actionPlan.recommendationForm.textPlaceholder")}
                rows={5}
                disabled={isSubmitting || noCategories}
                className="min-h-[120px] resize-y"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-dgrv-green hover:bg-green-700"
              disabled={isSubmitting || noCategories || !text.trim() || !category}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t(
                mode === "add"
                  ? "user.actionPlan.recommendationForm.addButton"
                  : "user.actionPlan.recommendationForm.saveButton"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
