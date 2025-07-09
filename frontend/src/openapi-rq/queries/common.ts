// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryResult } from "@tanstack/react-query";
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
export type HealthServiceGetHealthDefaultResponse = Awaited<
  ReturnType<typeof HealthService.getHealth>
>;
export type HealthServiceGetHealthQueryResult<
  TData = HealthServiceGetHealthDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useHealthServiceGetHealthKey = "HealthServiceGetHealth";
export const UseHealthServiceGetHealthKeyFn = (queryKey?: Array<unknown>) => [
  useHealthServiceGetHealthKey,
  ...(queryKey ?? []),
];
export type QuestionsServiceGetQuestionsDefaultResponse = Awaited<
  ReturnType<typeof QuestionsService.getQuestions>
>;
export type QuestionsServiceGetQuestionsQueryResult<
  TData = QuestionsServiceGetQuestionsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useQuestionsServiceGetQuestionsKey =
  "QuestionsServiceGetQuestions";
export const UseQuestionsServiceGetQuestionsKeyFn = (
  {
    category,
    language,
  }: {
    category?: string;
    language?: string;
  } = {},
  queryKey?: Array<unknown>,
) => [
  useQuestionsServiceGetQuestionsKey,
  ...(queryKey ?? [{ category, language }]),
];
export type QuestionsServiceGetQuestionsByQuestionIdDefaultResponse = Awaited<
  ReturnType<typeof QuestionsService.getQuestionsByQuestionId>
>;
export type QuestionsServiceGetQuestionsByQuestionIdQueryResult<
  TData = QuestionsServiceGetQuestionsByQuestionIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useQuestionsServiceGetQuestionsByQuestionIdKey =
  "QuestionsServiceGetQuestionsByQuestionId";
export const UseQuestionsServiceGetQuestionsByQuestionIdKeyFn = (
  {
    language,
    questionId,
    revisionId,
  }: {
    language?: string;
    questionId: string;
    revisionId?: string;
  },
  queryKey?: Array<unknown>,
) => [
  useQuestionsServiceGetQuestionsByQuestionIdKey,
  ...(queryKey ?? [{ language, questionId, revisionId }]),
];
export type AssessmentsServiceGetAssessmentsDefaultResponse = Awaited<
  ReturnType<typeof AssessmentsService.getAssessments>
>;
export type AssessmentsServiceGetAssessmentsQueryResult<
  TData = AssessmentsServiceGetAssessmentsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useAssessmentsServiceGetAssessmentsKey =
  "AssessmentsServiceGetAssessments";
export const UseAssessmentsServiceGetAssessmentsKeyFn = (
  {
    language,
  }: {
    language?: string;
  } = {},
  queryKey?: Array<unknown>,
) => [useAssessmentsServiceGetAssessmentsKey, ...(queryKey ?? [{ language }])];
export type AssessmentsServiceGetAssessmentsByAssessmentIdDefaultResponse =
  Awaited<ReturnType<typeof AssessmentsService.getAssessmentsByAssessmentId>>;
export type AssessmentsServiceGetAssessmentsByAssessmentIdQueryResult<
  TData = AssessmentsServiceGetAssessmentsByAssessmentIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useAssessmentsServiceGetAssessmentsByAssessmentIdKey =
  "AssessmentsServiceGetAssessmentsByAssessmentId";
export const UseAssessmentsServiceGetAssessmentsByAssessmentIdKeyFn = (
  {
    assessmentId,
  }: {
    assessmentId: string;
  },
  queryKey?: Array<unknown>,
) => [
  useAssessmentsServiceGetAssessmentsByAssessmentIdKey,
  ...(queryKey ?? [{ assessmentId }]),
];
export type ResponsesServiceGetAssessmentsByAssessmentIdResponsesDefaultResponse =
  Awaited<
    ReturnType<typeof ResponsesService.getAssessmentsByAssessmentIdResponses>
  >;
export type ResponsesServiceGetAssessmentsByAssessmentIdResponsesQueryResult<
  TData = ResponsesServiceGetAssessmentsByAssessmentIdResponsesDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useResponsesServiceGetAssessmentsByAssessmentIdResponsesKey =
  "ResponsesServiceGetAssessmentsByAssessmentIdResponses";
export const UseResponsesServiceGetAssessmentsByAssessmentIdResponsesKeyFn = (
  {
    assessmentId,
    latestOnly,
  }: {
    assessmentId: string;
    latestOnly?: boolean;
  },
  queryKey?: Array<unknown>,
) => [
  useResponsesServiceGetAssessmentsByAssessmentIdResponsesKey,
  ...(queryKey ?? [{ assessmentId, latestOnly }]),
];
export type ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdDefaultResponse =
  Awaited<
    ReturnType<
      typeof ResponsesService.getAssessmentsByAssessmentIdResponsesByResponseId
    >
  >;
