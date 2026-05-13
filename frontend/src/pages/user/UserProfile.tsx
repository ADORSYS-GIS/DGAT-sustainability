import { useAuth } from "@/hooks/shared/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { User, Mail, Shield, Building2, Key, ArrowLeft, Edit3, Save, X, Lock } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { updateUserProfile, changePassword } from "@/services/userProfileService";

export const UserProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.name?.split(' ')[0] || "",
    lastName: user?.name?.split(' ').slice(1).join(' ') || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="py-12 text-center">
              <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{t('profile.notLoggedIn')}</p>
              <Button onClick={() => navigate("/")} className="mt-4">
                {t('home')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    const normalizedRole = role.toLowerCase();
    switch (normalizedRole) {
      case "dgrv_admin":
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
    const normalizedRole = role.toLowerCase();
    switch (normalizedRole) {
      case "dgrv_admin":
        return t('profile.roles.admin');
      case "org_admin":
        return t('profile.roles.orgAdmin');
      case "org_user":
        return t('profile.roles.orgUser');
      default:
        return role;
    }
  };

  const getOrganizationName = () => {
    if (user.organizations && typeof user.organizations === "object") {
      const orgKeys = Object.keys(user.organizations);
      if (orgKeys.length > 0) {
        return orgKeys[0];
      }
    }
    return user.organization_name || t('profile.noOrganization');
  };

  const allRoles = [...(user.roles || []), ...(user.realm_access?.roles || [])];
  const uniqueRoles = [...new Set(allRoles)].filter(role => 
    !['offline_access', 'uma_authorization', 'default-roles-sustainability-realm'].includes(role)
  );

  const handleEditToggle = () => {
    if (isEditing) {
      setFormData({
        firstName: user?.name?.split(' ')[0] || "",
        lastName: user?.name?.split(' ').slice(1).join(' ') || "",
      });
    }
    setIsEditing(!isEditing);
    setIsChangingPassword(false);
  };

  const handlePasswordToggle = () => {
    setIsChangingPassword(!isChangingPassword);
    setIsEditing(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await updateUserProfile({
        first_name: formData.firstName || undefined,
        last_name: formData.lastName || undefined,
      });
      toast.success(t('profile.edit.successMessage'));
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('profile.edit.errorMessage');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('profile.password.mismatchError'));
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error(t('profile.password.lengthError'));
      return;
    }

    setIsLoading(true);
    try {
      await changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword,
      });
      toast.success(t('profile.password.successMessage'));
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('profile.password.errorMessage');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 text-dgrv-blue hover:text-dgrv-blue/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('profile.back')}
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="w-8 h-8 text-dgrv-green" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                {t('profile.title')}
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={handleEditToggle}
              className="flex items-center space-x-2"
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  <span>{t('common.cancel')}</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>{t('profile.edit.button')}</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-lg text-gray-600 mt-2">
            {t('profile.subtitle')}
          </p>
        </div>

        <div className="space-y-6">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-dgrv-blue" />
                <span>{t('profile.personalInfo.title')}</span>
              </CardTitle>
              <CardDescription>
                {t('profile.personalInfo.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-600">
                    {t('profile.personalInfo.username')}
                  </Label>
                  <Input
                    id="username"
                    value={user.preferred_username || ''}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="userId" className="text-sm font-medium text-gray-600">
                    {t('profile.personalInfo.userId')}
                  </Label>
                  <Input
                    id="userId"
                    value={user.sub || ''}
                    readOnly
                    className="bg-gray-50 font-mono text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-600">
                    {t('profile.edit.firstName')}
                  </Label>
                  <Input
                    id="firstName"
                    value={isEditing ? formData.firstName : (user.name?.split(' ')[0] || '')}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    readOnly={!isEditing}
                    className={isEditing ? "" : "bg-gray-50"}
                    placeholder={isEditing ? t('profile.edit.firstNamePlaceholder') : undefined}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-600">
                    {t('profile.edit.lastName')}
                  </Label>
                  <Input
                    id="lastName"
                    value={isEditing ? formData.lastName : (user.name?.split(' ').slice(1).join(' ') || '')}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    readOnly={!isEditing}
                    className={isEditing ? "" : "bg-gray-50"}
                    placeholder={isEditing ? t('profile.edit.lastNamePlaceholder') : undefined}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-600">
                    {t('profile.personalInfo.email')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      value={user.email || ''}
                      readOnly
                      className="bg-gray-50 pr-20"
                    />
                    {user.email && (
                      <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-500 text-white text-xs">
                        {t('profile.personalInfo.verified')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {isEditing && (
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleEditToggle}
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="bg-dgrv-green hover:bg-green-700"
                  >
                    {isLoading ? (
                      <span>{t('profile.edit.saving')}</span>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {t('profile.edit.save')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-dgrv-blue" />
                <span>{t('profile.rolesAndOrg.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-600">
                  {t('profile.rolesAndOrg.yourRoles')}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {uniqueRoles.length > 0 ? (
                    uniqueRoles.map((role, index) => (
                      <Badge
                        key={index}
                        className={getRoleBadgeColor(role)}
                      >
                        {formatRole(role)}
                      </Badge>
                    ))
                  ) : (
                    <Badge className="bg-gray-500 text-white">
                      {t('profile.rolesAndOrg.noRoles')}
                    </Badge>
                  )}
                </div>
              </div>

              <hr className="border-gray-200" />

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-dgrv-blue" />
                  <Label className="text-sm font-medium text-gray-600">
                    {t('profile.rolesAndOrg.organization')}
                  </Label>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-medium text-gray-900">
                    {getOrganizationName()}
                  </p>
                </div>
              </div>

              {user.categories && user.categories.length > 0 && (
                <>
                  <hr className="border-gray-200" />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-600">
                      {t('profile.rolesAndOrg.assignedCategories')}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {user.categories.map((category, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-dgrv-blue" />
                <span>{t('profile.password.title')}</span>
              </CardTitle>
              <CardDescription>
                {t('profile.password.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isChangingPassword ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-600">
                      {t('profile.password.currentPassword')}
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder={t('profile.password.currentPasswordPlaceholder')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-600">
                      {t('profile.password.newPassword')}
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder={t('profile.password.newPasswordPlaceholder')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-600">
                      {t('profile.password.confirmPassword')}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder={t('profile.password.confirmPasswordPlaceholder')}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={handlePasswordToggle}
                      disabled={isLoading}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={isLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="bg-dgrv-green hover:bg-green-700"
                    >
                      {isLoading ? t('profile.password.changing') : t('profile.password.change')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handlePasswordToggle}
                  variant="outline"
                  className="flex items-center space-x-2 border-dgrv-blue hover:bg-dgrv-blue/5"
                >
                  <Key className="w-4 h-4" />
                  <span>{t('profile.password.button')}</span>
                </Button>
              )}
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">
                  {t('profile.password.notice')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;