// generated with @7nohe/openapi-react-query-codegen@1.6.2

import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
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
import {
  CreateAssessmentRequest,
  CreateQuestionRequest,
  CreateResponseRequest,
  GenerateReportRequest,
  UpdateAssessmentRequest,
  UpdateQuestionRequest,
  UpdateResponseRequest,
  files_body,
  response_id_files_body,
} from "../requests/types.gen";
import * as Common from "./common";
export const useHealthServiceGetHealth = <
  TData = Common.HealthServiceGetHealthDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">,
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseHealthServiceGetHealthKeyFn(queryKey),
    queryFn: () => HealthService.getHealth() as TData,
    ...options,
  });
export const useQuestionsServiceGetQuestions = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseQuestionsServiceGetQuestionsKeyFn(
      { category, language },
      queryKey,
    ),
    queryFn: () =>
      QuestionsService.getQuestions({ category, language }) as TData,
    ...options,
  });
export const useQuestionsServiceGetQuestionsByQuestionId = <
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
  useQuery<TData, TError>({
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
export const useAssessmentsServiceGetAssessments = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseAssessmentsServiceGetAssessmentsKeyFn(
      { language },
      queryKey,
    ),
    queryFn: () => AssessmentsService.getAssessments({ language }) as TData,
    ...options,
  });
