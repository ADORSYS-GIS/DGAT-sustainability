/*
 * Admin page for managing organizations in the system
 * Provides CRUD operations for organizations with user management
 */

import { Navbar } from "@/components/shared/Navbar";
import {
  OrganizationHeader, 
  OrganizationList, 
  LoadingState,
  OrganizationForm
} from "@/components/admin/ManageOrganizations";
import { useManageOrganizations } from "@/hooks/admin/useManageOrganizations";
import { OfflineStatusIndicator } from "@/components/admin/ManageCategories";

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
    return <LoadingState />;
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
            isPending={createOrganizationMutation.isPending || updateOrganizationMutation.isPending || deleteOrganizationMutation.isPending}
          />

          <OrganizationForm
            isOpen={showAddDialog}
            onClose={() => setShowAddDialog(false)}
            onSubmit={handleSubmit}
            isPending={createOrganizationMutation.isPending || updateOrganizationMutation.isPending}
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
