// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryOptions, useSuspenseQuery } from "@tanstack/react-query";
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
export const useHealthServiceGetHealthSuspense = <
  TData = Common.HealthServiceGetHealthDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseHealthServiceGetHealthKeyFn(queryKey),
    queryFn: () => HealthService.getHealth() as TData,
    ...options,
  });
export const useQuestionsServiceGetQuestionsSuspense = <
  TData = Common.QuestionsServiceGetQuestionsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    category,
    language,
  }: {
    category?: string;
    language?: string;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseQuestionsServiceGetQuestionsKeyFn(
      { category, language },
      queryKey,
    ),
    queryFn: () =>
      QuestionsService.getQuestions({ category, language }) as TData,
    ...options,
  });
export const useQuestionsServiceGetQuestionsByQuestionIdSuspense = <
  TData = Common.QuestionsServiceGetQuestionsByQuestionIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    language,
    questionId,
    revisionId,
  }: {
    language?: string;
    questionId: string;
    revisionId?: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseQuestionsServiceGetQuestionsByQuestionIdKeyFn(
      { language, questionId, revisionId },
      queryKey,
    ),
    queryFn: () =>
      QuestionsService.getQuestionsByQuestionId({
        language,
        questionId,
        revisionId,
      }) as TData,
    ...options,
  });
export const useAssessmentsServiceGetAssessmentsSuspense = <
  TData = Common.AssessmentsServiceGetAssessmentsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    language,
  }: {
    language?: string;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseAssessmentsServiceGetAssessmentsKeyFn(
      { language },
      queryKey,
    ),
    queryFn: () => AssessmentsService.getAssessments({ language }) as TData,
    ...options,
  });
export const useAssessmentsServiceGetAssessmentsByAssessmentIdSuspense = <
  TData = Common.AssessmentsServiceGetAssessmentsByAssessmentIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    assessmentId,
  }: {
    assessmentId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseAssessmentsServiceGetAssessmentsByAssessmentIdKeyFn(
      { assessmentId },
      queryKey,
    ),
    queryFn: () =>
      AssessmentsService.getAssessmentsByAssessmentId({
        assessmentId,
      }) as TData,
    ...options,
  });
export const useResponsesServiceGetAssessmentsByAssessmentIdResponsesSuspense =
  <
    TData = Common.ResponsesServiceGetAssessmentsByAssessmentIdResponsesDefaultResponse,
    TError = unknown,
    TQueryKey extends Array<unknown> = unknown[],
  >(
    {
      assessmentId,
      latestOnly,
    }: {
      assessmentId: string;
      latestOnly?: boolean;
    },
    queryKey?: TQueryKey,
    options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
  ) =>
    useSuspenseQuery<TData, TError>({
      queryKey:
        Common.UseResponsesServiceGetAssessmentsByAssessmentIdResponsesKeyFn(
          { assessmentId, latestOnly },
          queryKey,
        ),
      queryFn: () =>
        ResponsesService.getAssessmentsByAssessmentIdResponses({
          assessmentId,
          latestOnly,
        }) as TData,
      ...options,
    });
export const useResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdSuspense =
  <
    TData = Common.ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdDefaultResponse,
    TError = unknown,
    TQueryKey extends Array<unknown> = unknown[],
  >(
    {
      assessmentId,
      responseId,
    }: {
      assessmentId: string;
      responseId: string;
    },
    queryKey?: TQueryKey,
    options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
  ) =>
    useSuspenseQuery<TData, TError>({
      queryKey:
        Common.UseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdKeyFn(
          { assessmentId, responseId },
          queryKey,
        ),
      queryFn: () =>
        ResponsesService.getAssessmentsByAssessmentIdResponsesByResponseId({
          assessmentId,
          responseId,
        }) as TData,
      ...options,
    });
export const useResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistorySuspense =
  <
    TData = Common.ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryDefaultResponse,
    TError = unknown,
    TQueryKey extends Array<unknown> = unknown[],
  >(
    {
      assessmentId,
      responseId,
    }: {
      assessmentId: string;
      responseId: string;
    },
    queryKey?: TQueryKey,
    options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
  ) =>
    useSuspenseQuery<TData, TError>({
      queryKey:
        Common.UseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryKeyFn(
          { assessmentId, responseId },
          queryKey,
        ),
      queryFn: () =>
        ResponsesService.getAssessmentsByAssessmentIdResponsesByResponseIdHistory(
          { assessmentId, responseId },
        ) as TData,
      ...options,
    });
export const useSubmissionsServiceGetSubmissionsSuspense = <
  TData = Common.SubmissionsServiceGetSubmissionsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
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
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseSubmissionsServiceGetSubmissionsKeyFn(
      { status },
      queryKey,
    ),
    queryFn: () => SubmissionsService.getSubmissions({ status }) as TData,
    ...options,
  });
export const useSubmissionsServiceGetSubmissionsBySubmissionIdSuspense = <
  TData = Common.SubmissionsServiceGetSubmissionsBySubmissionIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    submissionId,
  }: {
    submissionId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseSubmissionsServiceGetSubmissionsBySubmissionIdKeyFn(
      { submissionId },
      queryKey,
    ),
    queryFn: () =>
      SubmissionsService.getSubmissionsBySubmissionId({
        submissionId,
      }) as TData,
    ...options,
  });
export const useAdminServiceGetAdminSubmissionsSuspense = <
  TData = Common.AdminServiceGetAdminSubmissionsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
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
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseAdminServiceGetAdminSubmissionsKeyFn(
      { status },
      queryKey,
    ),
    queryFn: () => AdminService.getAdminSubmissions({ status }) as TData,
    ...options,
  });
export const useReportsServiceGetSubmissionsBySubmissionIdReportsSuspense = <
  TData = Common.ReportsServiceGetSubmissionsBySubmissionIdReportsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    reportType,
    submissionId,
  }: {
    reportType?: "sustainability" | "compliance" | "summary" | "detailed";
    submissionId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseReportsServiceGetSubmissionsBySubmissionIdReportsKeyFn(
      { reportType, submissionId },
      queryKey,
    ),
    queryFn: () =>
      ReportsService.getSubmissionsBySubmissionIdReports({
        reportType,
        submissionId,
      }) as TData,
    ...options,
  });
export const useReportsServiceGetReportsByReportIdSuspense = <
  TData = Common.ReportsServiceGetReportsByReportIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    reportId,
  }: {
    reportId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseReportsServiceGetReportsByReportIdKeyFn(
      { reportId },
      queryKey,
    ),
    queryFn: () => ReportsService.getReportsByReportId({ reportId }) as TData,
    ...options,
  });
export const useFilesServiceGetFilesByFileIdSuspense = <
  TData = Common.FilesServiceGetFilesByFileIdDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    fileId,
  }: {
    fileId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseFilesServiceGetFilesByFileIdKeyFn({ fileId }, queryKey),
    queryFn: () => FilesService.getFilesByFileId({ fileId }) as TData,
    ...options,
  });
export const useFilesServiceGetFilesByFileIdMetadataSuspense = <
  TData = Common.FilesServiceGetFilesByFileIdMetadataDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    fileId,
  }: {
    fileId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseFilesServiceGetFilesByFileIdMetadataKeyFn(
      { fileId },
      queryKey,
    ),
    queryFn: () => FilesService.getFilesByFileIdMetadata({ fileId }) as TData,
    ...options,
  });
