import jsPDF from "jspdf";
import Chart from "chart.js/auto";

// PDF export question type
interface PDFQuestion {
  question: string;
  answer: {
    yesNo?: boolean;
    percentage?: number;
    text?: string;
  };
}

// Helper: Extract all questions, responses, and recommendations from a report
function extractSubmissionSections(report) {
  const sections = [];
  if (!Array.isArray(report.data)) return sections;
  for (const catObj of report.data) {
    if (catObj && typeof catObj === "object") {
      for (const [category, arrOrObj] of Object.entries(catObj)) {
        const items = Array.isArray(arrOrObj) ? arrOrObj : [arrOrObj];
        for (const item of items) {
          if (item && typeof item === "object") {
            const question = item.question || Object.keys(item).find(k => k !== "answer" && k !== "recommendation");
            const response = item.answer || (question ? item[question] : undefined);
            const recommendation = item.recommendation;
            sections.push({
              category,
              question: typeof question === "string" ? question : undefined,
              response,
              recommendation,
            });
          }
        }
      }
    }
  }
  return sections;
}

// Helper: Extract all recommendations for Kanban
function extractKanbanTasks(reports) {
  let idx = 0;
  const tasks = [];
  for (const report of reports) {
    if (!Array.isArray(report.data)) continue;
    for (const catObj of report.data) {
      if (catObj && typeof catObj === "object") {
        for (const [category, arrOrObj] of Object.entries(catObj as Record<string, unknown>)) {
          const items = Array.isArray(arrOrObj) ? arrOrObj : [arrOrObj];
          for (const item of items) {
            if (item && typeof item === "object" && "recommendation" in item) {
              tasks.push({
                id: `${report.report_id}-${category}-${idx++}`,
                category,
                recommendation: item.recommendation,
                status: "todo", // default for now
              });
            }
          }
        }
      }
    }
  }
  return tasks;
}

// Helper: Extract radar chart data (dummy axes for now)
function extractRadarData(reports) {
  // Example axes
  const axes = ["Environmental", "Governmental", "Social", "Webank Analytics", "dummy", "security"];
  // For each axis, average all 'percentage' values found in that category
  const values = axes.map(axis => {
    let sum = 0, count = 0;
    for (const report of reports) {
      if (!Array.isArray(report.data)) continue;
      for (const catObj of report.data) {
        if (catObj && typeof catObj === "object" && axis in catObj) {
          const arrOrObj = catObj[axis];
          const items = Array.isArray(arrOrObj) ? arrOrObj : [arrOrObj];
          for (const item of items) {
            if (item && typeof item === "object" && item.answer && typeof item.answer.percentage === "number") {
              sum += item.answer.percentage;
              count++;
            }
          }
        }
      }
    }
    return count > 0 ? Math.round(sum / count) : 0;
  });
  // For max, just use 100 for all
  const maxValues = axes.map(() => 100);
  return { axes, values, maxValues };
}

// Helper: Render radar chart to a hidden canvas and return image data
async function renderRadarChartToImage({ axes, values, maxValues }) {
  // You must have a <canvas id="radar-canvas" width="500" height="400" style="display:none" /> in your DOM
  const canvas = document.getElementById("radar-canvas") as HTMLCanvasElement & { _chartInstance?: Chart };
  if (!canvas) throw new Error("Missing <canvas id='radar-canvas'> in DOM");
  // Destroy previous chart instance if any
  if (canvas._chartInstance) {
    canvas._chartInstance.destroy();
  }
  const ctx = canvas.getContext("2d");
  const chart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: axes,
      datasets: [
        {
          label: "Sustainability Score",
          data: values,
          fill: true,
          backgroundColor: "rgba(30, 58, 138, 0.2)",
          borderColor: "#1e3a8a",
          pointBackgroundColor: "#1e3a8a",
        },
        {
          label: "Maximum Score per Section",
          data: maxValues,
          fill: false,
          borderColor: "#f59e42",
          pointBackgroundColor: "#f59e42",
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: true, position: "top" },
      },
      scales: {
        r: {
          angleLines: { display: true },
          suggestedMin: 0,
          suggestedMax: 100,
        },
      },
      animation: false,
      responsive: false,
    },
  });
  // Save chart instance for later destroy
  canvas._chartInstance = chart;
  // Wait for chart to render
  await new Promise((resolve) => setTimeout(resolve, 300));
  const image = canvas.toDataURL("image/png");
  chart.destroy();
  return image;
}

// Helper: Group questions/answers/recommendations by category for tabular display (matches actual report data structure)
function extractCategoryTables(report) {
  const grouped = {};
  if (!Array.isArray(report.data)) return grouped;
  for (const catObj of report.data) {
    if (catObj && typeof catObj === "object") {
      for (const [category, value] of Object.entries(catObj)) {
        if (!value || typeof value !== "object") continue;
        const catVal = value as { questions?: PDFQuestion[]; recommendation?: string };
        const questions = Array.isArray(catVal.questions) ? catVal.questions : [];
        const recommendation = catVal.recommendation;
        grouped[category] = questions.map((q, idx) => ({
          question: q.question,
          response: q.answer,
          recommendation: idx === 0 ? recommendation : undefined, // Only first row gets the recommendation
        }));
      }
    }
  }
  return grouped;
}

