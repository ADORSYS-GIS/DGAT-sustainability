/*
 * Admin page for managing organizations in the system
 * Provides CRUD operations for organizations with user management
 */

import { OfflineStatusIndicator } from "@/components/admin/ManageCategories";
import {
  OrganizationForm,
  OrganizationHeader,
  OrganizationList,
} from "@/components/admin/ManageOrganizations";
import { LoadingState } from "@/components/shared";
import { Navbar } from "@/components/shared/Navbar";
import { useManageOrganizations } from "@/hooks/admin/useManageOrganizations";

export const ManageOrganizations: React.FC = () => {
  const {
    // State
    showAddDialog,
    setShowAddDialog,
    editingOrg,
    setEditingOrg,
    formData,
    setFormData,
    categories,
    categoriesLoading,
    showCategoryCreation,
    setShowCategoryCreation,
    categoryFormData,
    setCategoryFormData,

    // Data
    organizations,
    isLoading,
    isOnline,

    // Mutations
    createOrganizationMutation,
    updateOrganizationMutation,
    deleteOrganizationMutation,

    // Functions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    handleDomainChange,
    addDomain,
    removeDomain,
    handleCreateCategory,
  } = useManageOrganizations();

  if (isLoading) {
    return <LoadingState message="Loading organizations..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <OfflineStatusIndicator isOnline={isOnline} />
          <OrganizationHeader onCreateClick={() => setShowAddDialog(true)} />

          <OrganizationList
            organizations={organizations}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isPending={
              createOrganizationMutation.isPending ||
              updateOrganizationMutation.isPending ||
              deleteOrganizationMutation.isPending
            }
          />

          <OrganizationForm
            isOpen={showAddDialog}
            onClose={() => setShowAddDialog(false)}
            onSubmit={handleSubmit}
            isPending={
              createOrganizationMutation.isPending ||
              updateOrganizationMutation.isPending
            }
            editingOrg={editingOrg}
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            categoriesLoading={categoriesLoading}
            showCategoryCreation={showCategoryCreation}
            setShowCategoryCreation={setShowCategoryCreation}
            categoryFormData={categoryFormData}
            setCategoryFormData={setCategoryFormData}
            handleDomainChange={handleDomainChange}
            addDomain={addDomain}
            removeDomain={removeDomain}
            handleCreateCategory={handleCreateCategory}
            resetForm={resetForm}
          />
        </div>
      </div>
    </div>
  );
};
