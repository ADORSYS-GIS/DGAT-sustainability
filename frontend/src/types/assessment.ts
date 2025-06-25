export interface Question {
  id: string;
  categoryId: string;
  text: string;
  type: "yes_no" | "percentage" | "text";
  weight?: number;
  order: number;
  translations?: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  weight: number;
  order: number;
  toolType: "dgat" | "sustainability";
  translations?: Record<string, string>;
}

export interface Answer {
  questionId: string;
  value: boolean | number | string;
  comments?: string;
}

export interface Assessment {
  id: string;
  userId: string;
  organizationId: string;
  toolType: "dgat" | "sustainability";
  status: "draft" | "submitted" | "reviewed";
  answers: Answer[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface Recommendation {
  id: string;
  assessmentId: string;
  questionId?: string;
  text: string;
  type: "standard" | "custom";
  createdBy: string;
  createdAt: string;
}