// Helper: Extract one Kanban card per category (first recommendation per category, per status)
function extractKanbanTasksOnePerCategory(reports) {
  let idx = 0;
  const tasks = [];
  const seen = new Set();
  for (const report of reports) {
    if (!Array.isArray(report.data)) continue;
    for (const catObj of report.data) {
      if (catObj && typeof catObj === "object") {
        for (const [category, arrOrObj] of Object.entries(catObj as Record<string, unknown>)) {
          if (seen.has(category)) continue;
          const items = Array.isArray(arrOrObj) ? arrOrObj : [arrOrObj];
          for (const item of items) {
            if (item && typeof item === "object" && "recommendation" in item) {
              tasks.push({
                id: `${report.report_id}-${category}-${idx++}`,
                category,
                recommendation: item.recommendation,
                status: "todo", // default for now
              });
              seen.add(category);
              break;
            }
          }
        }
      }
    }
  }
  return tasks;
}

// Main export function
export async function exportAllAssessmentsPDF(reports) {
  const doc = new jsPDF({ orientation: "landscape" });
  let y = 20;

  // 1. Submissions, Questions, Responses, Recommendations (Tabular, Grouped)
  doc.setFontSize(18);
  doc.text("Submissions, Questions, Responses, Recommendations", 10, y);
  y += 10;
  doc.setFontSize(12);
  for (const report of reports) {
    doc.setFont(undefined, "bold");
    doc.text(`Report ID: ${report.report_id}`, 10, y);
    doc.setFont(undefined, "normal");
    y += 7;
    const grouped = extractCategoryTables(report);
    for (const [category, rowsUnknown] of Object.entries(grouped)) {
      const rows = Array.isArray(rowsUnknown) ? rowsUnknown : [];
      if (y > 170) { doc.addPage(); y = 20; }
      // Category header
      doc.setFillColor(30, 58, 138); // blue
      doc.setTextColor(255,255,255);
      doc.setFont(undefined, "bold");
      doc.rect(10, y-4, 277, 8, 'F');
      doc.text(`${category}`, 12, y+2);
      doc.setFont(undefined, "normal");
      doc.setTextColor(0,0,0);
      y += 8;
      // Table header with outer border and vertical lines only
      doc.setFillColor(226,232,240); // light gray
      const colX = [10, 70, 100, 130, 190, 287];
      doc.rect(colX[0], y-4, colX[colX.length-1]-colX[0], 10, 'F'); // header bg
      doc.setFont(undefined, "bold");
      doc.text("Question", colX[0] + 2, y+2);
      doc.text("Yes/No", colX[1] + 2, y+2);
      doc.text("%", colX[2] + 2, y+2);
      doc.text("Text Response", colX[3] + 2, y+2);
      doc.text("Recommendation", colX[4] + 2, y+2);
      // Draw outer border and vertical lines
      doc.rect(colX[0], y-4, colX[colX.length-1]-colX[0], 10 + rows.length * 10); // outer border
      for (let i = 1; i < colX.length - 1; i++) {
        doc.line(colX[i], y-4, colX[i], y-4 + 10 + rows.length * 10);
      }
      doc.setFont(undefined, "normal");
      y += 10;
      // Table rows
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        if (y > 180) { doc.addPage(); y = 20; }
        let yesNo = "-", percent = "-", text = "-";
        if (typeof row.response === "object" && row.response !== null) {
          yesNo = typeof row.response.yesNo === "boolean" ? (row.response.yesNo ? "Yes" : "No") : "-";
          percent = typeof row.response.percentage === "number" ? String(row.response.percentage) : "-";
          text = row.response.text ? String(row.response.text) : "-";
        } else if (typeof row.response === "string") {
          text = row.response;
        }
        // Wrap text for each cell
        const qLines = doc.splitTextToSize(row.question ? String(row.question) : "-", colX[1] - colX[0] - 4);
        const yesNoLines = doc.splitTextToSize(yesNo, colX[2] - colX[1] - 4);
        const percentLines = doc.splitTextToSize(percent, colX[3] - colX[2] - 4);
        const textLines = doc.splitTextToSize(text, colX[4] - colX[3] - 4);
        // Only show recommendation for the first row in the category
        const recLines = (rowIdx === 0 && row.recommendation)
          ? doc.splitTextToSize(row.recommendation ? String(row.recommendation) : "-", colX[5] - colX[4] - 4)
          : [""];
        // Find max number of lines for this row
        const maxLines = Math.max(qLines.length, yesNoLines.length, percentLines.length, textLines.length, recLines.length);
        const rowHeight = maxLines * 6 + 2;
        // Draw row border (rectangle)
        doc.rect(colX[0], y-4, colX[colX.length-1]-colX[0], rowHeight, 'S');
        // Draw vertical column lines
        for (let i = 1; i < colX.length - 1; i++) {
          doc.line(colX[i], y-4, colX[i], y-4 + rowHeight);
        }
        // Write text in each cell, vertically centered
        doc.text(qLines, colX[0] + 2, y+2, { maxWidth: colX[1] - colX[0] - 4 });
        doc.text(yesNoLines, colX[1] + 2, y+2, { maxWidth: colX[2] - colX[1] - 4 });
        doc.text(percentLines, colX[2] + 2, y+2, { maxWidth: colX[3] - colX[2] - 4 });
        doc.text(textLines, colX[3] + 2, y+2, { maxWidth: colX[4] - colX[3] - 4 });
        if (rowIdx === 0 && row.recommendation) {
          doc.text(recLines, colX[4] + 2, y+2, { maxWidth: colX[5] - colX[4] - 4 });
        }
        y += rowHeight;
      }
      y += 4;
    }
    y += 4;
    if (y > 180) { doc.addPage(); y = 20; }
  }

  // 2. Kanban Board Section (Tabular, Card-like, Colored Columns, one card per category)
  if (y > 140) { doc.addPage(); y = 20; }
  doc.setFontSize(18);
  doc.text("Kanban Board (Recommendations)", 10, y);
  y += 10;
  doc.setFontSize(12);
  const kanbanTasks = extractKanbanTasksOnePerCategory(reports);
  const statuses = ["todo", "in_progress", "done", "approved"];
  const statusLabels = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
    approved: "Approved",
  };
  const statusColors = {
    todo: [59, 130, 246] as [number, number, number],        // blue
    in_progress: [37, 99, 235] as [number, number, number], // darker blue
    done: [16, 185, 129] as [number, number, number],       // green
    approved: [34, 197, 94] as [number, number, number],    // emerald
  };
  const colWidth = 70;
  const boardX = 10;
  // Draw Kanban headers with colored bg
  statuses.forEach((status, i) => {
    doc.setFillColor(...(statusColors[status] as [number, number, number]));
    doc.setTextColor(255,255,255);
    doc.setFont(undefined, "bold");
    doc.rect(boardX + i * colWidth, y-4, colWidth-2, 12, 'F');
    doc.text(statusLabels[status], boardX + 4 + i * colWidth, y+4);
    doc.setFont(undefined, "normal");
  });
  doc.setTextColor(0,0,0);
  // Draw outer border for the board
  doc.rect(boardX, y-4, colWidth*statuses.length-2, 100, 'S');
  // Draw vertical column lines
  for (let i = 1; i < statuses.length; i++) {
    doc.line(boardX + i * colWidth, y-4, boardX + i * colWidth, y-4 + 100);
  }
  y += 12;
  // Group tasks by status, only one per category
  const groupedTasks = {};
  statuses.forEach(s => groupedTasks[s] = kanbanTasks.filter(t => t.status === s));
  const maxRows = Math.max(...statuses.map(s => groupedTasks[s].length));
  const cardHeight = 20;
  for (let row = 0; row < maxRows; row++) {
    statuses.forEach((status, i) => {
      const task = groupedTasks[status][row];
      if (task) {
        // Draw card-like cell
        doc.setFillColor(245, 245, 245); // light card bg
        doc.setDrawColor(226,232,240);
        doc.setLineWidth(0.2);
        doc.roundedRect(boardX + i * colWidth + 2, y, colWidth-6, cardHeight-4, 2, 2, 'FD');
        doc.setFont(undefined, "bold");
        doc.text(task.category, boardX + i * colWidth + 6, y+8, { maxWidth: colWidth-12 });
        doc.setFont(undefined, "normal");
        doc.text(task.recommendation, boardX + i * colWidth + 6, y+15, { maxWidth: colWidth-12 });
      } else {
        // Empty column: show placeholder
        doc.setTextColor(180,180,180);
        doc.setFontSize(10);
        doc.text("No tasks in " + statusLabels[status].toLowerCase(), boardX + i * colWidth + 6, y+12, { maxWidth: colWidth-12 });
        doc.setFontSize(12);
        doc.setTextColor(0,0,0);
      }
    });
    y += cardHeight;
    if (y > 180) { doc.addPage(); y = 20; }
  }
  y += 10;

  // 3. Radar Chart Section (unchanged)
  if (y > 140) { doc.addPage(); y = 20; }
  doc.setFontSize(18);
  doc.text("Radar Chart (Sustainability Scores)", 10, y);
  y += 10;
  const radarData = extractRadarData(reports);
  const radarImg = await renderRadarChartToImage(radarData);
  doc.addImage(radarImg, "PNG", 10, y, 120, 90);

  // Save the PDF
  doc.save("assessment-report.pdf");
}

// NOTE: You must have a <canvas id="radar-canvas" width="500" height="400" style={{display:'none'}} /> in your DOM for this to work!
