// /frontend/src/pages/admin/ManageCategories.tsx
/**
 * @file Page for managing sustainability categories.
 * @description This page allows administrators to create, update, and delete sustainability categories.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useOfflineSyncStatus
} from "@/hooks/useOfflineSync";
import { useOfflineCategoryCatalogs, useOfflineCategoryCatalogsMutation } from "@/hooks/useCategoryCatalogs";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { OfflineCategoryCatalog } from "@/types/offline";
import CategoryDialog from "@/components/pages/admin/ManageCategories/CategoryDialog";
import CategoryList from "@/components/pages/admin/ManageCategories/CategoryList";
import { Plus } from "lucide-react";

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

  const { data: categoriesData, isLoading, error, refetch } = useOfflineCategoryCatalogs();
  const categories = categoriesData || [];

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
          template_id: "sustainability_template_1",
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
              <Button
                className="bg-dgrv-blue hover:bg-blue-700"
                onClick={() => {
                  setEditingCategory(null);
                  setFormData({
                    name: "",
                    description: "",
                  });
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('manageCategories.addCategory')}
              </Button>
            </CardHeader>
            <CardContent>
              <CategoryList
                categories={categories}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isPending={isPending}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <CategoryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editingCategory={editingCategory}
        isPending={isPending}
      />
    </div>
  );
};
