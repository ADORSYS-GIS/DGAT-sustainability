import { useQuery } from "@tanstack/react-query";
import { getCategoriesByTemplate } from "@/services/user/categoryService";

export const useCategoriesByTemplate = (templateId: string) =>
  useQuery({
    queryKey: ["categories", templateId],
    queryFn: () => getCategoriesByTemplate(templateId),
    enabled: !!templateId,
  });
