/**
 * @file User management view component.
 * @description This component displays the list of users for a selected organization and handles user management actions.
 */
import { UserInvitationForm } from "@/components/shared/UserInvitationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  OrganizationMember,
  OrganizationResponse,
} from "@/openapi-rq/requests/types.gen";
import { UserPlus, Users } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import UserCard from "./UserCard";
import UserDialog from "./UserDialog";

interface UserManagementViewProps {
  selectedOrg: OrganizationResponse;
  users: OrganizationMember[];
  onBack: () => void;
  onEdit: (user: OrganizationMember) => void;
  onDelete: (user: OrganizationMember) => void;
  onConfirmDelete: () => void;
  onInvitationCreated: () => void;
  showDeleteConfirmation: boolean;
  setShowDeleteConfirmation: (show: boolean) => void;
  userToDelete: OrganizationMember | null;
  deleteUserEntirelyMutation: { isPending: boolean };
  organizations: OrganizationResponse[];
}

const UserManagementView: React.FC<UserManagementViewProps> = ({
  selectedOrg,
  users,
  onBack,
  onEdit,
  onDelete,
  onConfirmDelete,
  onInvitationCreated,
  showDeleteConfirmation,
  setShowDeleteConfirmation,
  userToDelete,
  deleteUserEntirelyMutation,
  organizations,
}) => {
  const { t } = useTranslation();
  const [showInvitationDialog, setShowInvitationDialog] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={onBack}
              className="px-4 py-2 text-base font-semibold rounded shadow border-2 border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 transition"
            >
              <span className="mr-2">&larr;</span> {t('manageUsers.backToOrganizations')}
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
            {t('manageUsers.manageUsersForOrg', { org: selectedOrg.name })}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(users || []).map((user: OrganizationMember, index: number) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={onEdit}
                onDelete={onDelete}
                selectedOrgName={selectedOrg?.name || ''}
                isDeleting={deleteUserEntirelyMutation.isPending}
                index={index}
              />
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
                    onClick={() => setShowInvitationDialog(true)}
                    className="border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue/10 bg-blue-50"
                  >
                    Create First User
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
          <Dialog
            open={showInvitationDialog}
            onOpenChange={setShowInvitationDialog}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('userInvitation.title')}</DialogTitle>
              </DialogHeader>
              <UserInvitationForm
                organizations={(organizations || []).map(org => ({
                  id: org.id || '',
                  name: org.name || ''
                }))}
                defaultOrganizationId={selectedOrg?.id || undefined}
                onInvitationCreated={onInvitationCreated}
              />
            </DialogContent>
          </Dialog>
          <ConfirmationDialog
            isOpen={showDeleteConfirmation}
            onClose={() => setShowDeleteConfirmation(false)}
            onConfirm={onConfirmDelete}
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
            isLoading={deleteUserEntirelyMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default UserManagementView;