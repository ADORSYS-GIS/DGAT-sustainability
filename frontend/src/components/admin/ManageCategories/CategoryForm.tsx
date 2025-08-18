/*
 * Category form component for creating and editing assessment categories
 * Provides dialog interface with form validation and weight management
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Category {
  category_id: string;
  name: string;
  weight: number;
  order: number;
  template_id: string;
  created_at: string;
  updated_at: string;
}

interface CategoryFormProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editingCategory: Category | null;
  setEditingCategory: (category: Category | null) => void;
  formData: {
    name: string;
    weight: number;
    order: number;
  };
  setFormData: (data: { name: string; weight: number; order: number }) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isPending: boolean;
  totalWeight: number;
  categoriesLength: number;
  calculateDefaultWeight: () => number;
  showDialogWeightError: boolean;
  setShowDialogWeightError: (show: boolean) => void;
  redistributeWeights: (includeNewCategory?: boolean) => Promise<void>;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  isDialogOpen,
  setIsDialogOpen,
  editingCategory,
  setEditingCategory,
  formData,
  setFormData,
  onSubmit,
  isPending,
  totalWeight,
  categoriesLength,
  calculateDefaultWeight,
  showDialogWeightError,
  setShowDialogWeightError,
  redistributeWeights,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-dgrv-blue hover:bg-blue-700"
          onClick={() => {
            setEditingCategory(null);
            const defaultWeight = calculateDefaultWeight();
            setFormData({
              name: "",
              weight: defaultWeight,
              order: categoriesLength + 1,
            });
            setShowDialogWeightError(false);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("manageCategories.addCategory")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCategory
              ? t("manageCategories.editCategory")
              : t("manageCategories.addCategory")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t("manageCategories.categoryName")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              placeholder={t("manageCategories.categoryNamePlaceholder")}
              required
            />
          </div>
          <div>
            <Label htmlFor="weight">{t("manageCategories.weight")}</Label>
            <Input
              id="weight"
              type="number"
              min="1"
              max="100"
              value={formData.weight}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  weight: parseInt(e.target.value) || 0,
                })
              }
              required
            />
            {!editingCategory && (
              <p className="text-sm text-gray-600 mt-1">
                {t("manageCategories.currentTotal", {
                  current: totalWeight,
                  new: totalWeight + formData.weight,
                  defaultValue: `Current total: ${totalWeight}% | New total: ${totalWeight + formData.weight}%`,
                })}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="order">{t("manageCategories.displayOrder")}</Label>
            <Input
              id="order"
              type="number"
              min="1"
              value={formData.order}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  order: parseInt(e.target.value) || 1,
                })
              }
              required
            />
          </div>
          {showDialogWeightError && (
            <div className="text-red-600 text-center space-y-2">
              <p>{t("manageCategories.weightExceedsError")}</p>
              <Button
                type="button"
                variant="outline"
                className="bg-dgrv-blue text-white hover:bg-blue-700"
                onClick={() => {
                  redistributeWeights(true);
                  setShowDialogWeightError(false);
                }}
              >
                {t("manageCategories.redistributeWeights")}
              </Button>
            </div>
          )}
          {!showDialogWeightError &&
            !editingCategory &&
            totalWeight + formData.weight !== 100 && (
              <div className="text-yellow-600 text-center space-y-2">
                <p>
                  {t("manageCategories.totalWeightNot100ForNew", {
                    total: totalWeight + formData.weight,
                    defaultValue: `Total weight will be ${totalWeight + formData.weight}%. Must equal 100%.`,
                  })}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-dgrv-blue text-white hover:bg-blue-700"
                  onClick={() => {
                    redistributeWeights(true);
                  }}
                >
                  {t("manageCategories.redistributeWeights")}
                </Button>
              </div>
            )}
          <Button
            type="submit"
            className="w-full bg-dgrv-blue hover:bg-blue-700"
            disabled={
              showDialogWeightError ||
              isPending ||
              (!editingCategory && totalWeight + formData.weight !== 100)
            }
          >
            {isPending
              ? t("manageCategories.saving", { defaultValue: "Saving..." })
              : editingCategory
                ? t("manageCategories.updateCategory")
                : t("manageCategories.createCategory")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
