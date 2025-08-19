/*
 * Custom hook for managing organization user data and operations
 * Handles user CRUD operations, form state, and offline-first functionality
 * Provides user mutations, cleanup, and organization data management
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineUsers } from "@/hooks/useOfflineApi";
import { toast } from "sonner";
import { offlineDB } from "@/services/indexeddb";
import { OrganizationMembersService } from "@/openapi-rq/requests/services.gen";
import type {
  OrganizationMember,
  OrgAdminMemberRequest,
  OrgAdminMemberCategoryUpdateRequest,
} from "@/openapi-rq/requests/types.gen";
import type { OfflineUser } from "@/types/offline";
import type { UserProfile } from "@/services/shared/authService";

// Helper to get org and categories from user profile
function getOrgAndCategoriesAndId(user: UserProfile | null) {
  if (!user || !user.organizations) {
    return { orgName: "", orgId: "", categories: [] };
  }

  const organizations = user.organizations;
  const orgKeys = Object.keys(organizations);

  if (orgKeys.length === 0) {
    return { orgName: "", orgId: "", categories: [] };
  }

  const orgName = orgKeys[0]; // First organization
  const orgData = organizations[orgName];

  return {
    orgName,
    orgId: orgData?.id || "",
    categories: orgData?.categories || [],
  };
}

// Offline-first user mutation hooks
function useUserMutations() {
  const [isPending, setIsPending] = useState(false);

  const createUser = async (data: {
    id: string;
    requestBody: OrgAdminMemberRequest;
  }) => {
    setIsPending(true);
    try {
      // Generate a temporary ID for optimistic updates
      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // Create a temporary user object for local storage
      const tempUser: OfflineUser = {
        id: tempId,
        email: data.requestBody.email,
        username: data.requestBody.email.split("@")[0], // Use email prefix as username
        firstName: "",
        lastName: "",
        emailVerified: false,
        roles: data.requestBody.roles,
        updated_at: now,
        sync_status: "pending",
        organization_id: data.id,
      };

      // Save to IndexedDB immediately for optimistic UI updates
      await offlineDB.saveUser(tempUser);

      // Try to sync with backend if online
      try {
        const result =
          await OrganizationMembersService.postOrganizationsByIdOrgAdminMembers(
            {
              id: data.id,
              requestBody: data.requestBody,
            },
          );

        // If successful, replace the temporary user with the real one
        if (result && typeof result === "object" && "id" in result) {
          const realUserId = (result as { id: string }).id;

          // Delete the temporary user first
          await offlineDB.deleteUser(tempId);

          // Verify deletion by checking if user still exists
          const deletedUser = await offlineDB.getUser(tempId);
          if (deletedUser) {
            console.error("❌ Failed to delete temporary user:", tempId);
            // Try to delete again
            await offlineDB.deleteUser(tempId);
          }

          // Save the real user with proper ID
          const realUser: OfflineUser = {
            id: realUserId,
            email: data.requestBody.email,
            username: data.requestBody.email.split("@")[0],
            firstName: "", // Default empty since not provided in response
            lastName: "", // Default empty since not provided in response
            emailVerified: false, // Default false since not provided in response
            roles: data.requestBody.roles,
            organization_id: data.id,
            updated_at: new Date().toISOString(),
            sync_status: "synced",
            local_changes: false,
            last_synced: new Date().toISOString(),
          };

          await offlineDB.saveUser(realUser);
          toast.success("User created successfully");
        }
      } catch (apiError) {
        console.warn("API call failed, user saved locally for sync:", apiError);
        // Removed offline sync toast
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Error in createUser:", error);
      toast.error("Failed to create user");
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const updateUser = async (data: {
    id: string;
    memberId: string;
    requestBody: OrgAdminMemberCategoryUpdateRequest;
  }) => {
    setIsPending(true);
    try {
      // Get existing user from IndexedDB
      const existingUser = await offlineDB.getUser(data.memberId);
      if (!existingUser) {
        throw new Error("User not found");
      }

      // Update user locally - categories are stored separately in the API response
      const updatedUser: OfflineUser = {
        ...existingUser,
        sync_status: "pending",
        updated_at: new Date().toISOString(),
      };

      await offlineDB.saveUser(updatedUser);

      // Attempt API call
      try {
        await OrganizationMembersService.putOrganizationsByIdOrgAdminMembersByMemberIdCategories(
          {
            id: data.id,
            memberId: data.memberId,
            requestBody: data.requestBody,
          },
        );

        // API call succeeded, mark as synced
        await offlineDB.saveUser({
          ...updatedUser,
          sync_status: "synced",
          updated_at: new Date().toISOString(),
        });

        toast.success("User updated successfully");
        return { success: true };
      } catch (apiError) {
        // API call failed, queue for sync
        await offlineDB.addToSyncQueue({
          id: crypto.randomUUID(),
          operation: "update",
          entity_type: "user",
          entity_id: data.memberId,
          data: {
            organizationId: data.id,
            memberId: data.memberId,
            userData: data.requestBody,
          },
          retry_count: 0,
          max_retries: 3,
          priority: "normal",
          created_at: new Date().toISOString(),
        });

        // Removed offline mode toast
        return { success: true };
      }
    } catch (error) {
      toast.error("Failed to update user");
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const deleteUser = async (data: { id: string; memberId: string }) => {
    setIsPending(true);
    try {
      // Get existing user from IndexedDB
      const existingUser = await offlineDB.getUser(data.memberId);
      if (!existingUser) {
        throw new Error("User not found");
      }

      // Mark as deleted locally
      await offlineDB.saveUser({
        ...existingUser,
        sync_status: "pending",
        updated_at: new Date().toISOString(),
      });

      // Attempt API call
      try {
        await OrganizationMembersService.deleteOrganizationsByIdOrgAdminMembersByMemberId(
          {
            id: data.id,
            memberId: data.memberId,
          },
        );

        // API call succeeded, actually delete from IndexedDB
        await offlineDB.deleteUser(data.memberId);

        toast.success("User deleted successfully");
        return { success: true };
      } catch (apiError) {
        // API call failed, queue for sync
        await offlineDB.addToSyncQueue({
          id: crypto.randomUUID(),
          operation: "delete",
          entity_type: "user",
          entity_id: data.memberId,
          data: { organizationId: data.id, memberId: data.memberId },
          retry_count: 0,
          max_retries: 3,
          priority: "normal",
          created_at: new Date().toISOString(),
        });

        // Removed offline mode toast
        return { success: true };
      }
    } catch (error) {
      toast.error("Failed to delete user");
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return {
    createUser: { mutate: createUser, isPending },
    updateUser: { mutate: updateUser, isPending },
    deleteUser: { mutate: deleteUser, isPending },
  };
}

export const useOrgUserManageUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { orgName, orgId, categories } = getOrgAndCategoriesAndId(user);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMember | null>(
    null,
  );
  const [formData, setFormData] = useState({
    email: "",
    roles: ["Org_User"],
    categories: [] as string[],
  });

  // Cleanup function to remove any stuck temporary users
  const cleanupTemporaryUsers = useCallback(async () => {
    try {
      const allUsers = await offlineDB.getAllUsers();
      const tempUsers = allUsers.filter((u) => u.id.startsWith("temp_"));

      if (tempUsers.length > 0) {
        for (const tempUser of tempUsers) {
          await offlineDB.deleteUser(tempUser.id);
        }
      }
    } catch (error) {
      console.error("Error cleaning up temporary users:", error);
    }
  }, []);

  // Cleanup temporary users on component mount
  useEffect(() => {
    cleanupTemporaryUsers();
  }, [cleanupTemporaryUsers]);

  // Responsive layout: use a card grid and modern header
  const {
    data: users,
    isLoading: usersLoading,
    error,
    refetch,
  } = useOfflineUsers(orgId);

  const { createUser, updateUser, deleteUser } = useUserMutations();

  const handleSubmit = () => {
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!orgId) {
      toast.error("Organization not found");
      return;
    }

    if (editingUser) {
      // Only update categories for existing user
      const req: OrgAdminMemberCategoryUpdateRequest = {
        categories: formData.categories,
      };
      updateUser
        .mutate({
          id: orgId,
          memberId: editingUser.id,
          requestBody: req,
        })
        .then(() => {
          refetch();
          setShowAddDialog(false);
          resetForm();
        })
        .catch(() => {
          // Error already handled in mutation
        });
    } else {
      const memberReq: OrgAdminMemberRequest = {
        email: formData.email,
        roles: ["Org_User"],
        categories: formData.categories,
      };
      createUser
        .mutate({ id: orgId, requestBody: memberReq })
        .then(() => {
          refetch();
          setShowAddDialog(false);
          resetForm();
        })
        .catch(() => {
          // Error already handled in mutation
        });
    }
  };

  const handleEdit = (user: OrganizationMember & { categories?: string[] }) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      roles: user.roles || ["Org_User"],
      categories: user.categories || [],
    });
    setShowAddDialog(true);
  };

  const handleDelete = (userId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user from the organization? This action cannot be undone.",
      )
    )
      return;
    if (!orgId) return;

    deleteUser
      .mutate({ id: orgId, memberId: userId })
      .then(() => {
        refetch();
      })
      .catch(() => {
        // Error already handled in mutation
      });
  };

  const resetForm = () => {
    setFormData({
      email: "",
      roles: ["Org_User"],
      categories: [],
    });
    setEditingUser(null);
    setShowAddDialog(false);
  };

  const handleBackToDashboard = () => navigate("/user/dashboard");
  const handleAddUser = () => setShowAddDialog(true);

  return {
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
    orgId,
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
  };
};
