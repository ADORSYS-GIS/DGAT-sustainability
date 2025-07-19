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
  useOrganizationMembersServiceGetOrganizationsByIdMembers,
  useOrganizationMembersServicePostOrganizationsByIdMembers,
  useOrganizationMembersServiceDeleteAdminOrganizationsByIdMembersByMembershipId,
  useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles,
} from "@/openapi-rq/queries/queries";
import type { OrganizationMember, MemberRequest, OrganizationResponse } from "@/openapi-rq/requests/types.gen";

// Helper to extract domain names
function getDomainNames(domains: unknown): string[] {
  if (Array.isArray(domains)) {
    return domains.map((d) => typeof d === 'string' ? d : (d && typeof d === 'object' && 'name' in d ? (d as { name: string }).name : ''));
  }
  return [];
}
// Helper to extract description
function getOrgDescription(org: OrganizationResponse): string | undefined {
  // @ts-expect-error: description may exist at the top level or in attributes
  return org.description ?? org.attributes?.description?.[0];
}

export const ManageUsers: React.FC = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationMember | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  // Set the default role to 'org_admin' and make it the only selectable option
  const [formData, setFormData] = useState({
    email: "",
    roles: ["org_admin"],
  });
  const { data: organizations, isLoading: orgsLoading } = useOrganizationsServiceGetAdminOrganizations();
  // Add a new state to track the selected organization object
  const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(null);
  // Only fetch users when selectedOrg is set
  const { data: users, isLoading: usersLoading, refetch } = useOrganizationMembersServiceGetOrganizationsByIdMembers(
    selectedOrg ? { id: selectedOrg.id } : { id: "" },
    undefined,
    { enabled: !!selectedOrg }
  );
  const createUserMutation = useOrganizationMembersServicePostOrganizationsByIdMembers({
    onSuccess: () => { refetch(); setShowAddDialog(false); resetForm(); },
  });
  const deleteUserMutation = useOrganizationMembersServiceDeleteAdminOrganizationsByIdMembersByMembershipId({
    onSuccess: () => refetch(),
  });
  // For role update, you can use useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles

  useEffect(() => {
    if (!selectedOrgId && organizations && organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [organizations, selectedOrgId]);

  // Update handleSubmit to only send email and roles
  const handleSubmit = () => {
    if (!formData.email.trim()) {
      alert("Email is required");
      return;
    }
    if (!selectedOrgId) {
      alert("Please select an organization");
      return;
    }
    const memberReq: MemberRequest = {
      email: formData.email,
      roles: formData.roles,
    };
    createUserMutation.mutate({ id: selectedOrgId, requestBody: memberReq });
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
    const confirmed = window.confirm("Are you sure you want to delete this user from the organization? This action cannot be undone.");
    if (!confirmed) return;
    if (!selectedOrgId) return;
    deleteUserMutation.mutate({ id: selectedOrgId, membershipId: userId });
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

  // In the return statement, show org grid if no org is selected
  if (!selectedOrg) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <Building2 className="w-8 h-8 text-dgrv-blue" />
                <h1 className="text-3xl font-bold text-dgrv-blue">Select an Organization</h1>
              </div>
              <p className="text-lg text-gray-600">Click an organization to manage its users</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(organizations || []).map((org: OrganizationResponse, index: number) => (
                <Card
                  key={org.id}
                  className="animate-fade-in hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-200 hover:border-dgrv-blue"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => setSelectedOrg(org)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <Building2 className="w-5 h-5 text-dgrv-blue" />
                      <span className="text-lg font-semibold">{org.name}</span>
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
              ))}
            </div>
          </div>
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
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setSelectedOrg(null)}
              className="px-4 py-2 text-base font-semibold rounded shadow border-2 border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 transition"
            >
              <span className="mr-2">&larr;</span> Back to Organizations
            </Button>
            <Button
              className="bg-dgrv-green hover:bg-green-700"
              onClick={() => setShowAddDialog(true)}
            >
              + Add User
            </Button>
          </div>
          {/* Remove the subheader 'Manage Users for {selectedOrg.name}' */}
          <p className="text-lg text-gray-600 mb-6">
            Add and manage users across {selectedOrg.name}
          </p>

          <Dialog
            open={showAddDialog}
            onOpenChange={(open) => {
              if (!open) resetForm();
              setShowAddDialog(open);
            }}
          >
            <DialogTrigger asChild>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Edit User" : "Add New User"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* In the form UI, only show email and role fields */}
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
                {/* In the form UI, make the role select fixed to 'org_admin' and not editable */}
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value="Organization Admin"
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
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
                          Org: {(organizations || []).find(org => org.id === selectedOrgId)?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <Badge className={user.emailVerified ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
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