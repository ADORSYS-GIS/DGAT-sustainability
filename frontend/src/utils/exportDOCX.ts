import { Document, Packer, Paragraph, ImageRun, AlignmentType, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType, VerticalAlign, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import type { AdminSubmissionDetail, RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";

async function urlToArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

const dgrvBlue = "1E3A8A";

interface ITableData {
  question: string;
  category: string;
  answer: string;
  percentage: string;
  textAnswer: string;
  recommendations?: string;
}

const groupDataByCategory = (
  submissions: AdminSubmissionDetail[],
): { [key: string]: ITableData[] } => {
  const groupedData: { [key: string]: ITableData[] } = {};
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

const createAssessmentsTable = (
  submissions: AdminSubmissionDetail[],
  recommendations: RecommendationWithStatus[]
) => {
  const groupedData = groupDataByCategory(submissions);
  const tables = [];

  for (const category in groupedData) {
    tables.push(new Paragraph({
      children: [new TextRun({ text: category, bold: true, size: 28 })],
      spacing: { before: 200 },
    }));

    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Question")], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph("Answer (Y/N)")], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph("Percentage")], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph("Text Answer")], width: { size: 30, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph("Recommendations")], width: { size: 30, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];

    const categoryRecs = recommendations
      .filter((rec) => rec.category === category)
      .map((rec) => `- ${rec.recommendation}`)
      .join("\n");

    const recommendationCell = new TableCell({
      children: [new Paragraph(categoryRecs || "No recommendations for this category.")],
      rowSpan: groupedData[category].length,
      verticalAlign: VerticalAlign.CENTER,
    });

    groupedData[category].forEach((data, index) => {
      const cells = [
        new TableCell({ children: [new Paragraph(data.question)] }),
        new TableCell({ children: [new Paragraph(data.answer)] }),
        new TableCell({ children: [new Paragraph(data.percentage)] }),
        new TableCell({ children: [new Paragraph(data.textAnswer)] }),
      ];
      if (index === 0) {
        cells.push(recommendationCell);
      }
      rows.push(new TableRow({ children: cells }));
    });

    tables.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  return tables;
};

const createKanbanBoard = (recommendations: RecommendationWithStatus[]) => {
    const tasksByColumn = {
      todo: recommendations.filter(r => r.status === 'todo'),
      in_progress: recommendations.filter(r => r.status === 'in_progress'),
      done: recommendations.filter(r => r.status === 'done'),
      approved: recommendations.filter(r => r.status === 'approved'),
    };
  
    const columnTitles = {
      todo: "To Do",
      in_progress: "In Progress",
      done: "Done",
      approved: "Approved",
    };
  
    const maxTasks = Math.max(
      tasksByColumn.todo.length,
      tasksByColumn.in_progress.length,
      tasksByColumn.done.length,
      tasksByColumn.approved.length
    );
  
    const headerRow = new TableRow({
      children: Object.keys(columnTitles).map(key => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: columnTitles[key as keyof typeof columnTitles], bold: true })],
        })],
      })),
    });
  
    const taskRows = [];
    for (let i = 0; i < maxTasks; i++) {
      const rowCells = [];
      const columns = ['todo', 'in_progress', 'done', 'approved'];
  
      for (const col of columns) {
        const tasks = tasksByColumn[col as keyof typeof tasksByColumn];
        if (tasks[i]) {
          const task = tasks[i];
          rowCells.push(new TableCell({
            children: [new Paragraph({
              children: [
                new TextRun({ text: task.category, bold: true, color: dgrvBlue }),
                new TextRun({ text: `\n${task.recommendation}` }),
              ],
            })],
            verticalAlign: VerticalAlign.TOP,
          }));
        } else {
          rowCells.push(new TableCell({ children: [new Paragraph("")] }));
        }
      }
      taskRows.push(new TableRow({ children: rowCells }));
    }
  
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...taskRows],
    });
  
    return [
      new Paragraph({ text: "", pageBreakBefore: true }),
      new Paragraph({
        children: [new TextRun({ text: "Action Plan Kanban Board", size: 36, bold: true, color: dgrvBlue })],
        spacing: { after: 100 },
      }),
      new Paragraph("This Kanban board provides a visual tool to track the progress of each recommendation."),
      table,
    ];
  };


