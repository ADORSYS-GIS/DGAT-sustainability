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
export const ensureUseHealthServiceGetHealthData = (queryClient: QueryClient) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseHealthServiceGetHealthKeyFn(),
    queryFn: () => HealthService.getHealth(),
  });
export const ensureUseQuestionsServiceGetQuestionsData = (
  queryClient: QueryClient,
  {
    category,
    language,
  }: {
    category?: string;
    language?: string;
  } = {},
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseQuestionsServiceGetQuestionsKeyFn({
      category,
      language,
    }),
    queryFn: () => QuestionsService.getQuestions({ category, language }),
  });
export const ensureUseQuestionsServiceGetQuestionsByQuestionIdData = (
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
  queryClient.ensureQueryData({
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
export const ensureUseAssessmentsServiceGetAssessmentsData = (
  queryClient: QueryClient,
  {
    language,
  }: {
    language?: string;
  } = {},
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseAssessmentsServiceGetAssessmentsKeyFn({ language }),
    queryFn: () => AssessmentsService.getAssessments({ language }),
  });
export const ensureUseAssessmentsServiceGetAssessmentsByAssessmentIdData = (
  queryClient: QueryClient,
  {
    assessmentId,
  }: {
    assessmentId: string;
  },
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseAssessmentsServiceGetAssessmentsByAssessmentIdKeyFn({
      assessmentId,
    }),
    queryFn: () =>
      AssessmentsService.getAssessmentsByAssessmentId({ assessmentId }),
  });
export const ensureUseResponsesServiceGetAssessmentsByAssessmentIdResponsesData =
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
    queryClient.ensureQueryData({
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
export const ensureUseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdData =
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
    queryClient.ensureQueryData({
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
export const ensureUseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryData =
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
    queryClient.ensureQueryData({
      queryKey:
        Common.UseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryKeyFn(
          { assessmentId, responseId },
        ),
      queryFn: () =>
        ResponsesService.getAssessmentsByAssessmentIdResponsesByResponseIdHistory(
          { assessmentId, responseId },
        ),
    });
export const ensureUseSubmissionsServiceGetSubmissionsData = (
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
  queryClient.ensureQueryData({
    queryKey: Common.UseSubmissionsServiceGetSubmissionsKeyFn({ status }),
    queryFn: () => SubmissionsService.getSubmissions({ status }),
  });
export const ensureUseSubmissionsServiceGetSubmissionsBySubmissionIdData = (
  queryClient: QueryClient,
  {
    submissionId,
  }: {
    submissionId: string;
  },
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseSubmissionsServiceGetSubmissionsBySubmissionIdKeyFn({
      submissionId,
    }),
    queryFn: () =>
      SubmissionsService.getSubmissionsBySubmissionId({ submissionId }),
  });
export const ensureUseAdminServiceGetAdminSubmissionsData = (
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
  queryClient.ensureQueryData({
    queryKey: Common.UseAdminServiceGetAdminSubmissionsKeyFn({ status }),
    queryFn: () => AdminService.getAdminSubmissions({ status }),
  });
export const ensureUseReportsServiceGetSubmissionsBySubmissionIdReportsData = (
  queryClient: QueryClient,
  {
    reportType,
    submissionId,
  }: {
    reportType?: "sustainability" | "compliance" | "summary" | "detailed";
    submissionId: string;
  },
) =>
  queryClient.ensureQueryData({
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
export const ensureUseReportsServiceGetReportsByReportIdData = (
  queryClient: QueryClient,
  {
    reportId,
  }: {
    reportId: string;
  },
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseReportsServiceGetReportsByReportIdKeyFn({ reportId }),
    queryFn: () => ReportsService.getReportsByReportId({ reportId }),
  });
export const ensureUseFilesServiceGetFilesByFileIdData = (
  queryClient: QueryClient,
  {
    fileId,
  }: {
    fileId: string;
  },
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseFilesServiceGetFilesByFileIdKeyFn({ fileId }),
    queryFn: () => FilesService.getFilesByFileId({ fileId }),
  });
export const ensureUseFilesServiceGetFilesByFileIdMetadataData = (
  queryClient: QueryClient,
  {
    fileId,
  }: {
    fileId: string;
  },
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseFilesServiceGetFilesByFileIdMetadataKeyFn({ fileId }),
    queryFn: () => FilesService.getFilesByFileIdMetadata({ fileId }),
  });
