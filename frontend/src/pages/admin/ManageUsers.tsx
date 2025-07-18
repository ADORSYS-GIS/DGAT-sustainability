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
  useOrganizationsServiceGetAdminOrganizations,
} from "@/openapi-rq/queries/queries";
import {
  useOrganizationMembersServiceGetApiOrganizationsByIdMembers,
  useOrganizationMembersServicePostApiOrganizationsByIdMembers,
  useOrganizationMembersServiceDeleteApiOrganizationsByIdMembersByMembershipId,
  useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles,
} from "@/openapi-rq/queries/queries";
import type { OrganizationMember, MemberRequest } from "@/openapi-rq/requests/types.gen";

export const ManageUsers: React.FC = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMember | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    roles: ["org_user"],
  });
  const { data: organizations, isLoading: orgsLoading } = useOrganizationsServiceGetAdminOrganizations();
  const { data: users, isLoading: usersLoading, refetch } = useOrganizationMembersServiceGetApiOrganizationsByIdMembers({ id: selectedOrgId }, undefined, { enabled: !!selectedOrgId });
  const createUserMutation = useOrganizationMembersServicePostApiOrganizationsByIdMembers({
    onSuccess: () => { refetch(); setShowAddDialog(false); resetForm(); },
  });
  const deleteUserMutation = useOrganizationMembersServiceDeleteApiOrganizationsByIdMembersByMembershipId({
    onSuccess: () => refetch(),
  });
  // For role update, you can use useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles

  useEffect(() => {
    if (!selectedOrgId && organizations && organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [organizations, selectedOrgId]);

  const handleSubmit = () => {
    if (!formData.username.trim() || !formData.email.trim()) {
      alert("Username and email are required");
      return;
    }
    if (!selectedOrgId) {
      alert("Please select an organization");
      return;
    }
    const memberReq: MemberRequest = {
      user_id: formData.username,
      roles: formData.roles,
    };
    createUserMutation.mutate({ id: selectedOrgId, requestBody: memberReq });
  };

  const handleEdit = (user: OrganizationMember) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      roles: user.roles || ["org_user"],
    });
    setShowAddDialog(true);
  };

  const handleDelete = (membershipId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    if (!selectedOrgId) return;
    deleteUserMutation.mutate({ id: selectedOrgId, membershipId });
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      roles: ["org_user"],
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
        return "Org Admin";
      case "org_user":
        return "Org User";
      default:
        return role;
    }
  };

  if (orgsLoading || usersLoading) {
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

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    Manage Users
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  Add and manage users across organizations
                </p>
              </div>

              <Dialog
                open={showAddDialog}
                onOpenChange={(open) => {
                  if (!open) resetForm();
                  setShowAddDialog(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-dgrv-green hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingUser ? "Edit User" : "Add New User"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
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
                        placeholder="Enter email"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              firstName: e.target.value,
                            }))
                          }
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              lastName: e.target.value,
                            }))
                          }
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={formData.roles[0]}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, roles: [value] }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="org_admin">
                            Organization Admin
                          </SelectItem>
                          <SelectItem value="org_user">
                            Organization User
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="organization">Organization</Label>
                      <Select
                        value={selectedOrgId}
                        onValueChange={(value) => setSelectedOrgId(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {(organizations || []).map((org) => (
                            <SelectItem
                              key={org.id}
                              value={org.id}
                            >
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
            </div>
          </div>

          {/* Users Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(users || []).map((user: OrganizationMember, index: number) => (
              <Card
                key={user.user_id}
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
                          {user.first_name} {user.last_name}
                        </span>
                        <p className="text-sm font-normal text-gray-600">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <Badge className={getRoleBadgeColor(user.roles[0])}>
                      {formatRole(user.roles[0])}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user.user_id)}
                        className="text-red-600 hover:bg-red-50"
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
    </div>
  );
};