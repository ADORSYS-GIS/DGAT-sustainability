/**
 * @file OrgUserManageUsers.tsx
 * @description This file defines the OrgUserManageUsers page, which allows organization admins to manage users.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineUsers } from "@/hooks/useOfflineUsers";
import { useOfflineOrganizationCategories } from "@/hooks/useOfflineOrganizationCategories";
import { useOfflineCategoryCatalogs } from "@/hooks/useOfflineCategoryCatalogs";
import type {
  OrganizationMember,
  OrgAdminMemberRequest,
  OrgAdminMemberCategoryUpdateRequest,
} from "@/openapi-rq/requests/types.gen";
import { toast } from "sonner";
import { offlineDB } from "@/services/indexeddb";
import { OrganizationMembersService } from "@/openapi-rq/requests/services.gen";
import type { OfflineUser } from "@/types/offline";
import { useTranslation } from "react-i18next";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Header } from "@/components/pages/user/OrgUserManageUsers/Header";
import { UserCard } from "@/components/pages/user/OrgUserManageUsers/UserCard";
import { UserDialog } from "@/components/pages/user/OrgUserManageUsers/UserDialog";
import { NoUsers } from "@/components/pages/user/OrgUserManageUsers/NoUsers";

// Offline-first user mutation hooks
function useUserMutations() {
  const [isPending, setIsPending] = useState(false);

  const createUser = async (data: {
    id: string;
    requestBody: OrgAdminMemberRequest;
  }) => {
    setIsPending(true);
    try {
      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const tempUser: OfflineUser = {
        id: tempId,
        email: data.requestBody.email,
        username: data.requestBody.email.split("@")[0],
        firstName: "",
        lastName: "",
        emailVerified: false,
        roles: data.requestBody.roles,
        updated_at: now,
        sync_status: "pending",
        organization_id: data.id,
      };

      await offlineDB.saveUser(tempUser);

      try {
        const result =
          await OrganizationMembersService.postOrganizationsByIdOrgAdminMembers(
            {
              id: data.id,
              requestBody: data.requestBody,
            }
          );

        if (result && typeof result === "object" && "id" in result) {
          const realUserId = (result as { id: string }).id;

          await offlineDB.deleteUser(tempId);

          const deletedUser = await offlineDB.getUser(tempId);
          if (deletedUser) {
            await offlineDB.deleteUser(tempId);
          }

          const realUser: OfflineUser = {
            id: realUserId,
            email: data.requestBody.email,
            username: data.requestBody.email.split("@")[0],
            firstName: "",
            lastName: "",
            emailVerified: false,
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
      const existingUser = await offlineDB.getUser(data.memberId);
      if (!existingUser) {
        throw new Error("User not found");
      }

      const updatedUser: OfflineUser = {
        ...existingUser,
        sync_status: "pending",
        updated_at: new Date().toISOString(),
      };

      await offlineDB.saveUser(updatedUser);

      try {
        await OrganizationMembersService.putOrganizationsByIdOrgAdminMembersByMemberIdCategories(
          {
            id: data.id,
            memberId: data.memberId,
            requestBody: data.requestBody,
          }
        );

        await offlineDB.saveUser({
          ...updatedUser,
          sync_status: "synced",
          updated_at: new Date().toISOString(),
        });

        toast.success("User updated successfully");
        return { success: true };
      } catch (apiError) {
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
      const existingUser = await offlineDB.getUser(data.memberId);
      if (!existingUser) {
        throw new Error("User not found");
      }

      await offlineDB.saveUser({
        ...existingUser,
        sync_status: "pending",
        updated_at: new Date().toISOString(),
      });

      try {
        await OrganizationMembersService.deleteOrganizationsByIdOrgAdminMembersByMemberId(
          {
            id: data.id,
            memberId: data.memberId,
          }
        );

        await offlineDB.deleteUser(data.memberId);

        toast.success("User deleted successfully");
        return { success: true };
      } catch (apiError) {
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

export const OrgUserManageUsers: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { orgName, orgId } = useMemo(() => {
    if (!user || !user.organizations) return { orgName: "", orgId: "" };
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length === 0) return { orgName: "", orgId: "" };
    const orgName = orgKeys[0];
    const orgData = user.organizations[orgName] as { id: string };
    return { orgName, orgId: orgData?.id || "" };
  }, [user]);

  const {
    organizationCategories: offlineOrgCategories = [],
    isLoading: isLoadingOrgCategories,
  } = useOfflineOrganizationCategories();

  const {
    data: allCategoryCatalogs = [],
    isLoading: isLoadingCategoryCatalogs,
  } = useOfflineCategoryCatalogs();

  const availableCategories = useMemo(() => {
    const orgCategoryMap = new Map(
      offlineOrgCategories.map((oc) => [oc.category_catalog_id, oc])
    );
    return allCategoryCatalogs.filter((cc) =>
      orgCategoryMap.has(cc.category_catalog_id)
    );
  }, [offlineOrgCategories, allCategoryCatalogs]);

  const isLoadingCategories = isLoadingOrgCategories || isLoadingCategoryCatalogs;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMember | null>(
    null
  );

  const categoryIdToNameMap = useMemo(() => {
    const map = new Map<string, string>();
    availableCategories.forEach((cat) => {
      if (cat.category_catalog_id && cat.name) {
        map.set(cat.category_catalog_id, cat.name);
      }
    });
    return map;
  }, [availableCategories]);
  const [formData, setFormData] = useState({
    email: "",
    roles: ["Org_User"],
    categories: [] as string[],
  });

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState<OrganizationMember | null>(
    null
  );

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

  useEffect(() => {
    cleanupTemporaryUsers();
  }, [cleanupTemporaryUsers]);

  const {
    data: users,
    isLoading: usersLoading,
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

  const handleDelete = (user: OrganizationMember) => {
    setUserToDelete(user);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    if (!userToDelete || !orgId) return;

    deleteUser
      .mutate({ id: orgId, memberId: userToDelete.id })
      .then(() => {
        refetch();
        setShowDeleteConfirmation(false);
        setUserToDelete(null);
      })
      .catch(() => {
        setShowDeleteConfirmation(false);
        setUserToDelete(null);
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

  if (usersLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header orgName={orgName} onInviteUser={() => setShowAddDialog(true)} />
        <p className="text-lg text-gray-600 mb-6">
          Add and manage users across{" "}
          <span className="font-semibold text-dgrv-blue">{orgName}</span>
        </p>
        <UserDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            if (!open) resetForm();
            setShowAddDialog(open);
          }}
          editingUser={editingUser}
          formData={formData}
          setFormData={setFormData}
          isLoadingCategories={isLoadingCategories}
          availableCategories={availableCategories}
          handleSubmit={handleSubmit}
          resetForm={resetForm}
          isSubmitting={createUser.isPending || updateUser.isPending}
          orgId={orgId}
          orgName={orgName}
          onInvitationCreated={() => {
            setShowAddDialog(false);
            refetch();
          }}
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(users || []).map(
            (
              user: OrganizationMember & { categories?: string[] },
              index: number
            ) => (
              <UserCard
                key={user.id}
                user={user}
                orgName={orgName}
                categoryIdToNameMap={categoryIdToNameMap}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDeleting={deleteUser.isPending}
                index={index}
              />
            )
          )}
          {(users || []).length === 0 && (
            <NoUsers onAddUser={() => setShowAddDialog(true)} />
          )}
        </div>
        <ConfirmationDialog
          isOpen={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false);
            setUserToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("manageUsers.confirmDeleteTitle")}
          description={t("manageUsers.confirmDeleteDescription", {
            email: userToDelete?.email || "",
            name:
              userToDelete?.firstName && userToDelete?.lastName
                ? `${userToDelete.firstName} ${userToDelete.lastName}`
                : userToDelete?.email || "",
          })}
          confirmText={t("manageUsers.deleteUser")}
          cancelText={t("manageUsers.cancel")}
          variant="destructive"
          isLoading={deleteUser.isPending}
        />
      </div>
    </div>
  );
};
