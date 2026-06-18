import { useState, useEffect, useCallback, useMemo } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Edit, Trash2, Mail, Clock, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineUsers } from "@/hooks/useOfflineUsers";
import { useOrganizationInvitations, useResendOrgInvitation, useDeleteOrgUser, type PendingInvitation } from "@/hooks/useOrganizationInvitations";
import { useOfflineOrganizationCategories } from "@/hooks/useOfflineOrganizationCategories";
import { useOfflineCategoryCatalogs } from "@/hooks/useOfflineCategoryCatalogs";
import type {
  OrganizationMember,
  OrgAdminMemberRequest,
  OrgAdminMemberCategoryUpdateRequest,
} from "@/openapi-rq/requests/types.gen";
import type { OfflineCategoryCatalog } from "@/services/indexeddb";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { offlineDB } from "@/services/indexeddb";
import { OrganizationMembersService } from "@/openapi-rq/requests/services.gen";
import type { OfflineUser } from "@/types/offline";
import { useTranslation } from "react-i18next";
import { OrgAdminUserInvitationForm } from "@/components/shared/OrgAdminUserInvitationForm";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

// Offline-first user mutation hooks
function useUserMutations() {
  const { t } = useTranslation();
  const [isPending, setIsPending] = useState(false);

  const createUser = async (data: { id: string; requestBody: OrgAdminMemberRequest }) => {
    setIsPending(true);
    try {
      // Generate a temporary ID for optimistic updates
      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // Create a temporary user object for local storage
      const tempUser: OfflineUser = {
        id: tempId,
        email: data.requestBody.email,
        username: data.requestBody.email.split('@')[0], // Use email prefix as username
        firstName: '',
        lastName: '',
        emailVerified: false,
        roles: data.requestBody.roles,
        updated_at: now,
        sync_status: 'pending',
        organization_id: data.id,
      };

      // Save to IndexedDB immediately for optimistic UI updates
      await offlineDB.saveUser(tempUser);

      // Try to sync with backend if online
      try {
        const result = await OrganizationMembersService.postOrganizationsByIdOrgAdminMembers({
          id: data.id,
          requestBody: data.requestBody
        });

        // If successful, replace the temporary user with the real one
        if (result && typeof result === 'object' && 'id' in result) {
          const realUserId = (result as { id: string }).id;

          // Delete the temporary user first
          await offlineDB.deleteUser(tempId);

          // Verify deletion by checking if user still exists
          const deletedUser = await offlineDB.getUser(tempId);
          if (deletedUser) {
            console.error('❌ Failed to delete temporary user:', tempId);
            // Try to delete again
            await offlineDB.deleteUser(tempId);
          }

          // Save the real user with proper ID
          const realUser: OfflineUser = {
            id: realUserId,
            email: data.requestBody.email,
            username: data.requestBody.email.split('@')[0],
            firstName: '', // Default empty since not provided in response
            lastName: '', // Default empty since not provided in response
            emailVerified: false, // Default false since not provided in response
            roles: data.requestBody.roles,
            organization_id: data.id,
            updated_at: new Date().toISOString(),
            sync_status: 'synced',
            local_changes: false,
            last_synced: new Date().toISOString()
          };

          await offlineDB.saveUser(realUser);
          toast.success(t("staticText.users.createSuccess"));
        }
      } catch (apiError) {
        console.warn('API call failed, user saved locally for sync:', apiError);
        // Removed offline sync toast
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error in createUser:', error);
      toast.error(t("staticText.users.createError"));
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const updateUser = async (data: { id: string; memberId: string; requestBody: OrgAdminMemberCategoryUpdateRequest }) => {
    setIsPending(true);
    try {
      // Call the API directly — this is the source of truth for category assignments
      await OrganizationMembersService.putOrganizationsByIdOrgAdminMembersByMemberIdCategories({
        id: data.id,
        memberId: data.memberId,
        requestBody: data.requestBody
      });

      // Also update local IndexedDB if the user exists there
      const existingUser = await offlineDB.getUser(data.memberId);
      if (existingUser) {
        await offlineDB.saveUser({
          ...existingUser,
          sync_status: 'synced',
          updated_at: new Date().toISOString()
        });
      }

      toast.success(t("staticText.users.updateSuccess"));
      return { success: true };
    } catch (apiError) {
      // API call failed — queue for sync if we have the user locally
      const existingUser = await offlineDB.getUser(data.memberId);
      if (existingUser) {
        await offlineDB.saveUser({
          ...existingUser,
          sync_status: 'pending',
          updated_at: new Date().toISOString()
        });
        await offlineDB.addToSyncQueue({
          id: crypto.randomUUID(),
          operation: 'update',
          entity_type: 'user',
          entity_id: data.memberId,
          data: { organizationId: data.id, memberId: data.memberId, userData: data.requestBody },
          retry_count: 0,
          max_retries: 3,
          priority: 'normal',
          created_at: new Date().toISOString()
        });
      }
      toast.error(t("staticText.users.updateCategoriesRetry"));
      throw apiError;
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
        throw new Error(t("staticText.users.notFound"));
      }

      // Mark as deleted locally
      await offlineDB.saveUser({
        ...existingUser,
        sync_status: 'pending',
        updated_at: new Date().toISOString()
      });

      // Attempt API call
      try {
        await OrganizationMembersService.deleteOrganizationsByIdOrgAdminMembersByMemberId({
          id: data.id,
          memberId: data.memberId
        });

        // API call succeeded, actually delete from IndexedDB
        await offlineDB.deleteUser(data.memberId);

        toast.success(t("staticText.users.deleteSuccess"));
        return { success: true };
      } catch (apiError) {
        // API call failed, queue for sync
        await offlineDB.addToSyncQueue({
          id: crypto.randomUUID(),
          operation: 'delete',
          entity_type: 'user',
          entity_id: data.memberId,
          data: { organizationId: data.id, memberId: data.memberId },
          retry_count: 0,
          max_retries: 3,
          priority: 'normal',
          created_at: new Date().toISOString()
        });

        // Removed offline mode toast
        return { success: true };
      }
    } catch (error) {
      toast.error(t("staticText.users.deleteError"));
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return {
    createUser: { mutate: createUser, isPending },
    updateUser: { mutate: updateUser, isPending },
    deleteUser: { mutate: deleteUser, isPending }
  };
}

export const OrgUserManageUsers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLanguage = localStorage.getItem("i18n_language") || i18n.language || "en";

  // Helper function to get translated category name
  const getCategoryDisplayName = (category: any) => {
    const translations = category?.name_translations as Record | undefined;
    return translations?.[currentLanguage] || category?.name || "";
  };

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
    const orgCategoryMap = new Map(offlineOrgCategories.map(oc => [oc.category_catalog_id, oc]));
    return allCategoryCatalogs.filter(cc => orgCategoryMap.has(cc.category_catalog_id));
  }, [offlineOrgCategories, allCategoryCatalogs]);

  const isLoadingCategories = isLoadingOrgCategories || isLoadingCategoryCatalogs;

  useEffect(() => {
    console.log("OrgUserManageUsers - offlineOrgCategories:", offlineOrgCategories);
    console.log("OrgUserManageUsers - allCategoryCatalogs:", allCategoryCatalogs);
    console.log("OrgUserManageUsers - availableCategories:", availableCategories);
    console.log("OrgUserManageUsers - isLoadingCategories:", isLoadingCategories);
  }, [offlineOrgCategories, allCategoryCatalogs, availableCategories, isLoadingCategories]);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMember | null>(
    null,
  );

  const categoryIdToNameMap = useMemo(() => {
    const map = new Map();
    availableCategories.forEach(cat => {
      if (cat.category_catalog_id) {
        map.set(cat.category_catalog_id, getCategoryDisplayName(cat));
      }
    });
    return map;
  }, [availableCategories, currentLanguage]);
  const [formData, setFormData] = useState({
    email: "",
    roles: ["Org_User"],
    categories: [] as string[],
  });

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState<OrganizationMember | null>(null);

  // Pending user delete confirmation state
  const [showPendingDeleteConfirmation, setShowPendingDeleteConfirmation] = useState(false);
  const [pendingUserToDelete, setPendingUserToDelete] = useState<PendingInvitation | null>(null);

  // Cleanup function to remove any stuck temporary users
  const cleanupTemporaryUsers = useCallback(async () => {
    try {
      const allUsers = await offlineDB.getAllUsers();
      const tempUsers = allUsers.filter(u => u.id.startsWith('temp_'));

      if (tempUsers.length > 0) {
        for (const tempUser of tempUsers) {
          await offlineDB.deleteUser(tempUser.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temporary users:', error);
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

  const {
    data: pendingInvitations,
    isLoading: invitationsLoading,
    refetch: refetchInvitations,
  } = useOrganizationInvitations(orgId);

  const { resendInvitation, isPending: isResending } = useResendOrgInvitation(orgId);
  const { deleteUser: deletePendingUser, isPending: isDeletingUser } = useDeleteOrgUser(orgId);

  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleResendInvitation = async (inv: PendingInvitation) => {
    if (!orgId) return;
    setResendingUserId(inv.user_id);
    try {
      await resendInvitation(inv.user_id);
      toast.success(t("manageUsers.resendEmailSuccess"));
      refetchInvitations();
    } catch {
      toast.error(t("manageUsers.resendEmailError"));
    } finally {
      setResendingUserId(null);
    }
  };

  const handleDeletePendingUser = async (inv: PendingInvitation) => {
    if (!orgId) return;
    setDeletingUserId(inv.user_id);
    try {
      await deletePendingUser(inv.user_id);
      toast.success(t("staticText.users.deleteEntirelySuccess"));
      refetchInvitations();
    } catch {
      toast.error(t("staticText.users.deleteEntirelyError"));
    } finally {
      setDeletingUserId(null);
    }
  };

  const { createUser, updateUser, deleteUser: removeUser } = useUserMutations();
  // Remove useOfflineSyncStatus, useOfflineSync, sync, isSyncing

  // Remove all useEffect related to sync

  // Manual sync function
  // Remove handleManualSync function

  const handleSubmit = () => {
    if (!formData.email.trim()) {
      toast.error(t('common.emailRequired'));
      return;
    }
    if (!orgId) {
      toast.error(t('common.organizationNotFound'));
      return;
    }

    if (editingUser) {
      // Only update categories for existing user
      const req: OrgAdminMemberCategoryUpdateRequest = {
        categories: formData.categories,
      };
      updateUser.mutate({
        id: orgId,
        memberId: editingUser.id,
        requestBody: req,
      }).then(() => {
        refetch();
        setShowAddDialog(false);
        resetForm();
      }).catch(() => {
        // Error already handled in mutation
      });
    } else {
      const memberReq: OrgAdminMemberRequest = {
        email: formData.email,
        roles: ["Org_User"],
        categories: formData.categories,
      };
      createUser.mutate({ id: orgId, requestBody: memberReq }).then(() => {
        refetch();
        refetchInvitations();
        setShowAddDialog(false);
        resetForm();
      }).catch(() => {
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

  const confirmDelete = async () => {
    if (!userToDelete || !orgId) return;

    try {
      // For active members, remove from organization (not delete entirely from Keycloak)
      await OrganizationMembersService.deleteOrganizationsByIdOrgAdminMembersByMemberId({
        id: orgId,
        memberId: userToDelete.id,
      });
      toast.success(t("staticText.users.deleteSuccess"));
      // Clean up IndexedDB if user exists there
      try { await offlineDB.deleteUser(userToDelete.id); } catch {}
      refetch();
      refetchInvitations();
    } catch {
      toast.error(t("staticText.users.deleteError"));
    } finally {
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
    }
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
    return <LoadingSpinner size="hero" fullPage text={t("loading")} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-4 sm:pt-6 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Remove Offline Status Indicator and Manual Sync Button */}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/user/dashboard")}
            className="px-4 py-2 text-base font-semibold rounded shadow border-2 border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 transition"
          >
            <span className="mr-2">&larr;</span> {t("manageUsers.backToDashboard", "Back to Dashboard")}
          </Button>
          <Button
            className="bg-dgrv-green hover:bg-green-700"
            onClick={() => setShowAddDialog(true)}
          >
            {t("staticText.users.inviteUser")}
          </Button>
        </div>
        <p className="text-lg text-gray-600 mb-6">
          {t("staticText.users.addManageAcross")}{" "}
          <span className="font-semibold text-dgrv-blue">{orgName}</span>
        </p>
        <Dialog
          open={showAddDialog}
          onOpenChange={(open) => {
            if (!open) resetForm();
            setShowAddDialog(open);
          }}
        >
          <DialogTrigger asChild></DialogTrigger>
          <DialogContent className="max-w-4xl w-full max-w-[calc(100vw-2rem)] sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? t('manageUsers.editUser') : t("staticText.users.inviteNewUser")}
              </DialogTitle>
            </DialogHeader>
            {editingUser ? (
              // Show edit form for existing users
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">{t("manageUsers.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder={t("manageUsers.emailPlaceholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="categories">{t("staticText.users.categories")}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {isLoadingCategories ? (
                      <p>{t("staticText.users.loadingCategories")}</p>
                    ) : (
                      availableCategories.map((cat) => (
                        <label key={cat.category_catalog_id} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={formData.categories.includes(cat.category_catalog_id)}
                            onChange={(e) => {
                              const categoryId = cat.category_catalog_id;
                              setFormData((prev) => ({
                                ...prev,
                                categories: e.target.checked
                                  ? [...prev.categories, categoryId]
                                  : prev.categories.filter((c) => c !== categoryId),
                              }));
                            }}
                          />
                          <span>{getCategoryDisplayName(cat)}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="role">{t("manageUsers.role")}</Label>
                  <Input
                    id="role"
                    value={t('manageUsers.orgUser')}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={handleSubmit}
                    className="bg-dgrv-green hover:bg-green-700"
                    disabled={createUser.isPending || updateUser.isPending}
                  >
                    {createUser.isPending || updateUser.isPending
                      ? t('common.processing')
                      : editingUser ? t('common.update') : t('common.create')} {t('manageUsers.user')}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              // Show invitation form for new users
              <OrgAdminUserInvitationForm
                organizationId={orgId}
                organizationName={orgName}
                onInvitationCreated={() => {
                  setShowAddDialog(false);
                  refetch();
                  refetchInvitations();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Pending Invitations Section */}
        {invitationsLoading ? (
          <div className="mb-6"><LoadingSpinner size="sm" text={t("loading")} /></div>
        ) : (pendingInvitations ?? []).length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-amber-700 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t("manageUsers.pendingInvitations")} ({(pendingInvitations ?? []).length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(pendingInvitations ?? []).map((inv) => (
                <Card key={inv.user_id} className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-full bg-amber-100">
                          <Users className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {inv.first_name || inv.last_name
                              ? `${inv.first_name ?? ""} ${inv.last_name ?? ""}`.trim()
                              : inv.email}
                          </p>
                          <p className="text-xs text-gray-500 font-normal">{inv.roles || "—"}</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-400 text-white text-xs">
                        {t("manageUsers.pending")}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 mb-3">
                      <Mail className="w-3 h-3" />
                      <span>{inv.email}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      {inv.email_verified
                        ? t("manageUsers.emailVerified")
                        : t("manageUsers.awaitingEmailVerification")}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-amber-600 hover:bg-amber-100 border-amber-300 text-xs"
                        disabled={resendingUserId === inv.user_id && isResending}
                        onClick={() => handleResendInvitation(inv)}
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${resendingUserId === inv.user_id && isResending ? "animate-spin" : ""}`} />
                        {t("manageUsers.resendEmail")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 border-red-200"
                        disabled={deletingUserId === inv.user_id && isDeletingUser}
                        onClick={() => {
                          setPendingUserToDelete(inv);
                          setShowPendingDeleteConfirmation(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* Users Grid */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-dgrv-blue" />
          {t('manageUsers.activeUsers')} ({(users || []).length})
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(users || []).map(
            (
              user: OrganizationMember & { categories?: string[] },
              index: number,
            ) => (
              <Card
                key={user.id}
                className="animate-fade-in hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-dgrv-blue/10">
                        <Users className="w-5 h-5 text-dgrv-blue" />
                      </div>
                      <div>
                        <span className="text-lg font-semibold">
                          {user.firstName} {user.lastName}
                        </span>
                        <p className="text-sm font-normal text-gray-600">
                          @{user.username}
                        </p>
                        <p className="text-xs text-gray-500">{t('manageUsers.orgLabel')} {orgName}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        user.emailVerified
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }
                    >
                      {user.emailVerified ? t('manageUsers.verified') : t('manageUsers.notVerified')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs mt-2">
                      {user.categories &&
                        user.categories.length > 0 &&
                        user.categories.map((catId: string) => (
                          <Badge
                            key={catId}
                            className="bg-blue-100 text-blue-700"
                          >
                            {categoryIdToNameMap.get(catId) || catId}
                          </Badge>
                        ))}
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                        className="flex-1"
                        disabled={false}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:bg-red-50"
                        disabled={isDeletingUser}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
          {(users || []).length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
              <CardContent>
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('manageUsers.noUsersYet')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('manageUsers.addFirstUserDesc')}
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-dgrv-green hover:bg-green-700"
                >
                  {t('manageUsers.addFirstUser')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false);
            setUserToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t('manageUsers.confirmDeleteTitle')}
          description={t('manageUsers.confirmDeleteDescription', {
            email: userToDelete?.email || '',
            name: userToDelete?.firstName && userToDelete?.lastName
              ? `${userToDelete.firstName} ${userToDelete.lastName}`
              : userToDelete?.email || ''
          })}
          confirmText={t('manageUsers.deleteUser')}
          cancelText={t('manageUsers.cancel')}
          variant="destructive"
          isLoading={isDeletingUser}
        />

        {/* Pending User Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showPendingDeleteConfirmation}
          onClose={() => {
            setShowPendingDeleteConfirmation(false);
            setPendingUserToDelete(null);
          }}
          onConfirm={() => {
            if (pendingUserToDelete) {
              handleDeletePendingUser(pendingUserToDelete);
            }
            setShowPendingDeleteConfirmation(false);
            setPendingUserToDelete(null);
          }}
          title={t('manageUsers.confirmDeleteTitle')}
          description={t('manageUsers.confirmDeleteDescription', {
            email: pendingUserToDelete?.email || '',
            name: pendingUserToDelete?.first_name || pendingUserToDelete?.last_name
              ? `${pendingUserToDelete?.first_name ?? ""} ${pendingUserToDelete?.last_name ?? ""}`.trim()
              : pendingUserToDelete?.email || ''
          })}
          confirmText={t('manageUsers.deleteUser')}
          cancelText={t('manageUsers.cancel')}
          variant="destructive"
          isLoading={isDeletingUser && deletingUserId === pendingUserToDelete?.user_id}
        />
      </div>
    </div>
  );
};
