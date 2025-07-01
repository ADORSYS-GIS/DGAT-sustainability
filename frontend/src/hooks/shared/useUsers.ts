import { useQuery } from "@tanstack/react-query";
import { getAllUsers } from "@/services/admin/organizationService";

export const useUsers = () =>
  useQuery({ queryKey: ["users"], queryFn: getAllUsers });