export type ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdQueryResult<
  TData = ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdKey =
  "ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseId";
export const UseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdKeyFn =
  (
    {
      assessmentId,
      responseId,
    }: {
      assessmentId: string;
      responseId: string;
    },
    queryKey?: Array<unknown>,
  ) => [
    useResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdKey,
    ...(queryKey ?? [{ assessmentId, responseId }]),
  ];
export type ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryDefaultResponse =
  Awaited<
    ReturnType<
      typeof ResponsesService.getAssessmentsByAssessmentIdResponsesByResponseIdHistory
    >
  >;
export type ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryQueryResult<
  TData = ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryKey =
  "ResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistory";
export const UseResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryKeyFn =
  (
    {
      assessmentId,
      responseId,
    }: {
      assessmentId: string;
      responseId: string;
    },
    queryKey?: Array<unknown>,
  ) => [
    useResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistoryKey,
    ...(queryKey ?? [{ assessmentId, responseId }]),
  ];
export type SubmissionsServiceGetSubmissionsDefaultResponse = Awaited<
  ReturnType<typeof SubmissionsService.getSubmissions>
>;
export type SubmissionsServiceGetSubmissionsQueryResult<
  TData = SubmissionsServiceGetSubmissionsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useSubmissionsServiceGetSubmissionsKey =
  "SubmissionsServiceGetSubmissions";
export const UseSubmissionsServiceGetSubmissionsKeyFn = (
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
  queryKey?: Array<unknown>,
) => [useSubmissionsServiceGetSubmissionsKey, ...(queryKey ?? [{ status }])];
export type SubmissionsServiceGetSubmissionsBySubmissionIdDefaultResponse =
  Awaited<ReturnType<typeof SubmissionsService.getSubmissionsBySubmissionId>>;
export type SubmissionsServiceGetSubmissionsBySubmissionIdQueryResult<
  TData = SubmissionsServiceGetSubmissionsBySubmissionIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useSubmissionsServiceGetSubmissionsBySubmissionIdKey =
  "SubmissionsServiceGetSubmissionsBySubmissionId";
export const UseSubmissionsServiceGetSubmissionsBySubmissionIdKeyFn = (
  {
    submissionId,
  }: {
    submissionId: string;
  },
  queryKey?: Array<unknown>,
) => [
  useSubmissionsServiceGetSubmissionsBySubmissionIdKey,
  ...(queryKey ?? [{ submissionId }]),
];
export type AdminServiceGetAdminSubmissionsDefaultResponse = Awaited<
  ReturnType<typeof AdminService.getAdminSubmissions>
>;
export type AdminServiceGetAdminSubmissionsQueryResult<
  TData = AdminServiceGetAdminSubmissionsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useAdminServiceGetAdminSubmissionsKey =
  "AdminServiceGetAdminSubmissions";
export const UseAdminServiceGetAdminSubmissionsKeyFn = (
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
  queryKey?: Array<unknown>,
) => [useAdminServiceGetAdminSubmissionsKey, ...(queryKey ?? [{ status }])];
export type ReportsServiceGetSubmissionsBySubmissionIdReportsDefaultResponse =
  Awaited<
    ReturnType<typeof ReportsService.getSubmissionsBySubmissionIdReports>
  >;
export type ReportsServiceGetSubmissionsBySubmissionIdReportsQueryResult<
  TData = ReportsServiceGetSubmissionsBySubmissionIdReportsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useReportsServiceGetSubmissionsBySubmissionIdReportsKey =
  "ReportsServiceGetSubmissionsBySubmissionIdReports";
export const UseReportsServiceGetSubmissionsBySubmissionIdReportsKeyFn = (
  {
    reportType,
    submissionId,
  }: {
    reportType?: "sustainability" | "compliance" | "summary" | "detailed";
    submissionId: string;
  },
  queryKey?: Array<unknown>,
) => [
  useReportsServiceGetSubmissionsBySubmissionIdReportsKey,
  ...(queryKey ?? [{ reportType, submissionId }]),
];
export type ReportsServiceGetReportsByReportIdDefaultResponse = Awaited<
  ReturnType<typeof ReportsService.getReportsByReportId>
>;
export type ReportsServiceGetReportsByReportIdQueryResult<
  TData = ReportsServiceGetReportsByReportIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useReportsServiceGetReportsByReportIdKey =
  "ReportsServiceGetReportsByReportId";
