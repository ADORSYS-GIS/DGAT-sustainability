// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { type QueryClient } from "@tanstack/react-query";
import {
  AdminService,
  AssessmentsService,
  FilesService,
  HealthService,
  QuestionsService,
  ReportsService,
  ResponsesService,
  SubmissionsService,
} from "../requests/services.gen";
import * as Common from "./common";
export const prefetchUseHealthServiceGetHealth = (queryClient: QueryClient) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseHealthServiceGetHealthKeyFn(),
    queryFn: () => HealthService.getHealth(),
  });
export const prefetchUseQuestionsServiceGetQuestions = (
  queryClient: QueryClient,
  {
    category,
    language,
  }: {
    category?: string;
    language?: string;
  } = {},
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseQuestionsServiceGetQuestionsKeyFn({
      category,
      language,
    }),
    queryFn: () => QuestionsService.getQuestions({ category, language }),
  });
export const prefetchUseQuestionsServiceGetQuestionsByQuestionId = (
  queryClient: QueryClient,
  {
    language,
    questionId,
    revisionId,
  }: {
    language?: string;
    questionId: string;
    revisionId?: string;
  },
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseQuestionsServiceGetQuestionsByQuestionIdKeyFn({
      language,
      questionId,
      revisionId,
    }),
    queryFn: () =>
      QuestionsService.getQuestionsByQuestionId({
        language,
        questionId,
        revisionId,
      }),
  });
export const prefetchUseAssessmentsServiceGetAssessments = (
  queryClient: QueryClient,
  {
    language,
  }: {
    language?: string;
  } = {},
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseAssessmentsServiceGetAssessmentsKeyFn({ language }),
    queryFn: () => AssessmentsService.getAssessments({ language }),
  });
export const prefetchUseAssessmentsServiceGetAssessmentsByAssessmentId = (
  queryClient: QueryClient,
  {
    assessmentId,
  }: {
    assessmentId: string;
  },
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseAssessmentsServiceGetAssessmentsByAssessmentIdKeyFn({
      assessmentId,
    }),
    queryFn: () =>
      AssessmentsService.getAssessmentsByAssessmentId({ assessmentId }),
  });
export const prefetchUseResponsesServiceGetAssessmentsByAssessmentIdResponses =
  (
    queryClient: QueryClient,
    {
      assessmentId,
      latestOnly,
    }: {
      assessmentId: string;
      latestOnly?: boolean;
    },
  ) =>
    queryClient.prefetchQuery({
      queryKey:
        Common.UseResponsesServiceGetAssessmentsByAssessmentIdResponsesKeyFn({
          assessmentId,
          latestOnly,
        }),
      queryFn: () =>
        ResponsesService.getAssessmentsByAssessmentIdResponses({
          assessmentId,
          latestOnly,
        }),
    });
export const prefetchUseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseId =
  (
    queryClient: QueryClient,
    {
      assessmentId,
      responseId,
    }: {
      assessmentId: string;
      responseId: string;
    },
  ) =>
    queryClient.prefetchQuery({
      queryKey:
        Common.UseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdKeyFn(
          { assessmentId, responseId },
        ),
      queryFn: () =>
        ResponsesService.getAssessmentsByAssessmentIdResponsesByResponseId({
          assessmentId,
          responseId,
        }),
    });
export const prefetchUseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistory =
  (
    queryClient: QueryClient,
    {
      assessmentId,
      responseId,
    }: {
      assessmentId: string;
      responseId: string;
    },
  ) =>
    queryClient.prefetchQuery({
      queryKey:
        Common.UseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryKeyFn(
          { assessmentId, responseId },
        ),
      queryFn: () =>
        ResponsesService.getAssessmentsByAssessmentIdResponsesByResponseIdHistory(
          { assessmentId, responseId },
        ),
    });
export const prefetchUseSubmissionsServiceGetSubmissions = (
  queryClient: QueryClient,
  {
    status,
  }: {
    status?:
      | "pending_review"
      | "under_review"
      | "approved"
      | "rejected"
      | "revision_requested";
  } = {},
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseSubmissionsServiceGetSubmissionsKeyFn({ status }),
    queryFn: () => SubmissionsService.getSubmissions({ status }),
  });
export const prefetchUseSubmissionsServiceGetSubmissionsBySubmissionId = (
  queryClient: QueryClient,
  {
    submissionId,
  }: {
    submissionId: string;
  },
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseSubmissionsServiceGetSubmissionsBySubmissionIdKeyFn({
      submissionId,
    }),
    queryFn: () =>
      SubmissionsService.getSubmissionsBySubmissionId({ submissionId }),
  });
export const prefetchUseAdminServiceGetAdminSubmissions = (
  queryClient: QueryClient,
  {
    status,
  }: {
    status?:
      | "pending_review"
      | "under_review"
      | "approved"
      | "rejected"
      | "revision_requested";
  } = {},
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseAdminServiceGetAdminSubmissionsKeyFn({ status }),
    queryFn: () => AdminService.getAdminSubmissions({ status }),
  });
export const prefetchUseReportsServiceGetSubmissionsBySubmissionIdReports = (
  queryClient: QueryClient,
  {
    reportType,
    submissionId,
  }: {
    reportType?: "sustainability" | "compliance" | "summary" | "detailed";
    submissionId: string;
  },
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseReportsServiceGetSubmissionsBySubmissionIdReportsKeyFn({
      reportType,
      submissionId,
    }),
    queryFn: () =>
      ReportsService.getSubmissionsBySubmissionIdReports({
        reportType,
        submissionId,
      }),
  });
export const prefetchUseReportsServiceGetReportsByReportId = (
  queryClient: QueryClient,
  {
    reportId,
  }: {
    reportId: string;
  },
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseReportsServiceGetReportsByReportIdKeyFn({ reportId }),
    queryFn: () => ReportsService.getReportsByReportId({ reportId }),
  });
export const prefetchUseFilesServiceGetFilesByFileId = (
  queryClient: QueryClient,
  {
    fileId,
  }: {
    fileId: string;
  },
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseFilesServiceGetFilesByFileIdKeyFn({ fileId }),
    queryFn: () => FilesService.getFilesByFileId({ fileId }),
  });
export const prefetchUseFilesServiceGetFilesByFileIdMetadata = (
  queryClient: QueryClient,
  {
    fileId,
  }: {
    fileId: string;
  },
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseFilesServiceGetFilesByFileIdMetadataKeyFn({ fileId }),
    queryFn: () => FilesService.getFilesByFileIdMetadata({ fileId }),
  });
