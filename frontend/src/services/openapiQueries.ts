import { useQuery, useMutation, UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import {
  OrganizationsService,
  AdminService,
  type PostOrganizationsData,
  type PutOrganizationsByOrganizationIdData,
  type DeleteOrganizationsByOrganizationIdData,
  type GetOrganizationsByOrganizationIdMembersData,
  type PostOrganizationsByOrganizationIdMembersData,
  type DeleteOrganizationsByOrganizationIdMembersByUserIdData,
} from "@/openapi-rq/requests/services.gen";

// Query: GET /organizations
export function useOrganizationsServiceGetOrganizations(
  queryOptions?: UseQueryOptions<any, unknown, any, ["organizations"]>,
) {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: () => OrganizationsService.getAdminOrganizations(),
    ...(queryOptions as any),
  });
}

// Mutation: POST /organizations
export function useOrganizationsServicePostOrganizations(
  options?: UseMutationOptions<any, unknown, PostOrganizationsData>,
) {
  return useMutation({
    mutationFn: (variables: PostOrganizationsData) =>
      OrganizationsService.postOrganizations(variables),
    ...(options as any),
  });
}

// Mutation: PUT /organizations/{organization_id}
export function useOrganizationsServicePutOrganizationsByOrganizationId(
  options?: UseMutationOptions<any, unknown, PutOrganizationsByOrganizationIdData>,
) {
  return useMutation({
    mutationFn: (variables: PutOrganizationsByOrganizationIdData) =>
      OrganizationsService.putOrganizationsByOrganizationId(variables),
    ...(options as any),
  });
}

// Mutation: DELETE /organizations/{organization_id}
export function useOrganizationsServiceDeleteOrganizationsByOrganizationId(
  options?: UseMutationOptions<any, unknown, DeleteOrganizationsByOrganizationIdData>,
) {
  return useMutation({
    mutationFn: (variables: DeleteOrganizationsByOrganizationIdData) =>
      OrganizationsService.deleteOrganizationsByOrganizationId(variables),
    ...(options as any),
  });
}

// Query: GET /organizations/{organization_id}/members
export function useOrganizationsServiceGetOrganizationsByOrganizationIdMembers(
  params: GetOrganizationsByOrganizationIdMembersData,
  _requestOptions?: unknown,
  queryOptions?: UseQueryOptions<any, unknown, any, ["organizationMembers", string]>,
) {
  const id = (params as any).id ?? (params as any).organizationId ?? "";
  return useQuery({
    queryKey: ["organizationMembers", id as string],
    queryFn: () => OrganizationsService.getOrganizationsByOrganizationIdMembers(params),
    enabled: !!id,
    ...(queryOptions as any),
  });
}

// Mutation: POST /organizations/{organization_id}/members
export function useOrganizationsServicePostOrganizationsByOrganizationIdMembers(
  options?: UseMutationOptions<any, unknown, PostOrganizationsByOrganizationIdMembersData>,
) {
  return useMutation({
    mutationFn: (variables: PostOrganizationsByOrganizationIdMembersData) =>
      OrganizationsService.postOrganizationsByOrganizationIdMembers(variables),
    ...(options as any),
  });
}

// Mutation: DELETE /organizations/{organization_id}/members/{user_id}
export function useOrganizationsServiceDeleteOrganizationsByOrganizationIdMembersByUserId(
  options?: UseMutationOptions<any, unknown, DeleteOrganizationsByOrganizationIdMembersByUserIdData>,
) {
  return useMutation({
    mutationFn: (
      variables: DeleteOrganizationsByOrganizationIdMembersByUserIdData,
    ) => OrganizationsService.deleteOrganizationsByOrganizationIdMembersByUserId(variables),
    ...(options as any),
  });
}

// Mutation: DELETE /admin/users/{user_id}
export function useAdminServiceDeleteAdminUsersByUserId(
  options?: UseMutationOptions<any, unknown, { userId: string }>,
) {
  return useMutation({
    mutationFn: (variables: { userId: string }) =>
      AdminService.deleteAdminUsersByUserId({ userId: variables.userId }),
    ...(options as any),
  });
}




