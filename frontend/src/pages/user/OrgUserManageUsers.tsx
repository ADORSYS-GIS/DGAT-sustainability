import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/shared/Navbar";
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
import { Users, Edit, Trash2, Mail } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import { 
  useOfflineUsers
} from "@/hooks/useOfflineApi";
import type {
  OrganizationMember,
  OrgAdminMemberRequest,
  OrgAdminMemberCategoryUpdateRequest,
} from "@/openapi-rq/requests/types.gen";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { offlineDB } from "@/services/indexeddb";
import { OrganizationMembersService } from "@/openapi-rq/requests/services.gen";
import type { OfflineUser } from "@/types/offline";

// Helper to get org and categories from ID token
function getOrgAndCategoriesAndId(user: Record<string, unknown>) {
  if (!user || !user.organizations)
    return { orgName: "", orgId: "", categories: [] };
  
  const organizations = user.organizations as Record<string, { id: string; categories: string[] }>;
  const orgKeys = Object.keys(organizations);
  
  if (orgKeys.length === 0) 
    return { orgName: "", orgId: "", categories: [] };
  
  const orgName = orgKeys[0]; // First organization
  const orgData = organizations[orgName];
  
  return { 
    orgName, 
    orgId: orgData?.id || "", 
    categories: orgData?.categories || [] 
  };
}

// Offline-first user mutation hooks
function useUserMutations() {
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
          toast.success("User created successfully");
        }
      } catch (apiError) {
        console.warn('API call failed, user saved locally for sync:', apiError);
        // Removed offline sync toast
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error in createUser:', error);
      toast.error("Failed to create user");
      throw error;
    } finally {
      setIsPending(false);
    }
  };
  
  const updateUser = async (data: { id: string; memberId: string; requestBody: OrgAdminMemberCategoryUpdateRequest }) => {
    setIsPending(true);
    try {
      // Get existing user from IndexedDB
      const existingUser = await offlineDB.getUser(data.memberId);
      if (!existingUser) {
        throw new Error('User not found');
      }
      
      // Update user locally - categories are stored separately in the API response
      const updatedUser: OfflineUser = {
        ...existingUser,
        sync_status: 'pending',
        updated_at: new Date().toISOString()
      };
      
      await offlineDB.saveUser(updatedUser);
      
      // Attempt API call
      try {
        await OrganizationMembersService.putOrganizationsByIdOrgAdminMembersByMemberIdCategories({
          id: data.id,
          memberId: data.memberId,
          requestBody: data.requestBody
        });
        
        // API call succeeded, mark as synced
        await offlineDB.saveUser({
          ...updatedUser,
          sync_status: 'synced',
          updated_at: new Date().toISOString()
        });
        
        toast.success("User updated successfully");
        return { success: true };
      } catch (apiError) {
        // API call failed, queue for sync
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
        throw new Error('User not found');
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
        
        toast.success("User deleted successfully");
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

export const OrgUserManageUsers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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
  
  const { createUser, updateUser, deleteUser } = useUserMutations();
  // Remove useOfflineSyncStatus, useOfflineSync, sync, isSyncing

  // Remove all useEffect related to sync

  // Manual sync function
  // Remove handleManualSync function

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

  const handleDelete = (userId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user from the organization? This action cannot be undone.",
      )
    )
      return;
    if (!orgId) return;
    
    deleteUser.mutate({ id: orgId, memberId: userId }).then(() => {
      refetch();
    }).catch(() => {
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
      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Remove Offline Status Indicator and Manual Sync Button */}
        
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/user/dashboard")}
            className="px-4 py-2 text-base font-semibold rounded shadow border-2 border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 transition"
          >
            <span className="mr-2">&larr;</span> Back to Dashboard
          </Button>
          <Button
            className="bg-dgrv-green hover:bg-green-700"
            onClick={() => setShowAddDialog(true)}
          >
            + Add User
          </Button>
        </div>
        <p className="text-lg text-gray-600 mb-6">
          Add and manage users across{" "}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit User" : "Add New User"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label htmlFor="categories">Categories</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((cat) => (
                    <label key={cat} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(cat)}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            categories: e.target.checked
                              ? [...prev.categories, cat]
                              : prev.categories.filter((c) => c !== cat),
                          }));
                        }}
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value="Organization User"
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
                    ? "Processing..." 
                    : editingUser ? "Update" : "Create"} User
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Users Grid */}
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
                        <p className="text-xs text-gray-500">Org: {orgName}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        user.emailVerified
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }
                    >
                      {user.emailVerified ? "Verified" : "Not Verified"}
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
                        user.categories.map((cat: string) => (
                          <Badge
                            key={cat}
                            className="bg-blue-100 text-blue-700"
                          >
                            {cat}
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
            ),
          )}
          {(users || []).length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
              <CardContent>
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No users yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Add your first user to get started.
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-dgrv-green hover:bg-green-700"
                >
                  Add First User
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
