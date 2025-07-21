import { useState, useEffect } from "react";
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
  useOrganizationMembersServiceGetOrganizationsByIdOrgAdminMembers,
  useOrganizationMembersServicePostOrganizationsByIdOrgAdminMembers,
  useOrganizationMembersServiceDeleteOrganizationsByIdOrgAdminMembersByMemberId,
  useOrganizationMembersServicePutOrganizationsByIdOrgAdminMembersByMemberIdCategories,
} from "@/openapi-rq/queries/queries";
import type {
  OrganizationMember,
  OrgAdminMemberRequest,
  OrgAdminMemberCategoryUpdateRequest,
} from "@/openapi-rq/requests/types.gen";
import { useNavigate } from "react-router-dom";

// Helper to get org and categories from ID token
function getOrgAndCategoriesAndId(user: any) {
  if (!user || !user.organizations)
    return { orgName: "", orgId: "", categories: [] };
  const orgKeys = Object.keys(user.organizations);
  if (orgKeys.length === 0) return { orgName: "", orgId: "", categories: [] };
  const orgName = orgKeys[0];
  const orgObj = user.organizations[orgName] || {};
  const orgId = orgObj.id || "";
  const categories = orgObj.categories || [];
  return { orgName, orgId, categories };
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

  // Responsive layout: use a card grid and modern header
  const {
    data: users,
    isLoading: usersLoading,
    refetch,
  } = useOrganizationMembersServiceGetOrganizationsByIdOrgAdminMembers(
    { id: orgId },
    undefined,
    { enabled: !!orgId },
  );
  const createUserMutation =
    useOrganizationMembersServicePostOrganizationsByIdOrgAdminMembers({
      onSuccess: () => {
        refetch();
        setShowAddDialog(false);
        resetForm();
      },
    });
  const deleteUserMutation =
    useOrganizationMembersServiceDeleteOrganizationsByIdOrgAdminMembersByMemberId(
      {
        onSuccess: () => refetch(),
      },
    );
  const updateCategoriesMutation =
    useOrganizationMembersServicePutOrganizationsByIdOrgAdminMembersByMemberIdCategories(
      {
        onSuccess: () => {
          refetch();
          setShowAddDialog(false);
          resetForm();
        },
      },
    );

  const handleSubmit = () => {
    if (!formData.email.trim()) {
      alert("Email is required");
      return;
    }
    if (!orgId) {
      alert("Organization not found");
      return;
    }
    if (editingUser) {
      // Only update categories for existing user
      const req: OrgAdminMemberCategoryUpdateRequest = {
        categories: formData.categories,
      };
      updateCategoriesMutation.mutate({
        id: orgId,
        memberId: editingUser.id,
        requestBody: req,
      });
    } else {
      const memberReq: OrgAdminMemberRequest = {
        email: formData.email,
        roles: ["Org_User"],
        categories: formData.categories,
      };
      createUserMutation.mutate({ id: orgId, requestBody: memberReq });
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
    deleteUserMutation.mutate({ id: orgId, memberId: userId });
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
                >
                  {editingUser ? "Update" : "Create"} User
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
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:bg-red-50"
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
