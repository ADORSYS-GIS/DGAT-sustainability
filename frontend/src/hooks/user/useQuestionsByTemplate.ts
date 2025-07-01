import { useQuery } from "@tanstack/react-query";
import { getQuestionsByTemplate } from "@/services/user/questionService";

export const useQuestionsByTemplate = (templateId: string) =>
  useQuery({
    queryKey: ["questions", templateId],
    queryFn: () => getQuestionsByTemplate(templateId),
    enabled: !!templateId,
  }); 