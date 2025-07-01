export interface Question {
  questionId: string;
  text: Record<string, string>;
  weight: number;
  categoryId: string;
  order: number;
  templateId?: string;
}

export const getQuestionsByTemplate = async (templateId: string): Promise<Question[]> => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/questions?templateId=${templateId}`);
  if (!response.ok) throw new Error("Failed to fetch questions");
  return response.json();
}; 