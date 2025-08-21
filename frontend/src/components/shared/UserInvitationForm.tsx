import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { AdminService } from '../../openapi-rq/requests/services.gen';
import type { UserInvitationRequest, UserInvitationResponse } from '../../openapi-rq/requests/types.gen';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';

interface UserInvitationFormProps {
  organizations: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  onInvitationCreated?: () => void;
}

export const UserInvitationForm: React.FC<UserInvitationFormProps> = ({
  organizations,
  categories,
  onInvitationCreated
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<UserInvitationRequest>({
    email: '',
    first_name: '',
    last_name: '',
    organization_id: '',
    roles: ['org_user'],
    categories: []
  });
  const [createdInvitation, setCreatedInvitation] = useState<UserInvitationResponse | null>(null);

  // Create user invitation mutation
  const createUserInvitationMutation = useMutation({
    mutationFn: async (data: UserInvitationRequest): Promise<UserInvitationResponse> => {
      return AdminService.postAdminUserInvitations({ requestBody: data });
    },
    onSuccess: (result) => {
      toast.success(t('userInvitation.createdSuccessfully', {
        email: result.email,
        status: result.status
      }));

      // Store the created invitation for manual triggers
      setCreatedInvitation(result);

      // Reset form
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        organization_id: '',
        roles: ['org_user'],
        categories: []
      });

      onInvitationCreated?.();
    },
    onError: (error) => {
      console.error('Error creating user invitation:', error);
      toast.error(t('userInvitation.creationFailed'));
    }
  });

  // Manual trigger mutations
  const triggerVerificationMutation = useMutation({
    mutationFn: async (userId: string) => {
      return AdminService.postAdminUserInvitationsByUserIdTriggerVerification({ userId });
    },
    onSuccess: () => {
      toast.success('Email verification email sent successfully');
    },
    onError: (error) => {
      console.error('Error triggering verification:', error);
      toast.error('Failed to send verification email');
    }
  });

  const triggerOrgInvitationMutation = useMutation({
    mutationFn: async (userId: string) => {
      return AdminService.postAdminUserInvitationsByUserIdTriggerOrgInvitation({ userId });
    },
    onSuccess: () => {
      toast.success('Organization invitation sent successfully');
    },
    onError: (error) => {
      console.error('Error triggering organization invitation:', error);
      toast.error('Failed to send organization invitation');
    }
  });

  const checkAndTriggerMutation = useMutation({
    mutationFn: async (userId: string) => {
      return AdminService.postAdminUserInvitationsByUserIdCheckAndTrigger({ userId });
    },
    onSuccess: (result) => {
      toast.success('Email verified and organization invitation sent automatically');
    },
    onError: (error) => {
      console.error('Error checking and triggering:', error);
      toast.error('Failed to process email verification');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createUserInvitationMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_email_verification: { color: 'bg-yellow-100 text-yellow-800', label: t('userInvitation.status.pendingEmail') },
      email_verified: { color: 'bg-blue-100 text-blue-800', label: t('userInvitation.status.emailVerified') },
      pending_org_invitation: { color: 'bg-purple-100 text-purple-800', label: t('userInvitation.status.pendingOrg') },
      active: { color: 'bg-green-100 text-green-800', label: t('userInvitation.status.active') },
      error: { color: 'bg-red-100 text-red-800', label: t('userInvitation.status.error') }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.error;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{t('userInvitation.title')}</CardTitle>
        <CardDescription>
          {t('userInvitation.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t('userInvitation.firstName')}</Label>
              <Input
                id="first_name"
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder={t('userInvitation.firstNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t('userInvitation.lastName')}</Label>
              <Input
                id="last_name"
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder={t('userInvitation.lastNamePlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('userInvitation.email')} *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('userInvitation.emailPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">{t('userInvitation.organization')} *</Label>
            <Select
              value={formData.organization_id}
              onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('userInvitation.selectOrganization')} />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('userInvitation.roles')}</Label>
            <div className="flex gap-2">
              {['org_user', 'org_admin'].map((role) => (
                <Button
                  key={role}
                  type="button"
                  variant={formData.roles.includes(role) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newRoles = formData.roles.includes(role)
                      ? formData.roles.filter(r => r !== role)
                      : [...formData.roles, role];
                    setFormData({ ...formData, roles: newRoles });
                  }}
                >
                  {t(`userInvitation.roles.${role}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('userInvitation.categories')}</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  type="button"
                  variant={formData.categories.includes(category.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newCategories = formData.categories.includes(category.id)
                      ? formData.categories.filter(c => c !== category.id)
                      : [...formData.categories, category.id];
                    setFormData({ ...formData, categories: newCategories });
                  }}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">{t('userInvitation.flowInfo.title')}</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. {t('userInvitation.flowInfo.step1')}</li>
              <li>2. {t('userInvitation.flowInfo.step2')}</li>
              <li>3. {t('userInvitation.flowInfo.step3')}</li>
              <li>4. {t('userInvitation.flowInfo.step4')}</li>
            </ol>
          </div>

          <Button type="submit" disabled={createUserInvitationMutation.isPending || !formData.email || !formData.organization_id} className="w-full">
            {createUserInvitationMutation.isPending ? t('userInvitation.creating') : t('userInvitation.create')}
          </Button>
        </form>

        {/* Manual Trigger Section */}
        {createdInvitation && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Manual Controls</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">User ID: {createdInvitation.user_id}</p>
                  <p className="text-sm text-gray-600">Status: {getStatusBadge(createdInvitation.status)}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreatedInvitation(null)}
                >
                  Clear
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => triggerVerificationMutation.mutate(createdInvitation.user_id)}
                  disabled={triggerVerificationMutation.isPending}
                >
                  {triggerVerificationMutation.isPending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => checkAndTriggerMutation.mutate(createdInvitation.user_id)}
                  disabled={checkAndTriggerMutation.isPending}
                >
                  {checkAndTriggerMutation.isPending ? 'Checking...' : 'Check & Send Org Invitation'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => triggerOrgInvitationMutation.mutate(createdInvitation.user_id)}
                  disabled={triggerOrgInvitationMutation.isPending}
                >
                  {triggerOrgInvitationMutation.isPending ? 'Sending...' : 'Force Send Org Invitation'}
                </Button>
              </div>
              
              <div className="text-xs text-gray-500">
                <p><strong>Resend Verification Email:</strong> Sends the email verification email again</p>
                <p><strong>Check & Send Org Invitation:</strong> Checks if email is verified, then sends organization invitation</p>
                <p><strong>Force Send Org Invitation:</strong> Sends organization invitation regardless of email verification status</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
