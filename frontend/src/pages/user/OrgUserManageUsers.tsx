/*
 * Main organization user management page for adding and managing users
 * Assembles all user management components and handles user CRUD operations
 * Provides interface for organization administrators to manage team members
 */

import { LoadingState } from "@/components/shared";
import { Navbar } from "@/components/shared/Navbar";
import {
  EmptyState,
  ManageUsersHeader,
  UserCard,
  UserForm,
} from "@/components/user/OrgUserManageUsers";
import { useOrgUserManageUsers } from "@/hooks/user/useOrgUserManageUsers";
import type { OrganizationMember } from "@/openapi-rq/requests/types.gen";
import * as React from "react";

export const OrgUserManageUsers: React.FC = () => {
  const {
    // State
    showAddDialog,
    setShowAddDialog,
    editingUser,
    formData,
    setFormData,
    usersLoading,

    // Data
    users,
    orgName,
    categories,

    // Functions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    handleBackToDashboard,
    handleAddUser,
    refetch,

    // Mutations
    createUser,
    updateUser,
    deleteUser,
  } = useOrgUserManageUsers();

  if (usersLoading) {
    return <LoadingState message="Loading users..." showNavbar={true} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ManageUsersHeader
          orgName={orgName}
          onBackToDashboard={handleBackToDashboard}
          onAddUser={handleAddUser}
        />

        <UserForm
          isOpen={showAddDialog}
          onOpenChange={setShowAddDialog}
          editingUser={editingUser}
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          onSubmit={handleSubmit}
          onReset={resetForm}
          isPending={createUser.isPending || updateUser.isPending}
        />

        {/* Users Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(users || []).map(
            (
              user: OrganizationMember & { categories?: string[] },
              index: number,
            ) => (
              <UserCard
                key={user.id}
                user={user}
                orgName={orgName}
                index={index}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDeleting={deleteUser.isPending}
              />
            ),
          )}
          {(users || []).length === 0 && (
            <EmptyState onAddUser={handleAddUser} />
          )}
        </div>
      </div>
    </div>
  );
};
