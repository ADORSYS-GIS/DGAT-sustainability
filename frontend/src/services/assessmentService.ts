import { dbService, Assessment, Category, Question } from "./indexedDB";
import { addToSyncQueue } from "./syncService";
import {
  getCategoriesByTemplate,
  getQuestionsByTemplate,
} from "./templateService";

// Assessment management
export const createAssessment = async (
  assessmentData: Omit<Assessment, "assessmentId" | "createdAt" | "updatedAt">,
): Promise<Assessment> => {
  const assessmentId = `assess_${Date.now()}`;
  const now = new Date().toISOString();
  const assessment: Assessment = {
    ...assessmentData,
    assessmentId,
    createdAt: now,
    updatedAt: now,
  };
  await dbService.add("assessments", assessment);

  await addToSyncQueue("create_assessment", assessment, assessmentData.userId);

  return assessment;
};

export const updateAssessment = async (
  assessment: Assessment,
): Promise<void> => {
  assessment.updatedAt = new Date().toISOString();
  if (assessment.status === "submitted" && !assessment.submittedAt) {
    assessment.submittedAt = new Date().toISOString();
  }

  await dbService.update("assessments", assessment);
  await addToSyncQueue("update_assessment", assessment, assessment.userId);
};

export const getAssessmentsByUser = async (
  userId: string,
): Promise<Assessment[]> => {
  return await dbService.getByIndex<Assessment>(
    "assessments",
    "userId",
    userId,
  );
};

export const getAssessmentsByStatus = async (
  status: string,
): Promise<Assessment[]> => {
  return await dbService.getByIndex<Assessment>(
    "assessments",
    "status",
    status,
  );
};

export const getAllAssessments = async (): Promise<Assessment[]> => {
  return await dbService.getAll<Assessment>("assessments");
};

// Calculate assessment score
export const calculateAssessmentScore = async (
  assessmentId: string,
): Promise<{ totalScore: number; categoryScores: Record<string, number> }> => {
  const assessment = await dbService.get<Assessment>(
    "assessments",
    assessmentId,
  );
  if (!assessment) throw new Error("Assessment not found");

  const categories = await getCategoriesByTemplate(assessment.templateId);
  const questions = await getQuestionsByTemplate(assessment.templateId);

  const categoryScores: Record<string, number> = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const category of categories) {
    const categoryQuestions = questions.filter(
      (q) => q.categoryId === category.categoryId,
    );
    let categoryWeightedScore = 0;
    let categoryWeight = 0;

    for (const question of categoryQuestions) {
      const answer = assessment.answers[question.questionId];
      if (answer !== undefined) {
        let score = 0;

        if (question.type === "yes_no") {
          score = answer === true ? 100 : 0;
        } else if (question.type === "percentage") {
          score = typeof answer === "number" ? answer : 0;
        }
        // Text answers don't contribute to score

        categoryWeightedScore += score * question.weight;
        categoryWeight += question.weight;
      }
    }

    const categoryScore =
      categoryWeight > 0 ? categoryWeightedScore / categoryWeight : 0;
    categoryScores[category.categoryId] = Math.round(categoryScore);

    totalWeightedScore += categoryScore * category.weight;
    totalWeight += category.weight;
  }

  const totalScore =
    totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

  return { totalScore, categoryScores };
};
