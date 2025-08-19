/*
 * Admin page for managing system users across all organizations
 * Provides user management with role assignment and organization linking
 */

import {
  OrganizationSelector,
  UserForm,
  UserHeader,
  UserList,
} from "@/components/admin/ManageUsers";
import { LoadingState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useManageUsers } from "@/hooks/admin/useManageUsers";
import { useTranslation } from "react-i18next";

export const ManageUsers: React.FC = () => {
  const { t } = useTranslation();
  const {
    // State
    showAddDialog,
    setShowAddDialog,
    editingUser,
    setEditingUser,
    formData,
    setFormData,
    isCreatingUser,
    selectedOrg,
    setSelectedOrg,

    // Data
    organizations,
    users,
    isLoading,

    // Mutations
    createUserMutation,
    updateUserMutation,
    deleteUserMutation,

    // Functions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    handleBackToOrganizations,
    refetch,
  } = useManageUsers();

  if (isLoading) {
    return <LoadingState message="Loading users..." />;
  }

  // Show organization selector if no organization is selected
  if (!selectedOrg) {
    return (
      <OrganizationSelector
        organizations={organizations}
        onSelectOrganization={setSelectedOrg}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <UserHeader />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={handleBackToOrganizations}
              className="px-4 py-2 text-base font-semibold rounded shadow border-2 border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 transition"
            >
              <span className="mr-2">&larr;</span>{" "}
              {t("manageUsers.backToOrganizations")}
            </Button>
            <Button
              className="bg-dgrv-green hover:bg-green-700"
              onClick={() => setShowAddDialog(true)}
            >
              {t("manageUsers.addUser")}
            </Button>
          </div>
          <p className="text-lg text-gray-600 mb-6">
            {t("manageUsers.manageUsersForOrg", { org: selectedOrg.name })}
          </p>

          <UserForm
            showAddDialog={showAddDialog}
            setShowAddDialog={setShowAddDialog}
            editingUser={editingUser}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            resetForm={resetForm}
            selectedOrg={selectedOrg}
            isPending={
              createUserMutation.isPending ||
              updateUserMutation.isPending ||
              deleteUserMutation.isPending
            }
            isCreatingUser={isCreatingUser}
          />

          <UserList
            users={users}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isPending={
              createUserMutation.isPending ||
              updateUserMutation.isPending ||
              deleteUserMutation.isPending
            }
            selectedOrgName={selectedOrg.name}
          />
        </div>
      </div>
    </div>
  );
};
