import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useOrganizationsServiceGetAdminOrganizations,
  useOrganizationMembersServiceGetOrganizationsByIdMembers,
  useOrganizationMembersServicePostOrganizationsByIdMembers,
  useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles,
  useOrganizationMembersServiceDeleteAdminOrganizationsByIdMembersByMembershipId,
} from "@/openapi-rq/queries/queries";
import { offlineDB } from "@/services/indexeddb";
import type {
  OrganizationMember,
  OrganizationResponse,
} from "@/openapi-rq/requests/types.gen";

interface OrgAdminMemberRequest {
  email: string;
  roles: string[];
  categories: string[];
}

interface RoleAssignment {
  roles: string[];
}

export const useManageUsers = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMember | null>(
    null,
  );
  const [formData, setFormData] = useState({
    email: "",
    roles: ["org_admin"],
  });

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(
    null,
  );

  const { data: organizations, isLoading: orgsLoading } =
    useOrganizationsServiceGetAdminOrganizations();

  const {
    data: users,
    isLoading: usersLoading,
    refetch,
  } = useOrganizationMembersServiceGetOrganizationsByIdMembers(
    { id: selectedOrg ? selectedOrg.id : "" },
    undefined,
    { enabled: !!selectedOrg?.id },
  );

  const createUserMutation =
    useOrganizationMembersServicePostOrganizationsByIdMembers({
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
      },
    });

  const updateUserMutation =
    useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles(
      {
        onSuccess: () => {
          toast.success("User updated successfully");
          refetch();
          setShowAddDialog(false);
          resetForm();
        },
        onError: (error) => {
          console.error("Failed to update user:", error);
          toast.error("Failed to update user");
        },
      },
    );

  const deleteUserMutation =
    useOrganizationMembersServiceDeleteAdminOrganizationsByIdMembersByMembershipId(
      {
        onSuccess: () => {
          toast.success("User deleted successfully");
          refetch();
        },
        onError: (error) => {
          console.error("Failed to delete user:", error);
          toast.error("Failed to delete user");
        },
      },
    );

  const createUserOffline = async (data: {
    id: string;
    requestBody: OrgAdminMemberRequest;
  }) => {
    try {
      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const tempUser = {
        id: tempId,
        email: data.requestBody.email,
        username: data.requestBody.email.split("@")[0],
        firstName: "",
        lastName: "",
        emailVerified: false,
        roles: data.requestBody.roles,
        organization_id: data.id,
        updated_at: now,
        sync_status: "pending" as const,
        local_changes: true,
        last_synced: undefined,
      };

      await offlineDB.saveUser(tempUser);

      try {
        const result = await createUserMutation.mutateAsync({
          id: data.id,
          requestBody: data.requestBody,
        });

        if (result && typeof result === "object" && "id" in result) {
          const realUserId = (result as { id: string }).id;
          await offlineDB.deleteUser(tempId);

          const realUser = {
            id: realUserId,
            email: data.requestBody.email,
            username: data.requestBody.email.split("@")[0],
            firstName: "",
            lastName: "",
            emailVerified: false,
            roles: data.requestBody.roles,
            organization_id: data.id,
            updated_at: new Date().toISOString(),
            sync_status: "synced" as const,
            local_changes: false,
            last_synced: new Date().toISOString(),
          };

          await offlineDB.saveUser(realUser);
          toast.success("User created successfully");
        }
      } catch (apiError) {
        console.warn("API call failed, user saved locally for sync:", apiError);
        toast.success("User created locally (will sync when online)");
      }

      return { success: true };
    } catch (error) {
      toast.error("Failed to create user");
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!formData.email.trim()) {
      toast.error(t("manageUsers.emailRequired"));
      return;
    }
    if (!selectedOrg?.id) {
      toast.error(t("manageUsers.selectOrgRequired"));
      return;
    }

    if (editingUser) {
      const roleAssignment: RoleAssignment = {
        roles: formData.roles,
      };

      updateUserMutation.mutate({
        id: selectedOrg.id,
        membershipId: editingUser.id,
        requestBody: roleAssignment,
      });
    } else {
      const memberReq: OrgAdminMemberRequest = {
        email: formData.email,
        roles: formData.roles,
        categories: [],
      };

      setIsCreatingUser(true);
      try {
        await createUserOffline({
          id: selectedOrg.id,
          requestBody: memberReq,
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

  const handleDelete = (userId: string) => {
    const confirmed = window.confirm(t("manageUsers.confirmDelete"));
    if (!confirmed) return;
    if (!selectedOrg?.id) return;

    deleteUserMutation.mutate({
      id: selectedOrg.id,
      membershipId: userId,
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

  const handleBackToOrganizations = () => {
    setSelectedOrg(null);
  };

  return {
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
    organizations: organizations || [],
    users: users || [],
    isLoading: orgsLoading || usersLoading,

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
  };
};
