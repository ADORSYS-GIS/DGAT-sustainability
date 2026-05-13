import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getTableStyles } from "./tableStyles";
import type { AdminSubmissionDetail, RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";
import type { UserOptions } from 'jspdf-autotable';
import type { TFunction } from "i18next";
import { normalizeCategoryName } from "./categoryUtils";

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

const groupDataByCategory = (
  submissions: AdminSubmissionDetail[],
): { [key: string]: TableData[] } => {
  const groupedData: { [key: string]: TableData[] } = {};
  const addedQuestions: { [key: string]: Set<string> } = {};

  submissions.forEach((submission) => {
    if (submission.content?.responses) {
      submission.content.responses.forEach((response) => {
        const category = normalizeCategoryName(response.question_category);
        const questionText = response.question_text || "N/A";

        if (!groupedData[category]) {
          groupedData[category] = [];
          addedQuestions[category] = new Set();
        }

        if (questionText !== "N/A" && !addedQuestions[category].has(questionText)) {
          let answer = "N/A";
          let percentage = "0%";
          let textAnswer = "N/A";

          if (response.response) {
            try {
              const parsed = JSON.parse(response.response);
              answer = parsed.yesNo ? (translate('export.yes') || "Yes") : (translate('export.no') || "No");
              percentage = `${parsed.percentage || 0}%`;
              textAnswer = parsed.text || (translate('export.na') || "N/A");
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
  organizationName?: string,
  assessmentName?: string,
  t?: TFunction
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

  const groupedData = groupDataByCategory(submissions);
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
    const categoryRecs = recommendations
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
