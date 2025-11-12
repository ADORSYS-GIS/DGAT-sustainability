import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useOfflineSyncStatus
} from "@/hooks/useOfflineSync";
import { useOfflineCategoryCatalogs, useOfflineCategoryCatalogsMutation } from "@/hooks/useCategoryCatalogs";
import { Edit, Plus, Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const SUSTAINABILITY_TEMPLATE_ID = "sustainability_template_1";

import { OfflineCategoryCatalog } from "@/types/offline";

interface ApiError {
  message?: string;
  detail?: string;
}

export const ManageCategories: React.FC = () => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OfflineCategoryCatalog | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  // State for add/edit dialog weight error
  const [showDialogWeightError, setShowDialogWeightError] = useState(false);

  // Use offline hooks for all data fetching
  const { data: categoriesData, isLoading, error, refetch } = useOfflineCategoryCatalogs();

  const categories = categoriesData || [];

  // Use enhanced offline mutation hooks
  const mutationHooks = useOfflineCategoryCatalogsMutation();
  const createOrUpdateCategory = mutationHooks.createOrUpdate;
  const deleteCategory = mutationHooks.delete;
  const isPending = mutationHooks.isCreatingOrUpdating || mutationHooks.isDeleting;

  const { isOnline } = useOfflineSyncStatus();

  useEffect(() => {
    const handleDataSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.entityType === 'category_catalog' || customEvent.detail.entityType === 'category_catalogs') {
        console.log('Received datasync event for categories, refetching...');
        refetch();
      }
    };

    window.addEventListener('datasync', handleDataSync);

    return () => {
      window.removeEventListener('datasync', handleDataSync);
    };
  }, [refetch]);

  // Use categories as is (no sorting needed)
  const sortedCategories = [...categories];

  // Calculate total weight

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await createOrUpdateCategory({
          ...editingCategory,
          name: formData.name,
          description: formData.description,
        });
        toast.success(t('manageCategories.updateSuccess', { defaultValue: 'Category updated successfully' }));
      } else {
        await createOrUpdateCategory({
          name: formData.name,
          description: formData.description,
          template_id: SUSTAINABILITY_TEMPLATE_ID,
          is_active: true,
        } as OfflineCategoryCatalog);
        toast.success(t('manageCategories.createSuccess', { defaultValue: 'Category created successfully' }));
      }
      setIsDialogOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", description: "" });
    } catch (error) {
      const err = error as ApiError;
      const errorMessage = err.detail || err.message || t('manageCategories.submitError', { defaultValue: 'Failed to save category' });
      toast.error(errorMessage);
    }
  };

  const handleEdit = (category: OfflineCategoryCatalog) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm(t('manageCategories.confirmDelete', {
      defaultValue: 'Are you sure you want to delete this category? This will also delete all questions in this category. Note: Any existing submissions containing responses to these questions will be preserved, but the individual response records will be removed.'
    })))
      return;
    
    try {
      await deleteCategory(categoryId);
      toast.success(t('manageCategories.deleteSuccess', { defaultValue: 'Category deleted successfully' }));
    } catch (error) {
      const err = error as ApiError;
      const errorMessage = err.detail || err.message || t('manageCategories.deleteError', { defaultValue: 'Failed to delete category' });
      toast.error(errorMessage);
    }
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
              onClick={() => refetch()}
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
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Offline Status Indicator */}
          <div className="mb-4 flex items-center justify-end">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <div className="mb-8 animate-fade-in">
            <div className="mb-4">
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
                        description: "",
                      });
                      setShowDialogWeightError(false);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('manageCategories.addCategory')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                      <Label htmlFor="description">{t('manageCategories.categoryDescription')}</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder={t('manageCategories.categoryDescriptionPlaceholder', { defaultValue: 'Enter category description...' })}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-dgrv-blue hover:bg-blue-700"
                      disabled={isPending}
                    >
                      {isPending
                        ? t('manageCategories.saving', { defaultValue: 'Saving...' })
                        : editingCategory 
                          ? t('manageCategories.updateCategory') 
                          : t('manageCategories.createCategory')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedCategories.map((category) => (
                  <div
                    key={category.category_catalog_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-lg">{category.name}</h3>
                      <p className="text-sm text-gray-600">
                        {category.description}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        disabled={isPending}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category.category_catalog_id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* Show error and redistribute button if needed */}
                {sortedCategories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
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
