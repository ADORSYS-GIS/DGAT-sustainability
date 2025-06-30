import { useQuery } from "@tanstack/react-query";
import { getAllAssessments } from "@/services/admin/organizationService";

export const useAssessments = () =>
  useQuery({ queryKey: ["assessments"], queryFn: getAllAssessments });
