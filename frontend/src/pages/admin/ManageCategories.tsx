/*
 * Admin page for managing assessment categories
 * Provides CRUD operations for categories with offline-first functionality
 */

import {
  CategoryForm,
  CategoryHeader,
  CategoryList,
  ErrorState,
  OfflineStatusIndicator,
} from "@/components/admin/ManageCategories";
import { LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useManageCategories } from "@/hooks/admin/useManageCategories";

export const ManageCategories: React.FC = () => {
  const {
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
    categories,
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
  } = useManageCategories();

  if (isLoading) {
    return <LoadingState message="Loading categories..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <OfflineStatusIndicator isOnline={isOnline} />
          <CategoryHeader />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Categories</CardTitle>
              <CategoryForm
                isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
                editingCategory={editingCategory}
                setEditingCategory={setEditingCategory}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                isPending={isPending}
                totalWeight={totalWeight}
                categoriesLength={categories.length}
                calculateDefaultWeight={calculateDefaultWeight}
                showDialogWeightError={showDialogWeightError}
                setShowDialogWeightError={setShowDialogWeightError}
                redistributeWeights={redistributeWeights}
              />
            </CardHeader>
            <CardContent>
              <CategoryList
                categories={categories}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isPending={isPending}
                weightExceeds={weightExceeds}
                weightNot100={weightNot100}
                totalWeight={totalWeight}
                onRedistributeWeights={() => redistributeWeights()}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