// Main export function
export async function exportAllAssessmentsDOCX(
  submissions: AdminSubmissionDetail[],
  recommendations: RecommendationWithStatus[],
  radarChartDataUrl?: string,
  recommendationChartDataUrl?: string
) {
  let imageBuffer: ArrayBuffer | undefined;

  // Add sustainability logo
  try {
    const possiblePaths = [
      '/sustainability.png', './sustainability.png', 'sustainability.png', '/public/sustainability.png'
    ];
    for (const path of possiblePaths) {
      try {
        imageBuffer = await urlToArrayBuffer(path);
        if (imageBuffer) break;
      } catch (error) {
        continue;
      }
    }
    if (!imageBuffer) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 500; canvas.height = 500;
        if (ctx) {
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(0, 0, 150, 150);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('DGRV', 75, 75);
          ctx.font = '16px Arial';
          ctx.fillText('Sustainability', 75, 110);
        }
        const base64 = canvas.toDataURL('image/png');
        const response = await fetch(base64);
        const blob = await response.blob();
        imageBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }
  } catch (error) {
    console.error("Error in logo processing:", error);
  }

  const sections = [];

  // --- Cover Page ---
  if (imageBuffer) {
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: { width: 450, height: 292.5 },
            }),
          ],
        }),
      ],
    });
  }

  sections.push({
    properties: {},
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "SUSTAINABILITY REPORT 2025",
            bold: true,
            size: 48,
            color: dgrvBlue,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "This document presents the findings of the 2025 sustainability assessment, offering a detailed analysis of performance across key environmental, social, and governance (ESG) dimensions. It provides a comprehensive overview of the assessment results, data-driven recommendations for measurable improvements, and an actionable roadmap to help guide future sustainability initiatives.",
            size: 24,
          }),
        ],
      }),
    ],
  });

  // --- Radar Chart Section ---
  if (radarChartDataUrl) {
    try {
      const radarChartBuffer = await urlToArrayBuffer(radarChartDataUrl);
      sections.push({
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Sustainability Dimensions Overview", size: 36, bold: true, color: dgrvBlue })],
            spacing: { after: 100 },
          }),
          new Paragraph("The following chart visualizes the performance across key sustainability dimensions, providing a high-level overview of strengths and areas for improvement."),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: radarChartBuffer,
                transformation: { width: 500, height: 300 },
              }),
            ],
          }),
        ],
      });
    } catch (error) {
      console.error("Error adding radar chart to DOCX:", error);
    }
  }

  // --- Recommendation Status Chart Section ---
  if (recommendationChartDataUrl) {
    try {
      const recommendationChartBuffer = await urlToArrayBuffer(recommendationChartDataUrl);
      sections.push({
        properties: {},
        children: [
          new Paragraph({ text: "", pageBreakBefore: true }),
          new Paragraph({
            children: [new TextRun({ text: "Recommendation Status Overview", size: 36, bold: true, color: dgrvBlue })],
            spacing: { after: 100 },
          }),
          new Paragraph("This chart summarizes the current status of all recommendations, illustrating the progress made in implementing the suggested actions."),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: recommendationChartBuffer,
                transformation: { width: 500, height: 300 },
              }),
            ],
          }),
        ],
      });
    } catch (error) {
      console.error("Error adding recommendation chart to DOCX:", error);
    }
  }

  // --- Detailed Assessments Table Section ---
  sections.push({
    properties: {},
    children: [
      new Paragraph({ text: "", pageBreakBefore: true }),
      new Paragraph({
        children: [new TextRun({ text: "Detailed Assessment Results", size: 36, bold: true, color: dgrvBlue })],
        spacing: { after: 100 },
      }),
      new Paragraph("The table below presents a detailed breakdown of the assessment responses, organized by sustainability category. It includes the original questions, the responses provided, and the corresponding recommendations."),
      ...createAssessmentsTable(submissions, recommendations),
    ],
  });

  // --- Action Plan Kanban Board Section ---
  sections.push({
    properties: {},
    children: createKanbanBoard(recommendations),
  });


  const doc = new Document({ sections });

  // --- Final Save ---
  Packer.toBlob(doc).then(blob => {
    saveAs(blob, "sustainability-report.docx");
  });
}