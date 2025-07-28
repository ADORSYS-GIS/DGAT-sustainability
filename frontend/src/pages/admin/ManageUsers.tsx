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
import { Users, Plus, Edit, Trash2, Mail, Building2 } from "lucide-react";
import { 
  useOfflineOrganizations, 
  useOfflineUsers, 
  useOfflineSyncStatus 
} from "@/hooks/useOfflineApi";
import type {
  OrganizationMember,
  MemberRequest,
  OrganizationResponse,
} from "@/openapi-rq/requests/types.gen";
import { toast } from "sonner";

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

// Placeholder mutation hooks for user management
function useUserMutations() {
  const [isPending, setIsPending] = useState(false);
  
  const createUser = async (data: { id: string; requestBody: MemberRequest }) => {
    setIsPending(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("User created successfully (offline mode)");
      return { success: true };
    } catch (error) {
      toast.error("Failed to create user");
      throw error;
    } finally {
      setIsPending(false);
    }
  };
  
  const updateUser = async (data: { id: string; membershipId: string; requestBody: MemberRequest }) => {
    setIsPending(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("User updated successfully (offline mode)");
      return { success: true };
    } catch (error) {
      toast.error("Failed to update user");
      throw error;
    } finally {
      setIsPending(false);
    }
  };
  
  const deleteUser = async (data: { id: string; membershipId: string }) => {
    setIsPending(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("User deleted successfully (offline mode)");
      return { success: true };
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
    deleteUser: { mutate: deleteUser, isPending }
  };
}

export const ManageUsers: React.FC = () => {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMember | null>(
    null,
  );
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  // Set the default role to 'org_admin' and make it the only selectable option
  const [formData, setFormData] = useState({
    email: "",
    roles: ["org_admin"],
  });
  
  // Use offline hooks for all data fetching
  const { data: organizations, isLoading: orgsLoading } =
    useOfflineOrganizations();
  // Add a new state to track the selected organization object
  const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(
    null,
  );
  // Only fetch users when selectedOrg is set
  const {
    data: users,
    isLoading: usersLoading,
    refetch,
  } = useOfflineUsers(selectedOrg ? selectedOrg.id : "");
  
  const { createUser, updateUser, deleteUser } = useUserMutations();
  const { isOnline } = useOfflineSyncStatus();

  useEffect(() => {
    if (!selectedOrgId && organizations?.organizations && organizations.organizations.length > 0) {
      setSelectedOrgId(organizations.organizations[0].id);
    }
  }, [organizations, selectedOrgId]);

  // Update handleSubmit to only send email and roles
  const handleSubmit = () => {
    if (!formData.email.trim()) {
      toast.error(t('manageUsers.emailRequired'));
      return;
    }
    if (!selectedOrgId) {
      toast.error(t('manageUsers.selectOrgRequired'));
      return;
    }
    const memberReq: MemberRequest = {
      email: formData.email,
      roles: formData.roles,
    };
    
    if (editingUser) {
      updateUser.mutate({ 
        id: selectedOrgId, 
        membershipId: editingUser.id, 
        requestBody: memberReq 
      }).then(() => {
        refetch();
        setShowAddDialog(false);
        resetForm();
      }).catch(() => {
        // Error already handled in mutation
      });
    } else {
      createUser.mutate({ id: selectedOrgId, requestBody: memberReq }).then(() => {
        refetch();
        setShowAddDialog(false);
        resetForm();
      }).catch(() => {
        // Error already handled in mutation
      });
    }
  };

  // Update handleEdit to only set email and roles
  const handleEdit = (user: OrganizationMember) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      roles: user.roles || ["org_user"],
    });
    setShowAddDialog(true);
  };

  const handleDelete = (userId: string) => {
    const confirmed = window.confirm(
      t('manageUsers.confirmDelete'),
    );
    if (!confirmed) return;
    if (!selectedOrgId) return;
    
    deleteUser.mutate({ id: selectedOrgId, membershipId: userId }).then(() => {
      refetch();
    }).catch(() => {
      // Error already handled in mutation
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
      case "org_user":
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
        return t('manageUsers.orgAdmin');
      case "org_user":
        return t('manageUsers.orgUser');
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
            {/* Offline Status Indicator */}
            <div className="mb-4 flex items-center justify-end">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>

            <div className="mb-8 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <Building2 className="w-8 h-8 text-dgrv-blue" />
                <h1 className="text-3xl font-bold text-dgrv-blue">
                  {t('manageUsers.selectOrganization')}
                </h1>
              </div>
              <p className="text-lg text-gray-600">
                {t('manageUsers.clickOrgToManage')}
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(organizations?.organizations || []).map(
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
          {/* Offline Status Indicator */}
          <div className="mb-4 flex items-center justify-end">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setSelectedOrg(null)}
              className="px-4 py-2 text-base font-semibold rounded shadow border-2 border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 transition"
            >
              <span className="mr-2">&larr;</span> {t('manageUsers.backToOrganizations')}
            </Button>
            <Button
              className="bg-dgrv-green hover:bg-green-700"
              onClick={() => setShowAddDialog(true)}
            >
              {t('manageUsers.addUser')}
            </Button>
          </div>
          {/* Remove the subheader '{t('manageUsers.manageUsersForOrg', { org: selectedOrg.name })}' */}
          <p className="text-lg text-gray-600 mb-6">
            {t('manageUsers.manageUsersForOrg', { org: selectedOrg.name })}
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
                  {editingUser ? t('manageUsers.editUser') : t('manageUsers.addNewUser')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* In the form UI, only show email and role fields */}
                <div>
                  <Label htmlFor="email">{t('manageUsers.email')}</Label>
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
                    placeholder={t('manageUsers.emailPlaceholder')}
                  />
                </div>
                {/* In the form UI, make the role select fixed to 'org_admin' and not editable */}
                <div>
                  <Label htmlFor="role">{t('manageUsers.role')}</Label>
                  <Input
                    id="role"
                    value={t('manageUsers.organizationAdmin')}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label htmlFor="organization">{t('manageUsers.organization')}</Label>
                  <Select
                    value={selectedOrgId}
                    onValueChange={(value) => setSelectedOrgId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('manageUsers.selectOrganizationPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(organizations?.organizations || []).map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={handleSubmit}
                    className="bg-dgrv-green hover:bg-green-700"
                    disabled={createUser.isPending || updateUser.isPending}
                  >
                    {createUser.isPending || updateUser.isPending 
                      ? t('manageUsers.processing', { defaultValue: 'Processing...' })
                      : editingUser ? t('manageUsers.update') : t('manageUsers.create')} {t('manageUsers.user')}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    {t('manageUsers.cancel')}
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
                          {t('manageUsers.orgLabel')}{" "}
                          {(organizations?.organizations || []).find(
                            (org) => org.id === selectedOrgId,
                          )?.name || t('manageUsers.unknown')}
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
                      {user.emailVerified ? t('manageUsers.verified') : t('manageUsers.notVerified')}
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
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:bg-red-50"
                        disabled={deleteUser.isPending}
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
        </div>
      </div>
    </div>
  );
};
