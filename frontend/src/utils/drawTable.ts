import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getTableStyles } from "./tableStyles";
import type {
  AdminSubmissionDetail,
  RecommendationWithStatus,
} from "@/openapi-rq/requests/types.gen";
import type { UserOptions } from "jspdf-autotable";

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

interface TableData {
  question: string;
  category: string;
  answer: string;
  percentage: string;
  textAnswer: string;
  recommendations: string;
}

const groupDataByCategory = (
  submissions: AdminSubmissionDetail[],
  recommendations: RecommendationWithStatus[],
): { [key: string]: TableData[] } => {
  const groupedData: { [key: string]: TableData[] } = {};
  const addedQuestions: { [key: string]: Set<string> } = {};

  submissions.forEach((submission) => {
    if (submission.content?.responses) {
      submission.content.responses.forEach((response) => {
        const category = response.question_category || "Uncategorized";
        const questionText = response.question_text || "N/A";

        if (!groupedData[category]) {
          groupedData[category] = [];
          addedQuestions[category] = new Set();
        }

        if (
          questionText !== "N/A" &&
          !addedQuestions[category].has(questionText)
        ) {
          const categoryRecs = recommendations
            .filter((rec) => rec.category === category)
            .map((rec) => `- ${rec.recommendation}`)
            .join("\n");

          let answer = "N/A";
          let percentage = "0%";
          let textAnswer = "N/A";

          if (response.response) {
            try {
              const parsed = JSON.parse(response.response);
              answer = parsed.yesNo ? "Yes" : "No";
              percentage = `${parsed.percentage || 0}%`;
              textAnswer = parsed.text || "N/A";
            } catch (e) {
              textAnswer = response.response;
            }
          }

          groupedData[category].push({
            question: questionText,
            category: category,
            answer: answer,
            percentage: percentage,
            textAnswer: textAnswer,
            recommendations:
              categoryRecs || "No recommendations for this category.",
          });

          addedQuestions[category].add(questionText);
        }
      });
    }
  });

  return groupedData;
};

export const drawAssessmentsTable = (
  doc: jsPDF,
  submissions: AdminSubmissionDetail[],
  recommendations: RecommendationWithStatus[],
  startY: number,
) => {
  if (!submissions || submissions.length === 0) {
    return;
  }

  const groupedData = groupDataByCategory(submissions, recommendations);
  const styles = getTableStyles();
  let isFirstCategory = true;

  Object.keys(groupedData).forEach((category) => {
    const tableData = groupedData[category];
    const body = tableData.map((row) => [
      row.question,
      row.answer,
      row.percentage,
      row.textAnswer,
      row.recommendations,
    ]);

    let currentY;
    if (isFirstCategory) {
      currentY = startY;
      isFirstCategory = false;
    } else {
      currentY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || startY;
    }

    doc.setFontSize(14);
    doc.text(category, 14, currentY + 15); // Category title

    autoTable(doc, {
      startY: currentY + 20,
      tableWidth: "auto",
      head: [
        [
          "Question",
          "Answer (Y/N)",
          "Percentage",
          "Text Answer",
          "Recommendations",
        ],
      ],
      body: body,
      ...styles,
      didParseCell: (data) => {
        if (data.column.dataKey === 4) {
          // 'Recommendations' column
          if (data.cell.raw && typeof data.cell.raw === "string") {
            data.cell.text = data.cell.raw.split("\n");
          }
        }
      },
    });
  });
};
