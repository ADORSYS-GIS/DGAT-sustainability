import { useQuery } from "@tanstack/react-query";
import { AllOrganizations } from "../../services/admin/organizationService";

export const useOrganizations = () =>
  useQuery({ queryKey: ["organizations"], queryFn: AllOrganizations });