export const UseReportsServiceGetReportsByReportIdKeyFn = (
  {
    reportId,
  }: {
    reportId: string;
  },
  queryKey?: Array<unknown>,
) => [
  useReportsServiceGetReportsByReportIdKey,
  ...(queryKey ?? [{ reportId }]),
];
export type FilesServiceGetFilesByFileIdDefaultResponse = Awaited<
  ReturnType<typeof FilesService.getFilesByFileId>
>;
export type FilesServiceGetFilesByFileIdQueryResult<
  TData = FilesServiceGetFilesByFileIdDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useFilesServiceGetFilesByFileIdKey =
  "FilesServiceGetFilesByFileId";
export const UseFilesServiceGetFilesByFileIdKeyFn = (
  {
    fileId,
  }: {
    fileId: string;
  },
  queryKey?: Array<unknown>,
) => [useFilesServiceGetFilesByFileIdKey, ...(queryKey ?? [{ fileId }])];
export type FilesServiceGetFilesByFileIdMetadataDefaultResponse = Awaited<
  ReturnType<typeof FilesService.getFilesByFileIdMetadata>
>;
export type FilesServiceGetFilesByFileIdMetadataQueryResult<
  TData = FilesServiceGetFilesByFileIdMetadataDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useFilesServiceGetFilesByFileIdMetadataKey =
  "FilesServiceGetFilesByFileIdMetadata";
export const UseFilesServiceGetFilesByFileIdMetadataKeyFn = (
  {
    fileId,
  }: {
    fileId: string;
  },
  queryKey?: Array<unknown>,
) => [
  useFilesServiceGetFilesByFileIdMetadataKey,
  ...(queryKey ?? [{ fileId }]),
];
export type QuestionsServicePostQuestionsMutationResult = Awaited<
  ReturnType<typeof QuestionsService.postQuestions>
>;
export type AssessmentsServicePostAssessmentsMutationResult = Awaited<
  ReturnType<typeof AssessmentsService.postAssessments>
>;
export type AssessmentsServicePostAssessmentsByAssessmentIdSubmitMutationResult =
  Awaited<
    ReturnType<typeof AssessmentsService.postAssessmentsByAssessmentIdSubmit>
  >;
export type ResponsesServicePostAssessmentsByAssessmentIdResponsesMutationResult =
  Awaited<
    ReturnType<typeof ResponsesService.postAssessmentsByAssessmentIdResponses>
  >;
export type ReportsServicePostSubmissionsBySubmissionIdReportsMutationResult =
  Awaited<
    ReturnType<typeof ReportsService.postSubmissionsBySubmissionIdReports>
  >;
export type FilesServicePostFilesMutationResult = Awaited<
  ReturnType<typeof FilesService.postFiles>
>;
export type FilesServicePostAssessmentsByAssessmentIdResponsesByResponseIdFilesMutationResult =
  Awaited<
    ReturnType<
      typeof FilesService.postAssessmentsByAssessmentIdResponsesByResponseIdFiles
    >
  >;
export type QuestionsServicePutQuestionsByQuestionIdMutationResult = Awaited<
  ReturnType<typeof QuestionsService.putQuestionsByQuestionId>
>;
export type AssessmentsServicePutAssessmentsByAssessmentIdMutationResult =
  Awaited<ReturnType<typeof AssessmentsService.putAssessmentsByAssessmentId>>;
export type ResponsesServicePutAssessmentsByAssessmentIdResponsesByResponseIdMutationResult =
  Awaited<
    ReturnType<
      typeof ResponsesService.putAssessmentsByAssessmentIdResponsesByResponseId
    >
  >;
export type QuestionsServiceDeleteQuestionsByQuestionIdMutationResult = Awaited<
  ReturnType<typeof QuestionsService.deleteQuestionsByQuestionId>
>;
export type AssessmentsServiceDeleteAssessmentsByAssessmentIdMutationResult =
  Awaited<
    ReturnType<typeof AssessmentsService.deleteAssessmentsByAssessmentId>
  >;
export type ResponsesServiceDeleteAssessmentsByAssessmentIdResponsesByResponseIdMutationResult =
  Awaited<
    ReturnType<
      typeof ResponsesService.deleteAssessmentsByAssessmentIdResponsesByResponseId
    >
  >;
export type ReportsServiceDeleteReportsByReportIdMutationResult = Awaited<
  ReturnType<typeof ReportsService.deleteReportsByReportId>
>;
export type FilesServiceDeleteFilesByFileIdMutationResult = Awaited<
  ReturnType<typeof FilesService.deleteFilesByFileId>
>;
export type FilesServiceDeleteAssessmentsByAssessmentIdResponsesByResponseIdFilesByFileIdMutationResult =
  Awaited<
    ReturnType<
      typeof FilesService.deleteAssessmentsByAssessmentIdResponsesByResponseIdFilesByFileId
    >
  >;
