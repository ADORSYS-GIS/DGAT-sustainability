import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CategoriesService } from "@/openapi-rq/requests/services.gen";
import type { 
  GetCategoriesResponse, 
  PostCategoriesData, 
  PutCategoriesByCategoryIdData,
  DeleteCategoriesByCategoryIdData 
} from "@/openapi-rq/requests/types.gen";

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

interface ApiError {
  message?: string;
  detail?: string;
}

export const ManageCategories: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    weight: 25,
    order: 1,
  });
  // State for add/edit dialog weight error
  const [showDialogWeightError, setShowDialogWeightError] = useState(false);

  // Fetch categories from API
  const { data: categoriesData, isLoading, error } = useQuery<GetCategoriesResponse>({
    queryKey: ["categories"],
    queryFn: () => CategoriesService.getCategories(),
  });

  const categories = categoriesData?.categories || [];

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: PostCategoriesData['requestBody']) =>
      CategoriesService.postCategories({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(t('manageCategories.categoryCreated', { defaultValue: 'Category created successfully!' }), {
        className: "bg-dgrv-green text-white",
      });
      setIsDialogOpen(false);
      setEditingCategory(null);
    },
    onError: (error: ApiError) => {
      toast.error(error?.message || t('manageCategories.createError', { defaultValue: 'Failed to create category' }));
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: (data: PutCategoriesByCategoryIdData) =>
      CategoriesService.putCategoriesByCategoryId(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(t('manageCategories.categoryUpdated', { defaultValue: 'Category updated successfully!' }), {
        className: "bg-dgrv-green text-white",
      });
      setIsDialogOpen(false);
      setEditingCategory(null);
    },
    onError: (error: ApiError) => {
      toast.error(error?.message || t('manageCategories.updateError', { defaultValue: 'Failed to update category' }));
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (data: DeleteCategoriesByCategoryIdData) => 
      CategoriesService.deleteCategoriesByCategoryId(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(t('manageCategories.categoryDeleted', { defaultValue: 'Category deleted successfully!' }), {
        className: "bg-dgrv-green text-white",
      });
    },
    onError: (error: ApiError) => {
      toast.error(error?.message || t('manageCategories.deleteError', { defaultValue: 'Failed to delete category' }));
    },
  });

  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  // Calculate total weight
  const totalWeight = sortedCategories.reduce(
    (sum, cat) => sum + cat.weight,
    0,
  );
  const weightExceeds = totalWeight > 100;
  const weightNot100 = totalWeight !== 100;

  // Evenly redistribute weights, optionally including a new category
  const redistributeWeights = async (includeNewCategory = false) => {
    let cats = sortedCategories;
    let newCat: Category | null = null;
    
    if (includeNewCategory && !editingCategory) {
      // For redistribution including new category, we just calculate the weight
      // but don't actually create the category yet
      const tempCat = {
        category_id: "temp",
        name: formData.name || "New Category",
        weight: 0,
        order: formData.order || cats.length + 1,
        template_id: SUSTAINABILITY_TEMPLATE_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      cats = [...cats, tempCat];
      newCat = tempCat;
    }

    const n = cats.length;
    if (n === 0) return;
    
    const base = Math.floor(100 / n);
    const remainder = 100 - base * n;
    
    // Update existing categories with new weights
    const updatePromises = cats
      .filter(cat => cat.category_id !== "temp")
      .map((cat, i) => {
        const newWeight = base + (i < remainder ? 1 : 0);
        return updateCategoryMutation.mutateAsync({
          categoryId: cat.category_id,
          requestBody: { weight: newWeight }
        });
      });

    try {
      await Promise.all(updatePromises);
      
      // If we just redistributed including a new category, update the form weight
      if (includeNewCategory && newCat) {
        const idx = cats.findIndex(cat => cat.category_id === "temp");
        const newWeight = base + (idx < remainder ? 1 : 0);
        setFormData(prev => ({ ...prev, weight: newWeight }));
      }
      
      toast.success(t('manageCategories.weightsRedistributed', { defaultValue: 'Weights redistributed evenly.' }), {
        className: "bg-dgrv-green text-white",
      });
    } catch (error) {
      toast.error(t('manageCategories.redistributeError', { defaultValue: 'Failed to redistribute weights' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If editing, subtract old weight, else just add new
    let newTotal = formData.weight;
    if (editingCategory) {
      newTotal = totalWeight - editingCategory.weight + formData.weight;
    } else {
      newTotal = totalWeight + formData.weight;
    }
    
    if (newTotal > 100) {
      setShowDialogWeightError(true);
      return;
    }
    
    setShowDialogWeightError(false);

    if (editingCategory) {
      updateCategoryMutation.mutate({
        categoryId: editingCategory.category_id,
        requestBody: {
          name: formData.name,
          weight: formData.weight,
          order: formData.order,
        }
      });
    } else {
      createCategoryMutation.mutate({
        name: formData.name,
        weight: formData.weight,
        order: formData.order,
        template_id: SUSTAINABILITY_TEMPLATE_ID,
      });
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
    if (!window.confirm(t('manageCategories.confirmDelete', { defaultValue: 'Are you sure you want to delete this category?' })))
      return;
    
    deleteCategoryMutation.mutate({ categoryId });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              {t('manageCategories.loadError', { defaultValue: 'Error Loading Categories' })}
            </h2>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : t('manageCategories.unknownError', { defaultValue: 'An unknown error occurred' })}
            </p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["categories"] })}
              className="bg-dgrv-blue hover:bg-blue-700"
            >
              {t('manageCategories.retry', { defaultValue: 'Retry' })}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <List className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue mb-6">
                {t('manageCategories.title')}
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              {t('manageCategories.configureCategories')}
            </p>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('manageCategories.categories')}</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-dgrv-blue hover:bg-blue-700"
                    onClick={() => {
                      setEditingCategory(null);
                      setFormData({
                        name: "",
                        weight: 25,
                        order: categories.length + 1,
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('manageCategories.addCategory')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? t('manageCategories.editCategory') : t('manageCategories.addCategory')}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">{t('manageCategories.categoryName')}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder={t('manageCategories.categoryNamePlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">{t('manageCategories.weight')}</Label>
                      <Input
                        id="weight"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.weight}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            weight: parseInt(e.target.value) || 0,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="order">{t('manageCategories.displayOrder')}</Label>
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
                    {showDialogWeightError && (
                      <div className="text-red-600 text-center space-y-2">
                        <p>
                          {t('manageCategories.weightExceedsError')}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-dgrv-blue text-white hover:bg-blue-700"
                          onClick={() => {
                            redistributeWeights(true); // include new category
                            setShowDialogWeightError(false);
                          }}
                        >
                          {t('manageCategories.redistributeWeights')}
                        </Button>
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full bg-dgrv-blue hover:bg-blue-700"
                      disabled={showDialogWeightError || createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    >
                      {editingCategory ? t('manageCategories.updateCategory') : t('manageCategories.createCategory')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedCategories.map((category) => (
                  <div
                    key={category.category_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-lg">{category.name}</h3>
                      <p className="text-sm text-gray-600">
                        {t('manageCategories.weightLabel', { weight: category.weight, order: category.order })}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        disabled={updateCategoryMutation.isPending}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category.category_id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteCategoryMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* Show error and redistribute button if needed */}
                {weightExceeds && (
                  <div className="text-center py-4 text-red-600">
                    <p className="mb-2">
                      {t('manageCategories.totalWeightExceeds')}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => redistributeWeights()}
                      className="bg-dgrv-blue text-white hover:bg-blue-700"
                      disabled={updateCategoryMutation.isPending}
                    >
                      {t('manageCategories.redistributeWeights')}
                    </Button>
                  </div>
                )}
                {!weightExceeds &&
                  weightNot100 &&
                  sortedCategories.length > 0 && (
                    <div className="text-center py-4 text-yellow-600">
                      <p>
                        {t('manageCategories.totalWeightNot100', { total: totalWeight })}
                      </p>
                    </div>
                  )}
                {sortedCategories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {t('manageCategories.noCategoriesYet')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
