/**
 * @file hooks.ts
 * @description This file contains custom hooks for the Assessment page.
 */
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineCategoryCatalogs } from "@/hooks/useCategoryCatalogs";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import {
  Assessment as AssessmentType,
  AssessmentDetailResponse,
  Question,
  QuestionRevision,
} from "@/openapi-rq/requests/types.gen";
import React from "react";
import { isAssessmentDetailResponse } from "./services";

type QuestionWithCategory = Question & {
  category: string;
  category_id?: string;
  latest_revision: QuestionRevision;
};

export const useAssessmentData = (assessmentId?: string) => {
  const { user } = useAuth();
  const { data: questionsData } = useOfflineQuestions();
  const { data: categoriesData } = useOfflineCategoryCatalogs();

  const allRoles = React.useMemo(() => {
    if (!user) return [];
    return [...(user.roles || []), ...(user.realm_access?.roles || [])].map(
      (r) => r.toLowerCase()
    );
  }, [user]);

  const isOrgAdmin = React.useMemo(
    () => allRoles.includes("org_admin"),
    [allRoles]
  );

  const orgInfo = React.useMemo(() => {
    if (!user) return { orgId: "", categories: [] };

    let orgId = "";
    if (user.organizations && typeof user.organizations === "object") {
      const orgKeys = Object.keys(user.organizations);
      if (orgKeys.length > 0) {
        const orgData = (
          user.organizations as Record<string, { id: string }>
        )[orgKeys[0]];
        orgId = orgData?.id || "";
      }
    }

    const userCategories =
      !isOrgAdmin && Array.isArray(user.categories)
        ? (user.categories as string[])
        : [];

    return { orgId, categories: userCategories };
  }, [user, isOrgAdmin]);

  const assessmentCategoryIds = React.useMemo(() => {
    if (!assessmentId) return [];
    // This part is tricky without the assessmentDetail.
    // We will assume for now that this logic will be handled in the main component
    // where assessmentDetail is available.
    return [];
  }, [assessmentId]);

  const groupedQuestions = React.useMemo(() => {
    if (!questionsData || !categoriesData) return {};

    const categoryIdToNameMap = new Map<string, string>();
    const categoryNameToIdMap = new Map<string, string>();
    categoriesData.forEach(
      (cat: { category_catalog_id: string; name: string }) => {
        categoryIdToNameMap.set(cat.category_catalog_id, cat.name);
        categoryNameToIdMap.set(cat.name.toLowerCase(), cat.category_catalog_id);
      }
    );

    const groups: Record<
      string,
      { question: Question; revision: QuestionRevision }[]
    > = {};

    (questionsData as unknown as QuestionWithCategory[]).forEach((question) => {
      if (question) {
        let categoryId: string | undefined;
        if (question.category_id && categoryIdToNameMap.has(question.category_id)) {
          categoryId = question.category_id;
        } else if (
          question.category_id &&
          categoryNameToIdMap.has(question.category_id.toLowerCase())
        ) {
          categoryId = categoryNameToIdMap.get(
            question.category_id.toLowerCase()
          );
        } else if (
          question.category &&
          categoryNameToIdMap.has(question.category.toLowerCase())
        ) {
          categoryId = categoryNameToIdMap.get(question.category.toLowerCase());
        }

        if (categoryId) {
          if (!groups[categoryId]) {
            groups[categoryId] = [];
          }
          groups[categoryId].push({
            question,
            revision: question.latest_revision,
          });
        }
      }
    });

    return groups;
  }, [questionsData, categoriesData]);

  return {
    user,
    allRoles,
    isOrgAdmin,
    orgInfo,
    groupedQuestions,
    assessmentCategoryIds,
  };
};

export const useFilteredQuestions = (
  groupedQuestions: Record<
    string,
    { question: Question; revision: QuestionRevision }[]
  >,
  assessmentDetail: AssessmentType | AssessmentDetailResponse | undefined,
  isOrgAdmin: boolean,
  orgInfo: { orgId: string; categories: string[] }
) => {
  const assessmentCategoryIds = React.useMemo(() => {
    if (!assessmentDetail) return [];

    let actualAssessment: AssessmentType;
    if (isAssessmentDetailResponse(assessmentDetail)) {
      actualAssessment = assessmentDetail.assessment;
    } else {
      actualAssessment = assessmentDetail as AssessmentType;
    }

    return actualAssessment.categories || [];
  }, [assessmentDetail]);

  const filteredGroupedQuestions = React.useMemo(() => {
    const filtered: typeof groupedQuestions = {};

    for (const assessmentCatId of assessmentCategoryIds) {
      if (groupedQuestions[assessmentCatId]) {
        if (isOrgAdmin) {
          filtered[assessmentCatId] = groupedQuestions[assessmentCatId];
        } else {
          const userHasCategory = orgInfo.categories.includes(assessmentCatId);
          if (userHasCategory) {
            filtered[assessmentCatId] = groupedQuestions[assessmentCatId];
          }
        }
      }
    }
    return filtered;
  }, [groupedQuestions, assessmentCategoryIds, isOrgAdmin, orgInfo.categories]);

  return {
    filteredGroupedQuestions,
    categories: Object.keys(filteredGroupedQuestions),
    assessmentCategoryIds,
  };
};