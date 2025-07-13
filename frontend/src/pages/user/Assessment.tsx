import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  useAssessmentsServicePostAssessments,
  useAssessmentsServiceGetAssessmentsByAssessmentId,
  useResponsesServicePostAssessmentsByAssessmentIdResponses,
  useResponsesServicePutAssessmentsByAssessmentIdResponsesByResponseId,
  useFilesServicePostAssessmentsByAssessmentIdResponsesByResponseIdFiles,
  useAssessmentsServicePostAssessmentsByAssessmentIdSubmit,
  useQuestionsServiceGetQuestions,
} from "../../openapi-rq/queries/queries";
import {
  AssessmentDetailResponse,
  CreateResponseRequest,
  UpdateResponseRequest,
  response_id_files_body,
  Question,
  QuestionRevision,
} from "../../openapi-rq/requests/types.gen";
import { toast } from "sonner";
import {
  Info,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
} from "lucide-react";

type FileData = { name: string; url: string };

export const Assessment: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [currentCategoryIndex, setCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        yesNo?: boolean;
        percentage?: number;
        text?: string;
        files?: FileData[];
      }
    >
  >({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showPercentInfo, setShowPercentInfo] = useState(false);
  const [hasCreatedAssessment, setHasCreatedAssessment] = useState(false);

  const toolName = "Sustainability Assessment";

  const createAssessmentMutation = useAssessmentsServicePostAssessments();
  const submitAssessmentMutation =
    useAssessmentsServicePostAssessmentsByAssessmentIdSubmit();
  const createResponseMutation =
    useResponsesServicePostAssessmentsByAssessmentIdResponses();
  const updateResponseMutation =
    useResponsesServicePutAssessmentsByAssessmentIdResponsesByResponseId();

  useEffect(() => {
    if (!assessmentId && !hasCreatedAssessment) {
      setHasCreatedAssessment(true);
      createAssessmentMutation.mutate(undefined, {
        onSuccess: (data) => {
          const newId = data.assessment.assessment_id;
          navigate(`/user/assessment/${newId}`);
        },
        onError: () => toast("Failed to create assessment"),
      });
    }
  }, [assessmentId, createAssessmentMutation, navigate, hasCreatedAssessment]);

  const { data: assessmentDetail, isLoading: assessmentLoading } =
    useAssessmentsServiceGetAssessmentsByAssessmentId(
      assessmentId ? { assessmentId } : { assessmentId: "" },
      undefined,
      { enabled: !!assessmentId },
    );

  const { data: questionsData, isLoading: questionsLoading } =
    useQuestionsServiceGetQuestions();

  const groupedQuestions = React.useMemo(() => {
    if (assessmentDetail?.questions) {
      const groups: Record<string, QuestionRevision[]> = {};
      assessmentDetail.questions.forEach((questionRevision) => {
        const category = questionRevision.question_id;
        if (!groups[category]) groups[category] = [];
        groups[category].push(questionRevision);
      });
      return groups;
    }
    
    if (!questionsData?.questions) return {};
    
    const groups: Record<
      string,
      { question: Question; revision: QuestionRevision }[]
    > = {};
    questionsData.questions.forEach(
      (qwr: { question: Question; revisions: QuestionRevision[] }) => {
        if (!qwr.question || !qwr.revisions || qwr.revisions.length === 0) {
          console.warn('Invalid question data:', qwr);
          return;
        }
        
        const category = qwr.question.category;
        const latestRevision = qwr.revisions[qwr.revisions.length - 1];
        
        if (!groups[category]) groups[category] = [];
        groups[category].push({
          question: qwr.question,
          revision: latestRevision,
        });
      },
    );
    return groups;
  }, [questionsData, assessmentDetail]);

  const categories = Object.keys(groupedQuestions);
  
  const getCurrentCategoryQuestions = () => {
    const categoryQuestions = groupedQuestions[categories[currentCategoryIndex]] || [];
    
    if (assessmentDetail?.questions && categoryQuestions.length > 0 && 'question_id' in categoryQuestions[0]) {
      return (categoryQuestions as QuestionRevision[]).map((questionRevision: QuestionRevision) => ({
        question: { question_id: questionRevision.question_id, category: questionRevision.question_id, created_at: questionRevision.created_at },
        revision: questionRevision
      }));
    }
    
    return categoryQuestions as { question: Question; revision: QuestionRevision }[];
  };

  const findResponseForQuestion = (question_revision_id: string) => {
    return assessmentDetail?.responses?.find(
      (r) => r.question_revision_id === question_revision_id,
    );
  };

  const handleAnswerChange = (
    question_revision_id: string,
    value: {
      yesNo?: boolean;
      percentage?: number;
      text?: string;
      files?: FileData[];
    },
  ) => {
    setAnswers((prev) => ({ ...prev, [question_revision_id]: value }));
    const existingResponse = findResponseForQuestion(question_revision_id);
    if (existingResponse) {
      updateResponseMutation.mutate({
        assessmentId: assessmentId!,
        responseId: existingResponse.response_id,
        requestBody: { response: JSON.stringify(value) },
      });
    } else {
      createResponseMutation.mutate({
        assessmentId: assessmentId!,
        requestBody: {
          question_revision_id,
          response: JSON.stringify(value),
        },
      });
    }
  };

  const handleCommentChange = (questionId: string, comment: string) => {
    setComments((prev) => ({ ...prev, [questionId]: comment }));
  };

  const handleFileUpload = (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = {
        name: file.name,
        url: e.target?.result as string,
      };
      setAnswers((prev) => {
        const prevFiles = prev[questionId]?.files || [];
        return {
          ...prev,
          [questionId]: {
            ...prev[questionId],
            files: [...prevFiles, fileData],
          },
        };
      });
    };
    reader.readAsDataURL(file);
  };

  const submitAssessment = async () => {
    submitAssessmentMutation.mutate({
      assessmentId: assessmentId!,
    });
    toast(`Your ${toolName.toLowerCase()} has been submitted successfully`);
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  const nextCategory = async () => {
    if (currentCategoryIndex < categories.length - 1) {
      setCategoryIndex(currentCategoryIndex + 1);
    }
  };

  const previousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCategoryIndex(currentCategoryIndex - 1);
    }
  };

  const renderQuestionInput = (question: QuestionRevision) => {
    const questionRevisionId = question.latest_revision;
    const yesNoValue = answers[questionRevisionId]?.yesNo;
    const percentageValue = answers[questionRevisionId]?.percentage;
    const textValue = answers[questionRevisionId]?.text || "";
    const comment = comments[questionRevisionId] || "";
    const files: FileData[] = answers[questionRevisionId]?.files || [];
    
    return (
      <div className="space-y-4">
        <div>
          <Label>Yes/No</Label>
          <div className="flex space-x-4 mt-1">
            <Button
              type="button"
              variant={yesNoValue === true ? "default" : "outline"}
              className={
                yesNoValue === true ? "bg-dgrv-green hover:bg-green-700" : ""
              }
              onClick={() =>
                handleAnswerChange(questionRevisionId, {
                  ...answers[questionRevisionId],
                  yesNo: true,
                })
              }
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={yesNoValue === false ? "default" : "outline"}
              className={
                yesNoValue === false ? "bg-red-500 hover:bg-red-600" : ""
              }
              onClick={() =>
                handleAnswerChange(questionRevisionId, {
                  ...answers[questionRevisionId],
                  yesNo: false,
                })
              }
            >
              No
            </Button>
          </div>
        </div>
        
        <div>
          <div className="flex items-center space-x-2 relative">
            <Label>Percentage</Label>
            <button
              type="button"
              className="cursor-pointer text-dgrv-blue focus:outline-none"
              onClick={() => setShowPercentInfo((prev) => !prev)}
              aria-label="Show percentage explanation"
            >
              <Info className="w-4 h-4" />
            </button>
            {showPercentInfo && (
              <div className="absolute left-8 top-6 z-10 bg-white border rounded shadow-md p-3 w-56 text-xs text-gray-700">
                <div><b>0%:</b> Not started</div>
                <div><b>25%:</b> Some progress</div>
                <div><b>50%:</b> Halfway</div>
                <div><b>75%:</b> Almost done</div>
                <div><b>100%:</b> Fully achieved</div>
              </div>
            )}
          </div>
          <div className="flex space-x-2 mt-1">
            {[0, 25, 50, 75, 100].map((val) => (
              <Button
                key={val}
                type="button"
                variant={percentageValue === val ? "default" : "outline"}
                className={
                  percentageValue === val
                    ? "bg-dgrv-blue text-white border-dgrv-blue"
                    : "bg-white text-dgrv-blue border-dgrv-blue hover:bg-dgrv-blue/10"
                }
                onClick={() =>
                  handleAnswerChange(questionRevisionId, {
                    ...answers[questionRevisionId],
                    percentage: val,
                  })
                }
              >
                {val}%
              </Button>
            ))}
          </div>
        </div>
        
        <div>
          <Label htmlFor={`input-text-${questionRevisionId}`}>
            Your Response
          </Label>
          <Textarea
            id={`input-text-${questionRevisionId}`}
            value={textValue}
            onChange={(e) =>
              handleAnswerChange(questionRevisionId, {
                ...answers[questionRevisionId],
                text: e.target.value,
              })
            }
            placeholder="Enter your response..."
            className="mt-1"
            rows={4}
          />
          <div className="mt-2 flex items-center space-x-2">
            <label className="flex items-center cursor-pointer text-dgrv-blue hover:underline">
              <Paperclip className="w-4 h-4 mr-1" />
              <span>Add file</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) =>
                  handleFileUpload(
                    questionRevisionId,
                    e.target.files,
                  )
                }
              />
            </label>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file: FileData, idx: number) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                    download={file.name}
                  >
                    {file.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (assessmentLoading || !assessmentDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-dgrv-blue mb-4">
                  Assessment Not Available
                </h2>
                <p className="text-gray-600 mb-6">
                  The {toolName.toLowerCase()} is not yet configured. Please
                  contact your administrator.
                </p>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-dgrv-blue hover:bg-blue-700"
                >
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const currentCategory = categories[currentCategoryIndex];
  const currentQuestions = getCurrentCategoryQuestions();
  const progress = ((currentCategoryIndex + 1) / categories.length) * 100;
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-dgrv-blue mb-2">
              {toolName}
            </h1>
            <p className="text-lg text-gray-600">
              Category {currentCategoryIndex + 1} of {categories.length}:{" "}
              {currentCategory}
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress
                </span>
                <span className="text-sm font-medium text-dgrv-blue">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-dgrv-blue">
                {currentCategory}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {currentQuestions.map((question, index) => (
                <div
                  key={question.revision.latest_revision}
                  className="border-b pb-6 last:border-b-0"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {index + 1}. {typeof question.revision.text === 'string' 
                        ? question.revision.text 
                        : JSON.stringify(question.revision.text)}
                    </h3>
                  </div>
                  {renderQuestionInput(question.revision)}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={previousCategory}
              disabled={currentCategoryIndex === 0}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => {}}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </Button>

              {isLastCategory ? (
                <Button
                  onClick={submitAssessment}
                  className="bg-dgrv-green hover:bg-green-700 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Assessment</span>
                </Button>
              ) : (
                <Button
                  onClick={nextCategory}
                  className="bg-dgrv-blue hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
