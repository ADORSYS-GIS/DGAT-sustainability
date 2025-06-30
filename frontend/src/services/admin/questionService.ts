const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Question {
  questionId: string;
  text: { [key: string]: string };
  weight: number;
  categoryId: string;
  order: number;
  templateId: string;
}

export const getQuestionsByTemplate = async (
  templateId: string,
): Promise<Question[]> => {
  if (!templateId) return [];
  const response = await fetch(
    `${API_BASE_URL}/questions?templateId=${templateId}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch questions");
  }
  return response.json();
};

export const createQuestion = async (
  questionData: Omit<Question, "questionId">,
): Promise<Question> => {
  const response = await fetch(`${API_BASE_URL}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(questionData),
  });
  if (!response.ok) {
    throw new Error("Failed to create question");
  }
  return response.json();
};

export const updateQuestion = async (question: Question): Promise<Question> => {
  const response = await fetch(
    `${API_BASE_URL}/questions/${question.questionId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(question),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to update question");
  }
  return response.json();
};

export const deleteQuestion = async (questionId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete question");
  }
};