export const useAssessmentsServiceGetAssessmentsByAssessmentId = <
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
  useQuery<TData, TError>({
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
export const useResponsesServiceGetAssessmentsByAssessmentIdResponses = <
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
  useQuery<TData, TError>({
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
export const useResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseId =
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
    useQuery<TData, TError>({
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
export const useResponsesServiceGetAssessmentsByAssessmentIdResponsesByResponseIdHistory =
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
    useQuery<TData, TError>({
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
export const useSubmissionsServiceGetSubmissions = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseSubmissionsServiceGetSubmissionsKeyFn(
      { status },
      queryKey,
    ),
    queryFn: () => SubmissionsService.getSubmissions({ status }) as TData,
    ...options,
  });
export const useSubmissionsServiceGetSubmissionsBySubmissionId = <
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
  useQuery<TData, TError>({
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
export const useAdminServiceGetAdminSubmissions = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseAdminServiceGetAdminSubmissionsKeyFn(
      { status },
      queryKey,
    ),
    queryFn: () => AdminService.getAdminSubmissions({ status }) as TData,
    ...options,
  });
export const useReportsServiceGetSubmissionsBySubmissionIdReports = <
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
  useQuery<TData, TError>({
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
export const useReportsServiceGetReportsByReportId = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseReportsServiceGetReportsByReportIdKeyFn(
      { reportId },
      queryKey,
    ),
    queryFn: () => ReportsService.getReportsByReportId({ reportId }) as TData,
    ...options,
  });
export const useFilesServiceGetFilesByFileId = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseFilesServiceGetFilesByFileIdKeyFn({ fileId }, queryKey),
    queryFn: () => FilesService.getFilesByFileId({ fileId }) as TData,
    ...options,
  });
export const useFilesServiceGetFilesByFileIdMetadata = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseFilesServiceGetFilesByFileIdMetadataKeyFn(
      { fileId },
      queryKey,
    ),
    queryFn: () => FilesService.getFilesByFileIdMetadata({ fileId }) as TData,
    ...options,
  });
export const useQuestionsServicePostQuestions = <
  TData = Common.QuestionsServicePostQuestionsMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: CreateQuestionRequest;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: CreateQuestionRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      QuestionsService.postQuestions({
        requestBody,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useAssessmentsServicePostAssessments = <
  TData = Common.AssessmentsServicePostAssessmentsMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: CreateAssessmentRequest;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: CreateAssessmentRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      AssessmentsService.postAssessments({
        requestBody,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useAssessmentsServicePostAssessmentsByAssessmentIdSubmit = <
  TData = Common.AssessmentsServicePostAssessmentsByAssessmentIdSubmitMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        assessmentId: string;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      assessmentId: string;
    },
    TContext
  >({
    mutationFn: ({ assessmentId }) =>
      AssessmentsService.postAssessmentsByAssessmentIdSubmit({
        assessmentId,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useResponsesServicePostAssessmentsByAssessmentIdResponses = <
  TData = Common.ResponsesServicePostAssessmentsByAssessmentIdResponsesMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        assessmentId: string;
        requestBody: CreateResponseRequest;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      assessmentId: string;
      requestBody: CreateResponseRequest;
    },
    TContext
  >({
    mutationFn: ({ assessmentId, requestBody }) =>
      ResponsesService.postAssessmentsByAssessmentIdResponses({
        assessmentId,
        requestBody,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useReportsServicePostSubmissionsBySubmissionIdReports = <
  TData = Common.ReportsServicePostSubmissionsBySubmissionIdReportsMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: GenerateReportRequest;
        submissionId: string;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: GenerateReportRequest;
      submissionId: string;
    },
    TContext
  >({
    mutationFn: ({ requestBody, submissionId }) =>
      ReportsService.postSubmissionsBySubmissionIdReports({
        requestBody,
        submissionId,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useFilesServicePostFiles = <
  TData = Common.FilesServicePostFilesMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        formData: files_body;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      formData: files_body;
    },
    TContext
  >({
    mutationFn: ({ formData }) =>
      FilesService.postFiles({ formData }) as unknown as Promise<TData>,
    ...options,
  });
export const useFilesServicePostAssessmentsByAssessmentIdResponsesByResponseIdFiles =
  <
    TData = Common.FilesServicePostAssessmentsByAssessmentIdResponsesByResponseIdFilesMutationResult,
    TError = unknown,
    TContext = unknown,
  >(
    options?: Omit<
      UseMutationOptions<
        TData,
        TError,
        {
          assessmentId: string;
          requestBody: response_id_files_body;
          responseId: string;
        },
        TContext
      >,
      "mutationFn"
    >,
  ) =>
    useMutation<
      TData,
      TError,
      {
        assessmentId: string;
        requestBody: response_id_files_body;
        responseId: string;
      },
      TContext
    >({
      mutationFn: ({ assessmentId, requestBody, responseId }) =>
        FilesService.postAssessmentsByAssessmentIdResponsesByResponseIdFiles({
          assessmentId,
          requestBody,
          responseId,
        }) as unknown as Promise<TData>,
      ...options,
    });
export const useQuestionsServicePutQuestionsByQuestionId = <
  TData = Common.QuestionsServicePutQuestionsByQuestionIdMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        questionId: string;
        questionRevisionId?: string;
        requestBody: UpdateQuestionRequest;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      questionId: string;
      questionRevisionId?: string;
      requestBody: UpdateQuestionRequest;
    },
    TContext
  >({
    mutationFn: ({ questionId, questionRevisionId, requestBody }) =>
      QuestionsService.putQuestionsByQuestionId({
        questionId,
        questionRevisionId,
        requestBody,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useAssessmentsServicePutAssessmentsByAssessmentId = <
  TData = Common.AssessmentsServicePutAssessmentsByAssessmentIdMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        assessmentId: string;
        requestBody: UpdateAssessmentRequest;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      assessmentId: string;
      requestBody: UpdateAssessmentRequest;
    },
    TContext
  >({
    mutationFn: ({ assessmentId, requestBody }) =>
      AssessmentsService.putAssessmentsByAssessmentId({
        assessmentId,
        requestBody,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useResponsesServicePutAssessmentsByAssessmentIdResponsesByResponseId =
  <
    TData = Common.ResponsesServicePutAssessmentsByAssessmentIdResponsesByResponseIdMutationResult,
    TError = unknown,
    TContext = unknown,
  >(
    options?: Omit<
      UseMutationOptions<
        TData,
        TError,
        {
          assessmentId: string;
          requestBody: UpdateResponseRequest;
          responseId: string;
        },
        TContext
      >,
      "mutationFn"
    >,
  ) =>
    useMutation<
      TData,
      TError,
      {
        assessmentId: string;
        requestBody: UpdateResponseRequest;
        responseId: string;
      },
      TContext
    >({
      mutationFn: ({ assessmentId, requestBody, responseId }) =>
        ResponsesService.putAssessmentsByAssessmentIdResponsesByResponseId({
          assessmentId,
          requestBody,
          responseId,
        }) as unknown as Promise<TData>,
      ...options,
    });
export const useQuestionsServiceDeleteQuestionsByQuestionId = <
  TData = Common.QuestionsServiceDeleteQuestionsByQuestionIdMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        questionId: string;
        questionRevisionId?: string;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      questionId: string;
      questionRevisionId?: string;
    },
    TContext
  >({
    mutationFn: ({ questionId, questionRevisionId }) =>
      QuestionsService.deleteQuestionsByQuestionId({
        questionId,
        questionRevisionId,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useAssessmentsServiceDeleteAssessmentsByAssessmentId = <
  TData = Common.AssessmentsServiceDeleteAssessmentsByAssessmentIdMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        assessmentId: string;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      assessmentId: string;
    },
    TContext
  >({
    mutationFn: ({ assessmentId }) =>
      AssessmentsService.deleteAssessmentsByAssessmentId({
        assessmentId,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useResponsesServiceDeleteAssessmentsByAssessmentIdResponsesByResponseId =
  <
    TData = Common.ResponsesServiceDeleteAssessmentsByAssessmentIdResponsesByResponseIdMutationResult,
    TError = unknown,
    TContext = unknown,
  >(
    options?: Omit<
      UseMutationOptions<
        TData,
        TError,
        {
          assessmentId: string;
          responseId: string;
        },
        TContext
      >,
      "mutationFn"
    >,
  ) =>
    useMutation<
      TData,
      TError,
      {
        assessmentId: string;
        responseId: string;
      },
      TContext
    >({
      mutationFn: ({ assessmentId, responseId }) =>
        ResponsesService.deleteAssessmentsByAssessmentIdResponsesByResponseId({
          assessmentId,
          responseId,
        }) as unknown as Promise<TData>,
      ...options,
    });
export const useReportsServiceDeleteReportsByReportId = <
  TData = Common.ReportsServiceDeleteReportsByReportIdMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        reportId: string;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      reportId: string;
    },
    TContext
  >({
    mutationFn: ({ reportId }) =>
      ReportsService.deleteReportsByReportId({
        reportId,
      }) as unknown as Promise<TData>,
    ...options,
  });
export const useFilesServiceDeleteFilesByFileId = <
  TData = Common.FilesServiceDeleteFilesByFileIdMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        fileId: string;
      },
      TContext
    >,
    "mutationFn"
  >,
) =>
  useMutation<
    TData,
    TError,
    {
      fileId: string;
    },
    TContext
  >({
    mutationFn: ({ fileId }) =>
      FilesService.deleteFilesByFileId({ fileId }) as unknown as Promise<TData>,
    ...options,
  });
export const useFilesServiceDeleteAssessmentsByAssessmentIdResponsesByResponseIdFilesByFileId =
  <
    TData = Common.FilesServiceDeleteAssessmentsByAssessmentIdResponsesByResponseIdFilesByFileIdMutationResult,
    TError = unknown,
    TContext = unknown,
  >(
    options?: Omit<
      UseMutationOptions<
        TData,
        TError,
        {
          assessmentId: string;
          fileId: string;
          responseId: string;
        },
        TContext
      >,
      "mutationFn"
    >,
  ) =>
    useMutation<
      TData,
      TError,
      {
        assessmentId: string;
        fileId: string;
        responseId: string;
      },
      TContext
    >({
      mutationFn: ({ assessmentId, fileId, responseId }) =>
        FilesService.deleteAssessmentsByAssessmentIdResponsesByResponseIdFilesByFileId(
          { assessmentId, fileId, responseId },
        ) as unknown as Promise<TData>,
      ...options,
    });
