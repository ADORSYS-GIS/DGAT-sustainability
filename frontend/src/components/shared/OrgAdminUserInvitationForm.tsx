import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { OrganizationsService } from "../../openapi-rq/requests/services.gen";
import type {
  OrgAdminMemberRequest,
  OrgAdminUserInvitationResponse,
} from "../../openapi-rq/requests/types.gen";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";

interface OrgAdminUserInvitationFormProps {
  organizationId: string;
  organizationName: string;
  categories: Array<{ id: string; name: string }>;
  onInvitationCreated?: () => void;
}

export const OrgAdminUserInvitationForm: React.FC<
  OrgAdminUserInvitationFormProps
> = ({ organizationId, organizationName, categories, onInvitationCreated }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<OrgAdminMemberRequest>({
    email: "",
    first_name: "",
    last_name: "",
    roles: ["Org_User"], // Default to Org_User for org admin
    categories: [],
  });
  const [createdInvitation, setCreatedInvitation] =
    useState<OrgAdminUserInvitationResponse | null>(null);

  // Create user invitation mutation
  const createUserInvitationMutation = useMutation({
    mutationFn: async (
      data: OrgAdminMemberRequest,
    ): Promise<OrgAdminUserInvitationResponse> => {
      return OrganizationsService.postOrganizationsByOrganizationIdMembers({
        id: organizationId,
        requestBody: data,
      });
    },
    onSuccess: (result) => {
      // Use proper interpolation instead of template placeholders
      const statusText = getStatusText(result.status);
      toast.success(
        `User invitation created successfully for ${result.email}. Status: ${statusText}`,
      );

      // Store the created invitation for manual triggers
      setCreatedInvitation(result);

      // Reset form
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        roles: ["Org_User"], // Default to Org_User for org admin
        categories: [],
      });

      onInvitationCreated?.();
    },
    onError: (error: unknown) => {
      console.error("Error creating user invitation:", error);

      // Provide specific error messages based on the error type
      let errorMessage = t("userInvitation.errors.unknownError");

      // Type guard to check if error has response property
      const isApiError = (
        err: unknown,
      ): err is { response: { status: number; data?: unknown } } => {
        return typeof err === "object" && err !== null && "response" in err;
      };

      // Type guard to check if error has message property
      const isNetworkError = (err: unknown): err is { message: string } => {
        return (
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        );
      };

      // Type guard to check if error is an ApiError object
      const isApiErrorObject = (
        err: unknown,
      ): err is { message: string; status?: number; data?: unknown } => {
        return (
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        );
      };

      if (isApiError(error)) {
        console.log("API Error Response:", {
          status: error.response.status,
          data: error.response.data,
          fullError: error,
        });

        const errorData = error.response.data as
          | { message?: string; error?: string }
          | string;
        const status = error.response.status;

        // Check for user already exists in any status code
        if (
          (typeof errorData === "object" &&
            errorData?.error?.includes("already exists")) ||
          (typeof errorData === "object" &&
            errorData?.message?.includes("already exists")) ||
          (typeof errorData === "object" &&
            errorData?.error?.includes("User exists with same email")) ||
          (typeof errorData === "object" &&
            errorData?.message?.includes("User exists with same email")) ||
          (typeof errorData === "string" &&
            errorData.includes("already exists"))
        ) {
          console.log("User already exists detected");
          errorMessage = t("userInvitation.errors.userAlreadyExists");
        } else {
          switch (status) {
            case 400:
              if (
                (typeof errorData === "object" &&
                  errorData?.message?.includes("email")) ||
                (typeof errorData === "object" &&
                  errorData?.error?.includes("email"))
              ) {
                errorMessage = t("userInvitation.errors.invalidEmail");
              } else if (
                (typeof errorData === "object" &&
                  errorData?.message?.includes("organization")) ||
                (typeof errorData === "object" &&
                  errorData?.error?.includes("organization"))
              ) {
                errorMessage = t("userInvitation.errors.organizationNotFound");
              } else {
                errorMessage = t("userInvitation.errors.validationError");
              }
              break;
            case 403:
              errorMessage = t("userInvitation.errors.insufficientPermissions");
              break;
            case 404:
              errorMessage = t("userInvitation.errors.organizationNotFound");
              break;
            case 409:
              console.log("409 Conflict detected - User already exists");
              errorMessage = t("userInvitation.errors.userAlreadyExists");
              break;
            case 422:
              errorMessage = t("userInvitation.errors.validationError");
              break;
            case 500:
              // Check for user already exists in 500 errors too
              if (
                (typeof errorData === "object" &&
                  errorData?.error?.includes("already exists")) ||
                (typeof errorData === "object" &&
                  errorData?.message?.includes("already exists")) ||
                (typeof errorData === "object" &&
                  errorData?.error?.includes("User exists with same email")) ||
                (typeof errorData === "object" &&
                  errorData?.message?.includes("User exists with same email"))
              ) {
                console.log("User already exists detected in 500 error");
                errorMessage = t("userInvitation.errors.userAlreadyExists");
              } else if (
                typeof errorData === "object" &&
                errorData?.message?.includes("email")
              ) {
                errorMessage = t(
                  "userInvitation.errors.emailServiceUnavailable",
                );
              } else if (
                typeof errorData === "object" &&
                errorData?.message?.includes("invitation")
              ) {
                errorMessage = t(
                  "userInvitation.errors.invitationServiceUnavailable",
                );
              } else {
                errorMessage = t("userInvitation.errors.serverError");
              }
              break;
            case 503:
              errorMessage = t(
                "userInvitation.errors.invitationServiceUnavailable",
              );
              break;
            default:
              console.log("Default case reached with status:", status);
              if (
                isNetworkError(error) &&
                (error.message.includes("Network Error") ||
                  error.message.includes("fetch"))
              ) {
                errorMessage = t("userInvitation.errors.networkError");
              } else {
                errorMessage = t("userInvitation.errors.unknownError");
              }
          }
        }
      } else if (isApiErrorObject(error)) {
        console.log("ApiError Object:", {
          message: error.message,
          status: error.status,
          data: error.data,
        });

        // Handle ApiError objects (like ApiError: Conflict)
        if (error.message === "Conflict" || error.status === 409) {
          console.log("409 Conflict detected in ApiError object");
          errorMessage = t("userInvitation.errors.userAlreadyExists");
        } else if (
          error.message.includes("already exists") ||
          error.message.includes("User exists with same email")
        ) {
          console.log("User already exists detected in ApiError message");
          errorMessage = t("userInvitation.errors.userAlreadyExists");
        } else {
          errorMessage = t("userInvitation.errors.unknownError");
        }
      } else if (isNetworkError(error)) {
        if (
          error.message.includes("Network Error") ||
          error.message.includes("fetch")
        ) {
          errorMessage = t("userInvitation.errors.networkError");
        } else {
          errorMessage = t("userInvitation.errors.unknownError");
        }
      }

      console.log("Final error message:", errorMessage);
      toast.error(errorMessage);
    },
  });

  // Manual trigger mutations
  const triggerVerificationMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Method not available in current API
      throw new Error("User verification trigger not available in current API");
    },
    onSuccess: () => {
      toast.success("Email verification email sent successfully");
    },
    onError: (error) => {
      console.error("Error triggering verification:", error);
      toast.error("Failed to send verification email");
    },
  });

  const triggerOrgInvitationMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Method not available in current API
      throw new Error("Organization invitation trigger not available in current API");
    },
    onSuccess: () => {
      toast.success("Organization invitation sent successfully");
    },
    onError: (error) => {
      console.error("Error triggering organization invitation:", error);
      toast.error("Failed to send organization invitation");
    },
  });

  const checkAndTriggerMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Method not available in current API
      throw new Error("Check and trigger not available in current API");
    },
    onSuccess: (result) => {
      toast.success(
        "Email verified and organization invitation sent automatically",
      );
    },
    onError: (error) => {
      console.error("Error checking and triggering:", error);
      toast.error("Failed to process email verification");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createUserInvitationMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_email_verification: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("userInvitation.status.pendingEmail"),
      },
      email_verified: {
        color: "bg-blue-100 text-blue-800",
        label: t("userInvitation.status.emailVerified"),
      },
      pending_org_invitation: {
        color: "bg-purple-100 text-purple-800",
        label: t("userInvitation.status.pendingOrg"),
      },
      active: {
        color: "bg-green-100 text-green-800",
        label: t("userInvitation.status.active"),
      },
      error: {
        color: "bg-red-100 text-red-800",
        label: t("userInvitation.status.error"),
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.error;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // Helper function to get readable status text
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending_email_verification: t("userInvitation.status.pendingEmail"),
      email_verified: t("userInvitation.status.emailVerified"),
      pending_org_invitation: t("userInvitation.status.pendingOrg"),
      active: t("userInvitation.status.active"),
      error: t("userInvitation.status.error"),
    };
    return statusMap[status] || status;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {t("userInvitation.title")} - {organizationName}
        </CardTitle>
        <CardDescription>{t("userInvitation.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                {t("userInvitation.firstName")}
              </Label>
              <Input
                id="first_name"
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                placeholder={t("userInvitation.firstNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t("userInvitation.lastName")}</Label>
              <Input
                id="last_name"
                type="text"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                placeholder={t("userInvitation.lastNamePlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("userInvitation.email")} *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder={t("userInvitation.emailPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("userInvitation.role")}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled
                className="bg-gray-100 text-gray-800 cursor-not-allowed"
              >
                {t("userInvitation.roles.Org_User")}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Organization Admin can only create Organization User accounts
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("userInvitation.categories")}</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  type="button"
                  variant={
                    formData.categories.includes(category.id)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    const newCategories = formData.categories.includes(
                      category.id,
                    )
                      ? formData.categories.filter((c) => c !== category.id)
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
            <h4 className="font-medium text-blue-900 mb-2">
              {t("userInvitation.flowInfo.title")}
            </h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. {t("userInvitation.flowInfo.step1")}</li>
              <li>2. {t("userInvitation.flowInfo.step2")}</li>
              <li>3. {t("userInvitation.flowInfo.step3")}</li>
              <li>4. {t("userInvitation.flowInfo.step4")}</li>
            </ol>
          </div>

          <Button
            type="submit"
            disabled={createUserInvitationMutation.isPending || !formData.email}
            className="w-full"
          >
            {createUserInvitationMutation.isPending
              ? t("userInvitation.creating")
              : t("userInvitation.create")}
          </Button>
        </form>

        {/* Manual Trigger Section */}
        {createdInvitation && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Manual Controls</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    User ID: {createdInvitation.user_id}
                  </p>
                  <p className="text-sm text-gray-600">
                    Status: {getStatusBadge(createdInvitation.status)}
                  </p>
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
                  onClick={() =>
                    triggerVerificationMutation.mutate(
                      createdInvitation.user_id,
                    )
                  }
                  disabled={triggerVerificationMutation.isPending}
                >
                  {triggerVerificationMutation.isPending
                    ? "Sending..."
                    : "Resend Verification Email"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    checkAndTriggerMutation.mutate(createdInvitation.user_id)
                  }
                  disabled={checkAndTriggerMutation.isPending}
                >
                  {checkAndTriggerMutation.isPending
                    ? "Checking..."
                    : "Check & Send Org Invitation"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    triggerOrgInvitationMutation.mutate(
                      createdInvitation.user_id,
                    )
                  }
                  disabled={triggerOrgInvitationMutation.isPending}
                >
                  {triggerOrgInvitationMutation.isPending
                    ? "Sending..."
                    : "Force Send Org Invitation"}
                </Button>
              </div>

              <div className="text-xs text-gray-500">
                <p>
                  <strong>Resend Verification Email:</strong> Sends the email
                  verification email again
                </p>
                <p>
                  <strong>Check & Send Org Invitation:</strong> Checks if email
                  is verified, then sends organization invitation
                </p>
                <p>
                  <strong>Force Send Org Invitation:</strong> Sends organization
                  invitation regardless of email verification status
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
