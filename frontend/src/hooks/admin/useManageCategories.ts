import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useOfflineCategories,
  useOfflineCategoriesMutation,
  useOfflineSyncStatus,
} from "@/hooks/useOfflineApi";

const SUSTAINABILITY_TEMPLATE_ID = "sustainability_template_1";

interface Category {
  category_id: string;
  name: string;
  weight: number;
  order: number;
  template_id: string;
  created_at: string;
  updated_at: string;
}

export const useManageCategories = () => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    weight: 25,
    order: 1,
  });
  const [showDialogWeightError, setShowDialogWeightError] = useState(false);

  const {
    data: categoriesData,
    isLoading,
    error,
    refetch,
  } = useOfflineCategories();
  const categories = categoriesData?.categories || [];

  const mutationHooks = useOfflineCategoriesMutation();
  const createCategory = mutationHooks.createCategory.mutate;
  const updateCategory = mutationHooks.updateCategory.mutate;
  const deleteCategory = mutationHooks.deleteCategory.mutate;
  const isPending =
    mutationHooks.createCategory.isPending ||
    mutationHooks.updateCategory.isPending ||
    mutationHooks.deleteCategory.isPending;

  const { isOnline } = useOfflineSyncStatus();

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const totalWeight = sortedCategories.reduce(
    (sum, cat) => sum + cat.weight,
    0,
  );
  const weightExceeds = totalWeight > 100;
  const weightNot100 = totalWeight !== 100;

  const calculateDefaultWeight = () => {
    if (sortedCategories.length === 0) return 100;
    const remainingWeight = 100 - totalWeight;
    return Math.max(
      1,
      Math.floor(remainingWeight / (sortedCategories.length + 1)),
    );
  };

  const redistributeWeights = async (includeNewCategory = false) => {
    let cats = sortedCategories;

    if (includeNewCategory && !editingCategory) {
      const tempCat = {
        category_id: "temp",
        name: formData.name || t("manageCategories.newCategory"),
        weight: 0,
        order: formData.order || cats.length + 1,
        template_id: SUSTAINABILITY_TEMPLATE_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      cats = [...cats, tempCat];
    }

    const totalCats = cats.length;
    if (totalCats === 0) return;

    const newWeight = Math.floor(100 / totalCats);
    const remainder = 100 % totalCats;

    const updatedCategories = cats.map((cat, index) => ({
      ...cat,
      weight: newWeight + (index < remainder ? 1 : 0),
    }));

    for (const cat of updatedCategories) {
      if (cat.category_id !== "temp") {
        await updateCategory(
          cat.category_id,
          {
            name: cat.name,
            weight: cat.weight,
            order: cat.order,
          },
          {
            onSuccess: () => {
              // Category updated successfully
            },
            onError: (error) => {
              console.error(`Failed to update category ${cat.name}:`, error);
            },
          },
        );
      }
    }

    if (includeNewCategory && !editingCategory) {
      const newCatWeight =
        updatedCategories.find((cat) => cat.category_id === "temp")?.weight ||
        25;
      setFormData((prev) => ({ ...prev, weight: newCatWeight }));
    }

    await refetch();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newTotalWeight =
      totalWeight + formData.weight - (editingCategory?.weight || 0);
    if (newTotalWeight > 100) {
      setShowDialogWeightError(true);
      return;
    }

    if (!editingCategory && newTotalWeight !== 100) {
      toast.error(
        t("manageCategories.totalWeightMustBe100", {
          defaultValue:
            "Total weight must equal 100%. Please adjust the weights or use the redistribute button.",
        }),
      );
      return;
    }

    if (editingCategory) {
      await updateCategory(
        editingCategory.category_id,
        {
          name: formData.name,
          weight: formData.weight,
          order: formData.order,
        },
        {
          onSuccess: () => {
            toast.success(
              t("manageCategories.updateSuccess", {
                defaultValue: "Category updated successfully",
              }),
            );
            setIsDialogOpen(false);
            setEditingCategory(null);
            setFormData({ name: "", weight: 25, order: 1 });
            refetch();
          },
          onError: (error) => {
            toast.error(
              t("manageCategories.updateError", {
                defaultValue: "Failed to update category",
              }),
            );
          },
        },
      );
    } else {
      await createCategory(
        {
          name: formData.name,
          weight: formData.weight,
          order: formData.order,
          template_id: SUSTAINABILITY_TEMPLATE_ID,
        },
        {
          onSuccess: () => {
            toast.success(
              t("manageCategories.createSuccess", {
                defaultValue: "Category created successfully",
              }),
            );
            setIsDialogOpen(false);
            setFormData({ name: "", weight: 25, order: categories.length + 1 });
            refetch();
          },
          onError: (error) => {
            toast.error(
              t("manageCategories.createError", {
                defaultValue: "Failed to create category",
              }),
            );
          },
        },
      );
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      weight: category.weight,
      order: category.order,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (
      !window.confirm(
        t("manageCategories.confirmDelete", {
          defaultValue:
            "Are you sure you want to delete this category? This will also delete all questions in this category. Note: Any existing submissions containing responses to these questions will be preserved, but the individual response records will be removed.",
        }),
      )
    )
      return;

    await deleteCategory(categoryId, {
      onSuccess: () => {
        toast.success(
          t("manageCategories.deleteSuccess", {
            defaultValue: "Category deleted successfully",
          }),
        );
        refetch();
      },
      onError: (error) => {
        toast.error(
          t("manageCategories.deleteError", {
            defaultValue: "Failed to delete category",
          }),
        );
      },
    });
  };

  return {
    // State
    isDialogOpen,
    setIsDialogOpen,
    editingCategory,
    setEditingCategory,
    formData,
    setFormData,
    showDialogWeightError,
    setShowDialogWeightError,

    // Data
    categories: sortedCategories,
    isLoading,
    error,
    isPending,
    isOnline,

    // Computed values
    totalWeight,
    weightExceeds,
    weightNot100,

    // Functions
    calculateDefaultWeight,
    redistributeWeights,
    handleSubmit,
    handleEdit,
    handleDelete,
    refetch,
  };
};
