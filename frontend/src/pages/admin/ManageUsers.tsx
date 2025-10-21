// /frontend/src/pages/admin/ManageUsers.tsx
/**
 * @file Page for managing users within organizations.
 * @description This page allows administrators to select an organization and manage its users.
 */
import { UserInvitationForm } from "@/components/shared/UserInvitationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminServiceDeleteAdminUsersByUserId,
  useOrganizationMembersServiceDeleteAdminOrganizationsByIdMembersByMembershipId,
  useOrganizationMembersServiceGetOrganizationsByIdMembers,
  useOrganizationMembersServicePostOrganizationsByIdMembers,
  useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles,
  useOrganizationsServiceGetAdminOrganizations
} from "@/openapi-rq/queries/queries";
import type {
  OrgAdminMemberRequest,
  OrganizationMember,
  OrganizationResponse,
  RoleAssignment
} from "@/openapi-rq/requests/types.gen";
import { offlineDB } from "@/services/indexeddb";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import OrganizationSelection from "@/components/pages/admin/ManageUsers/OrganizationSelection";
import UserDialog from "@/components/pages/admin/ManageUsers/UserDialog";
import LoadingSpinner from "@/components/pages/admin/ManageUsers/LoadingSpinner";
import UserManagementView from "@/components/pages/admin/ManageUsers/UserManagementView";

export const ManageUsers: React.FC = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMember | null>(
    null,
  );
  const [formData, setFormData] = useState({
    email: "",
    roles: ["org_admin"],
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const { data: organizations, isLoading: orgsLoading } = useOrganizationsServiceGetAdminOrganizations();
  const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(
    null,
  );
  const {
    data: users,
    isLoading: usersLoading,
    refetch,
  } = useOrganizationMembersServiceGetOrganizationsByIdMembers(
    { id: selectedOrg ? selectedOrg.id : "" },
    undefined,
    { enabled: !!selectedOrg?.id }
  );
  const createUserMutation = useOrganizationMembersServicePostOrganizationsByIdMembers({
    onSuccess: (result) => {
      toast.success("User created successfully");
      refetch();
      setShowAddDialog(false);
      setFormData({
        email: "",
        roles: [],
      });
    },
    onError: () => {
      toast.error("Failed to create user");
    }
  });
  const updateUserMutation = useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles({
    onSuccess: () => {
      toast.success("User updated successfully");
      refetch();
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    }
  });
  const deleteUserEntirelyMutation = useAdminServiceDeleteAdminUsersByUserId({
    onSuccess: () => {
      toast.success("User deleted entirely from system");
      refetch();
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
    },
    onError: (error) => {
      console.error("Failed to delete user entirely:", error);
      toast.error("Failed to delete user entirely");
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
    }
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState<OrganizationMember | null>(null);

  const createUserOffline = async (data: { id: string; requestBody: OrgAdminMemberRequest }) => {
    try {
      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const tempUser = {
        id: tempId,
        email: data.requestBody.email,
        username: data.requestBody.email.split('@')[0],
        firstName: '',
        lastName: '',
        emailVerified: false,
        roles: data.requestBody.roles,
        organization_id: data.id,
        updated_at: now,
        sync_status: 'pending' as const,
        local_changes: true,
        last_synced: undefined
      };
      await offlineDB.saveUser(tempUser);
      try {
        const result = await createUserMutation.mutateAsync({
          id: data.id,
          requestBody: data.requestBody
        });
        if (result && typeof result === 'object' && 'id' in result) {
          const realUserId = (result as { id: string }).id;
          await offlineDB.deleteUser(tempId);
          const realUser = {
            id: realUserId,
            email: data.requestBody.email,
            username: data.requestBody.email.split('@')[0],
            firstName: '',
            lastName: '',
            emailVerified: false,
            roles: data.requestBody.roles,
            organization_id: data.id,
            updated_at: new Date().toISOString(),
            sync_status: 'synced' as const,
            local_changes: false,
            last_synced: new Date().toISOString()
          };
          await offlineDB.saveUser(realUser);
          toast.success("User created successfully");
        }
      } catch (apiError) {
        console.warn('API call failed, user saved locally for sync:', apiError);
        toast.success("Fail to creat user");
      }
      return { success: true };
    } catch (error) {
      toast.error("Failed to create user");
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!formData.email.trim()) {
      toast.error(t('manageUsers.emailRequired'));
      return;
    }
    if (!selectedOrg?.id) {
      toast.error(t('manageUsers.selectOrgRequired'));
      return;
    }
    if (editingUser) {
      const roleAssignment: RoleAssignment = {
        roles: formData.roles,
      };
      updateUserMutation.mutate({
        id: selectedOrg.id,
        membershipId: editingUser.id,
        requestBody: roleAssignment
      });
    } else {
      const memberReq: OrgAdminMemberRequest = {
        email: formData.email,
        roles: formData.roles,
      };
      setIsCreatingUser(true);
      try {
        await createUserOffline({
          id: selectedOrg.id,
          requestBody: memberReq
        });
        refetch();
        setShowAddDialog(false);
        resetForm();
      } catch (error) {
        // Error already handled in createUserOffline
      } finally {
        setIsCreatingUser(false);
      }
    }
  };

  const handleEdit = (user: OrganizationMember) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      roles: user.roles || ["Org_User"],
    });
    setShowAddDialog(true);
  };

  const handleDelete = (user: OrganizationMember) => {
    setUserToDelete(user);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    deleteUserEntirelyMutation.mutate({
      userId: userToDelete.id
    });
  };

  const resetForm = () => {
    setFormData({
      email: "",
      roles: ["org_admin"],
    });
    setEditingUser(null);
    setShowAddDialog(false);
  };

  if (orgsLoading) {
    return <LoadingSpinner />;
  }

  if (!selectedOrg) {
    return (
      <OrganizationSelection
        organizations={organizations || []}
        onSelectOrg={setSelectedOrg}
      />
    );
  }

  if (usersLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <UserManagementView
        selectedOrg={selectedOrg}
        users={users || []}
        onBack={() => setSelectedOrg(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onConfirmDelete={confirmDelete}
        onInvitationCreated={() => {
          setShowInvitationDialog(false);
          refetch();
        }}
        showDeleteConfirmation={showDeleteConfirmation}
        setShowDeleteConfirmation={setShowDeleteConfirmation}
        userToDelete={userToDelete}
        deleteUserEntirelyMutation={deleteUserEntirelyMutation}
        organizations={organizations || []}
      />
      <UserDialog
        isOpen={showAddDialog}
        onClose={resetForm}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editingUser={editingUser}
        selectedOrgName={selectedOrg?.name || ''}
        isProcessing={createUserMutation.isPending || updateUserMutation.isPending || isCreatingUser}
      />
    </>
  );
};
