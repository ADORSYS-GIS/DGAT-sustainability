import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Mail,
  Building2,
  UserPlus,
} from "lucide-react";
import {
  useOrganizationsServiceGetOrganizations,
  useOrganizationsServiceGetOrganizationsByOrganizationIdMembers,
  useOrganizationsServicePostOrganizationsByOrganizationIdMembers,
  useOrganizationsServiceDeleteOrganizationsByOrganizationIdMembersByUserId,
  useAdminServiceDeleteAdminUsersByUserId,
} from "@/services/openapiQueries";
import type {
  OrganizationMember,
  MemberRequest,
  OrganizationResponse,
  OrgAdminMemberRequest,
  RoleAssignment,
} from "@/openapi-rq/requests/types.gen";
import { toast } from "sonner";
import { offlineDB } from "@/services/indexeddb";
import { UserInvitationForm } from "@/components/shared/UserInvitationForm";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useOfflineCategories } from "@/hooks/useOfflineApi";

// Helper to extract domain names
function getDomainNames(domains: unknown): string[] {
  if (Array.isArray(domains)) {
    return domains.map((d) =>
      typeof d === "string"
        ? d
        : d && typeof d === "object" && "name" in d
          ? (d as { name: string }).name
          : "",
    );
  }
  return [];
}
// Helper to extract description
function getOrgDescription(org: OrganizationResponse): string | undefined {
  // @ts-expect-error: description may exist at the top level or in attributes
  return org.description ?? org.attributes?.description?.[0];
}

