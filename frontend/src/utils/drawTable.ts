import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getTableStyles } from "./tableStyles";
import type { AdminSubmissionDetail, RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";
import type { UserOptions } from 'jspdf-autotable';
import { addHeader } from "./exportPDF"; // Import addHeader

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
        const category = response.question_category || "Uncategorized";
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
  organizationName?: string,
  assessmentName?: string
) => {
  if (!submissions || submissions.length === 0) {
    return;
  }

  const groupedData = groupDataByCategory(submissions);
  const styles = getTableStyles();
  let isFirstCategory = true;
  const sectionTitle = "Detailed Assessment Results";
  const fullTitle = assessmentName ? `${sectionTitle} - ${assessmentName}` : sectionTitle;

  Object.keys(groupedData).forEach(category => {
    const tableData = groupedData[category];
    const categoryRecs = recommendations
      .filter((rec) => rec.category === category)
      .map((rec) => `- ${rec.recommendation}`)
      .join("\n");

    const body = tableData.map((row, index) => {
      const rowContent: (string | { content: string; rowSpan: number; styles: { valign: 'middle' } })[] = [
        row.question,
        row.answer,
        row.percentage,
        row.textAnswer,
      ];
      if (index === 0) {
        rowContent.push({
          content: categoryRecs || "", // Leave empty instead of showing "No recommendations for this category."
          rowSpan: tableData.length,
          styles: { valign: 'middle' },
        });
      }
      return rowContent;
    });

    let currentY;
    if (isFirstCategory) {
      currentY = startY;
      isFirstCategory = false;
    } else {
      currentY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || startY;

      // If the next category title wouldn't fit on this page, start a new page
      if (currentY + 40 > doc.internal.pageSize.height) {
        doc.addPage();
        addHeader(doc);
        currentY = 38; // Start below the header + title area (increased from 34 to 38)
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
          "Question",
          "Answer (Y/N)",
          "Percentage",
          "Text Answer",
          "Recommendations",
        ],
      ],
      body: body as UserOptions['body'],
      ...styles,
      didDrawPage: (data) => {
        // Apply header and title to every page of the table
        addHeader(doc);
        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138);
        doc.setFont("helvetica", "bold");
        doc.text(fullTitle, 14, 26); // Moved down from 22 to 26 to avoid overlay

        if (organizationName) {
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.setFont("helvetica", "normal");
          doc.text(`Organisation: ${organizationName}`, 14, 33); // Moved down from 29 to 33
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