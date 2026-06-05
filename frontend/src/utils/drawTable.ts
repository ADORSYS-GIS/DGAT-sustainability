import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getTableStyles } from "./tableStyles";
import type { AdminSubmissionDetail, RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";
import type { UserOptions } from 'jspdf-autotable';
import type { TFunction } from "i18next";
import { normalizeCategoryName } from "./categoryUtils";
import {
  formatAssessmentAnswerFields,
  parseAssessmentAnswer,
} from "./parseAssessmentAnswer";

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
  recommendations?: string;
}

/**
 * Extracts a sort key from a question text like "Resource Use 1: Are you..."
 * Returns [prefix, number] so questions sort by prefix first, then by their number.
 */
function questionSortKey(question: string): [string, number] {
  const match = question.match(/^(.*?)\s+(\d+)\s*:/);
  if (match) {
    return [match[1].trim().toLowerCase(), parseInt(match[2], 10)];
  }
  return [question.toLowerCase(), 0];
}

const groupDataByCategory = (
  submissions: AdminSubmissionDetail[],
  t?: TFunction
): { [key: string]: TableData[] } => {
  const groupedData: { [key: string]: TableData[] } = {};
  const addedQuestions: { [key: string]: Set<string> } = {};

  submissions.forEach((submission) => {
    const submissionScope = submission.submission_id || "default";
    if (submission.content?.responses) {
      submission.content.responses.forEach((response) => {
        const category = normalizeCategoryName(response.question_category);
        const questionText = response.question_text || "N/A";

        if (!groupedData[category]) {
          groupedData[category] = [];
          addedQuestions[category] = new Set();
        }

        const questionKey = `${submissionScope}::${questionText}`;
        if (questionText !== "N/A" && !addedQuestions[category].has(questionKey)) {
          const parsed = parseAssessmentAnswer(response.response);
          const { answer, percentage, textAnswer } = formatAssessmentAnswerFields(parsed, t);

          groupedData[category].push({
            question: questionText,
            category: category,
            answer: answer,
            percentage: percentage,
            textAnswer: textAnswer,
          });

          addedQuestions[category].add(questionKey);
        }
      });
    }
  });

  // Sort questions within each category by their numeric prefix (e.g. "Resource Use 1", "Resource Use 2")
  Object.keys(groupedData).forEach((category) => {
    groupedData[category].sort((a, b) => {
      const [prefixA, numA] = questionSortKey(a.question);
      const [prefixB, numB] = questionSortKey(b.question);
      if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
      return numA - numB;
    });
  });

  return groupedData;
};

export const drawAssessmentsTable = (
  doc: jsPDF,
  submissions: AdminSubmissionDetail[],
  recommendations: RecommendationWithStatus[],
  organizationName?: string,
  assessmentName?: string,
  t?: TFunction,
  reportId?: string
) => {
  // Default translation function if not provided
  const translate = t || ((key: string, options?: Record<string, unknown>) => key);
  const addHeaderWithTranslate = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(translate('export.sustainabilityReport'), 14, 10);
    doc.text(translate('export.page', { count: pageCount }), doc.internal.pageSize.width - 14 - doc.getTextWidth(translate('export.page', { count: pageCount })), 10);
    doc.setDrawColor(30, 58, 138);
    doc.line(14, 12, doc.internal.pageSize.width - 14, 12);
  };
  if (!submissions || submissions.length === 0) {
    return;
  }

  const scopedRecommendations = reportId
    ? recommendations.filter((rec) => rec.report_id === reportId)
    : recommendations;

  const groupedData = groupDataByCategory(submissions, t);
  const styles = getTableStyles();
  const sectionTitle = translate('export.detailedAssessmentResults');
  const fullTitle = assessmentName ? `${sectionTitle} - ${assessmentName}` : sectionTitle;

  // Add the section's first page and introduction
  doc.addPage();
  const sectionStartPage = doc.getNumberOfPages();
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // dgrvBlue
  doc.setFont("helvetica", "bold");
  doc.text(sectionTitle, 14, 28);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  const tableIntro = translate('export.tableIntro');
  const introLines = doc.splitTextToSize(tableIntro, doc.internal.pageSize.getWidth() - 28);
  doc.text(introLines, 14, 36);

  const introTextHeight = doc.getTextDimensions(introLines).h;
  const initialTableY = 36 + introTextHeight + 10;

  let isFirstCategory = true;

  Object.keys(groupedData).forEach(category => {
    const tableData = groupedData[category];
    const categoryRecs = scopedRecommendations
      .filter((rec) => normalizeCategoryName(rec.category) === category)
      .map((rec) => `- ${rec.recommendation}`)
      .join("\n");

    const body = tableData.map((row, index) => {
      return [
        row.question,
        row.answer,
        row.percentage,
        row.textAnswer,
        index === 0 ? (categoryRecs || "") : "", // Keep data in first row of category but as regular cell
      ];
    });

    let currentY;
    if (isFirstCategory) {
      currentY = initialTableY;
      isFirstCategory = false;
    } else {
      currentY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || initialTableY;

      // If the next category title wouldn't fit on this page, start a new page
      if (currentY + 40 > doc.internal.pageSize.height) {
        doc.addPage();
        addHeaderWithTranslate(doc);
        currentY = 38;
      }
    }

    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // dgrvBlue
    doc.setFont("helvetica", "bold");
    doc.text(category, 14, currentY + 10); // Category title

    autoTable(doc, {
      startY: currentY + 16,
      tableWidth: "auto",
      head: [
        [
          translate('export.question'),
          translate('export.yesNo'),
          translate('export.percentage'),
          translate('export.textAnswer'),
          translate('export.recommendations'),
        ],
      ],
      body: body as UserOptions['body'],
      ...styles,
      didDrawPage: (data) => {
        addHeaderWithTranslate(doc);

        const currentPageNumber = doc.internal.getCurrentPageInfo().pageNumber;
        if (currentPageNumber !== sectionStartPage) {
          doc.setFontSize(16);
          doc.setTextColor(30, 58, 138);
          doc.setFont("helvetica", "bold");
          doc.text(fullTitle, 14, 26);

          if (organizationName) {
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont("helvetica", "normal");
            doc.text(`${translate('export.organisation')}: ${organizationName}`, 14, 33);
          }
        }

        // Ensure the table body doesn't start before the header area
        if (data.cursor && data.cursor.y < 38) { // Increased from 34 to 38 to provide more space
          data.cursor.y = 38;
        }
      },
      margin: { top: 38 }, // Increased from 34 to 38
      didParseCell: (data) => {
        if (data.column.dataKey === 4) { // 'Recommendations' column
          let rawValue = data.cell.raw;
          if (typeof rawValue === 'object' && rawValue !== null && 'content' in rawValue) {
            rawValue = rawValue.content;
          }
          if (rawValue && typeof rawValue === 'string') {
            data.cell.text = rawValue.split('\n');
          }
        }
      },
    });
  });
};