export const ManageUsers: React.FC = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMember | null>(
    null,
  );
  // Set the default role to 'org_admin' and make it the only selectable option
  const [formData, setFormData] = useState({
    email: "",
    roles: ["org_admin"],
  });

  // Add local loading state for offline user creation
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Use direct React Query hooks for data fetching
  const { data: organizations, isLoading: orgsLoading } =
    useOrganizationsServiceGetOrganizations();
  const {
    data: { categories },
    isLoading: categoriesLoading,
  } = useOfflineCategories();
  const transformedCategories = categories.map((cat) => ({
    id: cat.category_id,
    name: cat.name,
  }));

  // Add a new state to track the selected organization object
  const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(
    null,
  );

  // Only fetch users when selectedOrg is set
  const {
    data: users,
    isLoading: usersLoading,
    refetch,
  } = useOrganizationsServiceGetOrganizationsByOrganizationIdMembers(
    { id: selectedOrg ? selectedOrg.id : "" },
    undefined,
    { enabled: !!selectedOrg?.id },
  );

  // Use the generated mutation hooks
  const createUserMutation =
    useOrganizationsServicePostOrganizationsByOrganizationIdMembers({
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

  // Role update function not available in current API
  const updateUserMutation = {
    mutate: () => {
      toast.error("User role updates are not currently supported");
    },
    isPending: false,
  };

  const deleteUserMutation =
    useOrganizationsServiceDeleteOrganizationsByOrganizationIdMembersByUserId(
      {
        onSuccess: () => {
          toast.success("User removed from organization successfully");
          refetch();
        },
        onError: (error) => {
          console.error("Failed to remove user from organization:", error);
          toast.error("Failed to remove user from organization");
        },
      },
    );

  // New mutation for deleting user entirely
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
    },
  });

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState<OrganizationMember | null>(
    null,
  );

  // Offline-first user creation logic
  const createUserOffline = async (data: {
    id: string;
    requestBody: OrgAdminMemberRequest;
  }) => {
    try {
      // Generate a temporary ID for optimistic updates
      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // Create a temporary user object for local storage
      const tempUser = {
        id: tempId,
        email: data.requestBody.email,
        username: data.requestBody.email.split("@")[0], // Use email prefix as username
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

      // Save to IndexedDB immediately for optimistic UI updates
      await offlineDB.saveUser(tempUser);

      // Try to sync with backend if online
      try {
        const result = await createUserMutation.mutateAsync({
          id: data.id,
          requestBody: data.requestBody,
        });

        // If successful, replace the temporary user with the real one
        if (result && typeof result === "object" && "id" in result) {
          const realUserId = (result as { id: string }).id;
          // Delete the temporary user
          await offlineDB.deleteUser(tempId);

          // Save the real user with proper ID
          const realUser = {
            id: realUserId,
            email: data.requestBody.email,
            username: data.requestBody.email.split("@")[0],
            firstName: "", // Default empty since not provided in response
            lastName: "", // Default empty since not provided in response
            emailVerified: false, // Default false since not provided in response
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
        toast.success("Fail to creat user");
      }

      return { success: true };
    } catch (error) {
      toast.error("Failed to create user");
      throw error;
    }
  };

  // Remove the useEffect that auto-selects the first organization
  // Users should manually select an organization from the grid

  // Update handleSubmit to use the offline user creation
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
      // For editing, use RoleAssignment
      const roleAssignment: RoleAssignment = {
        roles: formData.roles,
      };

      updateUserMutation.mutate({
        id: selectedOrg.id,
        membershipId: editingUser.id,
        requestBody: roleAssignment,
      });
    } else {
      // For creating, use offline-first approach
      const memberReq: OrgAdminMemberRequest = {
        email: formData.email,
        roles: formData.roles,
        categories: [], // Empty categories array for now
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

  // Update handleEdit to only set email and roles
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
      userId: userToDelete.id,
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500 text-white";
      case "org_admin":
        return "bg-blue-500 text-white";
      case "Org_User":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "org_admin":
        return t("manageUsers.orgAdmin");
      case "Org_User":
        return t("manageUsers.orgUser");
      default:
        return role;
    }
  };

  if (orgsLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  // In the return statement, show org grid if no org is selected
  if (!selectedOrg) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <Building2 className="w-8 h-8 text-dgrv-blue" />
                <h1 className="text-3xl font-bold text-dgrv-blue">
                  {t("manageUsers.selectOrganization")}
                </h1>
              </div>
              <p className="text-lg text-gray-600">
                {t("manageUsers.clickOrgToManage")}
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(organizations || []).map(
                (org: OrganizationResponse, index: number) => (
                  <Card
                    key={org.id}
                    className="animate-fade-in hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-200 hover:border-dgrv-blue"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => setSelectedOrg(org)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-3">
                        <Building2 className="w-5 h-5 text-dgrv-blue" />
                        <span className="text-lg font-semibold">
                          {org.name}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600 mb-1">
                        <b>Domains:</b> {getDomainNames(org.domains).join(", ")}
                      </div>
                      {getOrgDescription(org) && (
                        <div className="text-sm text-gray-600 mb-1">
                          <b>Description:</b> {getOrgDescription(org)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setSelectedOrg(null)}
              className="px-4 py-2 text-base font-semibold rounded shadow border-2 border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 transition"
            >
              <span className="mr-2">&larr;</span>{" "}
              {t("manageUsers.backToOrganizations")}
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowInvitationDialog(true)}
                className="border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 bg-blue-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </div>
          </div>
          <p className="text-lg text-gray-600 mb-6">
            {t("manageUsers.manageUsersForOrg", { org: selectedOrg.name })}
          </p>

          <Dialog
            open={showAddDialog}
            onOpenChange={(open) => {
              if (!open) resetForm();
              setShowAddDialog(open);
            }}
          >
            <DialogTrigger asChild></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser
                    ? t("manageUsers.editUser")
                    : t("manageUsers.addNewUser")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* In the form UI, only show email and role fields */}
                <div>
                  <Label htmlFor="email">{t("manageUsers.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder={t("manageUsers.emailPlaceholder")}
                  />
                </div>
                {/* In the form UI, make the role select fixed to 'org_admin' and not editable */}
                <div>
                  <Label htmlFor="role">{t("manageUsers.role")}</Label>
                  <Input
                    id="role"
                    value={t("manageUsers.organizationAdmin")}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label htmlFor="organization">
                    {t("manageUsers.organization")}
                  </Label>
                  {/* Organization field - read-only since we're already in a specific org context */}
                  <Input
                    id="organization"
                    value={selectedOrg?.name || ""}
                    readOnly
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                    placeholder="Current organization"
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={handleSubmit}
                    className="bg-dgrv-green hover:bg-green-700"
                    disabled={
                      createUserMutation.isPending ||
                      updateUserMutation.isPending ||
                      isCreatingUser
                    }
                  >
                    {createUserMutation.isPending ||
                    updateUserMutation.isPending ||
                    isCreatingUser
                      ? t("manageUsers.processing", {
                          defaultValue: "Processing...",
                        })
                      : editingUser
                        ? t("manageUsers.update")
                        : t("manageUsers.create")}{" "}
                    {t("manageUsers.user")}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    {t("manageUsers.cancel")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Users Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(users || []).map((user: OrganizationMember, index: number) => (
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
                        <span className="text-lg">
                          {user.firstName} {user.lastName}
                        </span>
                        <p className="text-sm font-normal text-gray-600">
                          @{user.username}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("manageUsers.orgLabel")}{" "}
                          {selectedOrg?.name || t("manageUsers.unknown")}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        user.emailVerified
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }
                    >
                      {user.emailVerified
                        ? t("manageUsers.verified")
                        : t("manageUsers.notVerified")}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* In the user grid, only show email and role */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
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
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:bg-red-50"
                        disabled={deleteUserEntirelyMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(users || []).length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
                <CardContent>
                  <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t("manageUsers.noUsersYet")}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t("manageUsers.addFirstUserDesc")}
                  </p>
                  <Button
                    onClick={() => setShowInvitationDialog(true)}
                    className="border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 bg-blue-50"
                  >
                    Create First User
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* User Invitation Dialog */}
          <Dialog
            open={showInvitationDialog}
            onOpenChange={setShowInvitationDialog}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("userInvitation.title")}</DialogTitle>
              </DialogHeader>
              <UserInvitationForm
                organizations={(organizations || []).map((org) => ({
                  id: org.id || "",
                  name: org.name || "",
                }))}
                categories={transformedCategories}
                defaultOrganizationId={selectedOrg?.id || undefined}
                onInvitationCreated={() => {
                  setShowInvitationDialog(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
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
            isLoading={deleteUserEntirelyMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};
