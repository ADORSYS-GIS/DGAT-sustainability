import { dbService, Organization } from "./indexedDB";
import { addToSyncQueue } from "./syncService";

// Organization management
export const createOrganization = async (
  orgData: Omit<Organization, "organizationId">,
): Promise<Organization> => {
  const organizationId = `org_${Date.now()}`;
  const organization: Organization = { ...orgData, organizationId };
  await dbService.add("organizations", organization);

  await addToSyncQueue("create_organization", organization, "admin");

  return organization;
};

export const updateOrganization = async (
  organization: Organization,
): Promise<void> => {
  await dbService.update("organizations", organization);
  await addToSyncQueue("update_organization", organization, "admin");
};

export const deleteOrganization = async (
  organizationId: string,
): Promise<void> => {
  await dbService.delete("organizations", organizationId);
  await addToSyncQueue("delete_organization", { organizationId }, "admin");
};

export const getAllOrganizations = async (): Promise<Organization[]> => {
  return await dbService.getAll<Organization>("organizations");
};
