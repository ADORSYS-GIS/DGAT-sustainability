import { dbService, Template, Category, Question } from "./indexedDB";
import { addToSyncQueue } from "./syncService";

// Category management
export const createCategory = async (
  categoryData: Omit<Category, "categoryId">,
): Promise<Category> => {
  const categoryId = `cat_${Date.now()}`;
  const category: Category = { ...categoryData, categoryId };
  await dbService.add("categories", category);

  await addToSyncQueue("create_category", category, "admin");

  return category;
};

export const updateCategory = async (category: Category): Promise<void> => {
  await dbService.update("categories", category);
  await addToSyncQueue("update_category", category, "admin");
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await dbService.delete("categories", categoryId);
  await addToSyncQueue("delete_category", { categoryId }, "admin");
};

export const getCategoriesByTemplate = async (
  templateId: string,
): Promise<Category[]> => {
  return await dbService.getByIndex<Category>(
    "categories",
    "templateId",
    templateId,
  );
};

// Question management
export const createQuestion = async (
  questionData: Omit<Question, "questionId">,
): Promise<Question> => {
  const questionId = `q_${Date.now()}`;
  const question: Question = { ...questionData, questionId };
  await dbService.add("questions", question);

  await addToSyncQueue("create_question", question, "admin");

  return question;
};

export const updateQuestion = async (question: Question): Promise<void> => {
  await dbService.update("questions", question);
  await addToSyncQueue("update_question", question, "admin");
};

export const deleteQuestion = async (questionId: string): Promise<void> => {
  await dbService.delete("questions", questionId);
  await addToSyncQueue("delete_question", { questionId }, "admin");
};

export const getQuestionsByCategory = async (
  categoryId: string,
): Promise<Question[]> => {
  return await dbService.getByIndex<Question>(
    "questions",
    "categoryId",
    categoryId,
  );
};

export const getQuestionsByTemplate = async (
  templateId: string,
): Promise<Question[]> => {
  return await dbService.getByIndex<Question>(
    "questions",
    "templateId",
    templateId,
  );
};

// Templates
export const getAllTemplates = async (): Promise<Template[]> => {
  return await dbService.getAll<Template>("templates");
};
