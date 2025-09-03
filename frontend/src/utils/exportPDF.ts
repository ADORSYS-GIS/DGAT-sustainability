import jsPDF from "jspdf";
import Chart from "chart.js/auto";
import { OrganizationActionPlan, RecommendationWithStatus } from "../openapi-rq/requests/types.gen";

// PDF export question type
interface PDFQuestion {
  question: string;
  answer: {
    yesNo?: boolean;
    percentage?: number;
    text?: string;
  };
}

// Structure for items within a report category, specifically when extracting questions/answers
interface ReportCategoryItem {
  question?: string;
  answer?: {
    yesNo?: boolean;
    percentage?: number;
    text?: string;
  };
  recommendation?: string;
}

// Structure for a category object within a report's data array
interface ReportDataCategoryValue {
  questions?: PDFQuestion[];
  recommendation?: string;
  answer?: { percentage?: number; yesNo?: boolean; text?: string };
  [key: string]: unknown; // For radar data extraction, allows for other properties
}

interface ReportDataCategory {
  [categoryName: string]: ReportCategoryItem | ReportCategoryItem[] | ReportDataCategoryValue;
}

interface AssessmentReport {
  report_id: string;
  data: ReportDataCategory[];
}

// Helper: Extract all questions, responses, and recommendations from a report
// This function might not be directly used with OrganizationActionPlan,
// but kept for compatibility if report structure is still used elsewhere.
function extractSubmissionSections(report: AssessmentReport) {
  const sections: { category: string; question?: string; response?: unknown; recommendation?: string }[] = [];
  if (!Array.isArray(report.data)) return sections;
  for (const catObj of report.data) {
    if (catObj && typeof catObj === "object") {
      for (const [category, arrOrObj] of Object.entries(catObj)) {
        const items = Array.isArray(arrOrObj) ? arrOrObj : [arrOrObj];
        for (const item of items) {
          if (item && typeof item === "object") {
            const typedItem = item as ReportCategoryItem; // Cast for specific properties
            const question =
              typedItem.question ||
              Object.keys(item).find(
                (k) => k !== "answer" && k !== "recommendation",
              );
            const response =
              typedItem.answer || (question ? (item as ReportCategoryItem & { [key: string]: unknown })[question as keyof ReportCategoryItem] : undefined); // Fallback for dynamic access
            const recommendation = typedItem.recommendation;
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

// Helper: Extract all recommendations for Kanban from OrganizationActionPlan
function extractKanbanTasksFromActionPlans(actionPlans: OrganizationActionPlan[]): RecommendationWithStatus[] {
  const allRecommendations: RecommendationWithStatus[] = [];
  for (const plan of actionPlans) {
    allRecommendations.push(...plan.recommendations);
  }
  return allRecommendations;
}

// Helper: Extract radar chart data (dummy axes for now)
// This function might need adjustment based on the actual data available in OrganizationActionPlan
function extractRadarData(reports: AssessmentReport[]) {
  // Example axes
  const axes = [
    "Environmental",
    "Governmental",
    "Social",
    "Webank Analytics",
    "dummy",
    "security",
  ];
  // For each axis, average all 'percentage' values found in that category
  const values = axes.map((axis) => {
    let sum = 0,
      count = 0;
    for (const report of reports) {
      if (!Array.isArray(report.data)) continue;
      for (const catObj of report.data) {
        if (catObj && typeof catObj === "object" && axis in catObj) {
          const arrOrObj = catObj[axis];
          const items = Array.isArray(arrOrObj) ? arrOrObj : [arrOrObj];
          for (const item of items) {
            if (
              item &&
              typeof item === "object" &&
              (item as ReportDataCategoryValue).answer &&
              typeof (item as ReportDataCategoryValue).answer?.percentage === "number"
            ) {
              sum += (item as ReportDataCategoryValue).answer?.percentage || 0;
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
async function renderRadarChartToImage({ axes, values, maxValues }: { axes: string[]; values: number[]; maxValues: number[] }) {
  // You must have a <canvas id="radar-canvas" width="500" height="400" style="display:none" /> in your DOM
  const canvas = document.getElementById(
    "radar-canvas",
  ) as HTMLCanvasElement & { _chartInstance?: Chart };
  if (!canvas) throw new Error("Missing <canvas id='radar-canvas'> in DOM");
  // Destroy previous chart instance if any
  if (canvas._chartInstance) {
    canvas._chartInstance.destroy();
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context from canvas");

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

// Helper: Render a bar chart for Kanban progress to a hidden canvas and return image data
async function renderKanbanProgressChartToImage(
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
  },
) {
  const canvas = document.getElementById(
    "kanban-progress-canvas",
  ) as HTMLCanvasElement & { _chartInstance?: Chart };
  if (!canvas)
    throw new Error("Missing <canvas id='kanban-progress-canvas'> in DOM");

  if (canvas._chartInstance) {
    canvas._chartInstance.destroy();
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context from canvas");

  const chart = new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      indexAxis: 'y', // Horizontal bar chart
      responsive: false,
      animation: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Recommendation Progress',
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value: number | string) {
              return value + '%';
            }
          }
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  });

  canvas._chartInstance = chart;
  await new Promise((resolve) => setTimeout(resolve, 300));
  const image = canvas.toDataURL("image/png");
  chart.destroy();
  return image;
}

// Helper: Group questions/answers/recommendations by category for tabular display
function extractCategoryTables(report: AssessmentReport) {
  const grouped: Record<string, { question: string | undefined; response: PDFQuestion['answer']; recommendation: string | undefined }[]> = {};
  if (!Array.isArray(report.data)) return grouped;
  for (const catObj of report.data) {
    if (catObj && typeof catObj === "object") {
      for (const [category, value] of Object.entries(catObj)) {
        if (!value || typeof value !== "object") continue;
        const catVal = value as ReportDataCategoryValue;
        const questions = Array.isArray(catVal.questions)
          ? catVal.questions
          : [];
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
function extractKanbanTasksOnePerCategory(reports: AssessmentReport[]) {
  let idx = 0;
  const tasks: { id: string; category: string; recommendation: string; status: string }[] = [];
  const seen = new Set<string>();
  for (const report of reports) {
    if (!Array.isArray(report.data)) continue;
    for (const catObj of report.data) {
      if (catObj && typeof catObj === "object") {
        for (const [category, arrOrObj] of Object.entries(
          catObj as Record<string, unknown>,
        )) {
          if (seen.has(category)) continue;
          const items = Array.isArray(arrOrObj) ? arrOrObj : [arrOrObj];
          for (const item of items) {
            if (item && typeof item === "object" && "recommendation" in item) {
              tasks.push({
                id: `${report.report_id}-${category}-${idx++}`,
                category,
                recommendation: (item as { recommendation: string }).recommendation,
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

// Helper: Calculate overall progress percentage from actual report data
function calculateOverallProgress(reports: AssessmentReport[]) {
  let totalPercentage = 0;
  let count = 0;
  
  for (const report of reports) {
    if (!Array.isArray(report.data)) continue;
    for (const catObj of report.data) {
      if (catObj && typeof catObj === "object") {
        for (const [category, value] of Object.entries(catObj)) {
          if (value && typeof value === "object" && "questions" in value) {
            const typedValue = value as ReportDataCategoryValue;
            const questions = Array.isArray(typedValue.questions) ? typedValue.questions : [];
            for (const question of questions) {
              if (question.answer && typeof question.answer.percentage === "number") {
                totalPercentage += question.answer.percentage;
                count++;
              }
            }
          }
        }
      }
    }
  }
  
  return count > 0 ? Math.round(totalPercentage / count) : 0;
}

// Helper: Extract category statistics from actual report data
function extractCategoryStats(reports: AssessmentReport[]) {
  const stats: Record<string, { total: number; count: number; yesCount: number; noCount: number; average?: number }> = {};
  
  for (const report of reports) {
    if (!Array.isArray(report.data)) continue;
    for (const catObj of report.data) {
      if (catObj && typeof catObj === "object") {
        for (const [category, value] of Object.entries(catObj)) {
          if (!stats[category]) {
            stats[category] = { total: 0, count: 0, yesCount: 0, noCount: 0 };
          }
          
          if (value && typeof value === "object" && "questions" in value) {
            const typedValue = value as ReportDataCategoryValue;
            const questions = Array.isArray(typedValue.questions) ? typedValue.questions : [];
            for (const question of questions) {
              if (question.answer) {
                stats[category].count++;
                if (typeof question.answer.percentage === "number") {
                  stats[category].total += question.answer.percentage;
                }
                if (typeof question.answer.yesNo === "boolean") {
                  if (question.answer.yesNo) {
                    stats[category].yesCount++;
                  } else {
                    stats[category].noCount++;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Calculate averages
  for (const category in stats) {
    if (stats[category].count > 0) {
      stats[category].average = Math.round(stats[category].total / stats[category].count);
    } else {
      stats[category].average = 0;
    }
  }
  
  return stats;
}

// Helper: Calculate Kanban progress percentages
function calculateKanbanProgress(recommendations: RecommendationWithStatus[]) {
  const total = recommendations.length;
  const statusCounts = {
    todo: 0,
    in_progress: 0,
    done: 0,
    approved: 0,
  };

  recommendations.forEach((rec) => {
    statusCounts[rec.status]++;
  });

  const progress = {
    todo: total > 0 ? Math.round((statusCounts.todo / total) * 100) : 0,
    in_progress: total > 0 ? Math.round((statusCounts.in_progress / total) * 100) : 0,
    done: total > 0 ? Math.round((statusCounts.done / total) * 100) : 0,
    approved: total > 0 ? Math.round((statusCounts.approved / total) * 100) : 0,
  };

  return progress;
}

// Helper: Draw gradient background
function drawGradientBackground(doc, x, y, width, height, color1, color2) {
  const steps = 20;
  const stepHeight = height / steps;
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
    
    doc.setFillColor(r, g, b);
    doc.rect(x, y + i * stepHeight, width, stepHeight, "F");
  }
}

// Helper: Draw circular progress indicator
function drawCircularProgress(doc, x, y, radius, percentage, color) {
  const centerX = x + radius;
  const centerY = y + radius;
  
  // Draw background circle
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(3);
  doc.circle(centerX, centerY, radius, "S");
  
  // Draw progress arc
  const angle = (percentage / 100) * 360;
  const startAngle = -90; // Start from top
  
  doc.setDrawColor(...color);
  doc.setLineWidth(3);
  
  // Draw arc segments
  const segmentAngle = 5;
  for (let i = 0; i < angle; i += segmentAngle) {
    const currentAngle = startAngle + i;
    const nextAngle = Math.min(startAngle + i + segmentAngle, startAngle + angle);
    
    const x1 = centerX + radius * Math.cos(currentAngle * Math.PI / 180);
    const y1 = centerY + radius * Math.sin(currentAngle * Math.PI / 180);
    const x2 = centerX + radius * Math.cos(nextAngle * Math.PI / 180);
    const y2 = centerY + radius * Math.sin(nextAngle * Math.PI / 180);
    
    doc.line(x1, y1, x2, y2);
  }
  
  // Draw percentage text
  doc.setTextColor(...color);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(`${percentage}%`, centerX, centerY + 5, { align: "center" });
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 0);
}

// Helper: Draw bar chart
function drawBarChart(doc, x, y, width, height, data, labels) {
  const barWidth = width / data.length * 0.8;
  const barSpacing = width / data.length * 0.2;
  const maxValue = Math.max(...data);
  
  // Draw bars
  data.forEach((value, index) => {
    const barHeight = (value / maxValue) * height * 0.8;
    const barX = x + index * (barWidth + barSpacing);
    const barY = y + height - barHeight;
    
    // Gradient fill for bars
    const color = [30, 58, 138]; // Blue
    doc.setFillColor(...color);
    doc.rect(barX, barY, barWidth, barHeight, "F");
    
    // Value text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(value.toString(), barX + barWidth/2, barY - 5, { align: "center" });
    
    // Label
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(labels[index], barX + barWidth/2, y + height - 5, { align: "center" });
  });
}

// Helper: Draw C-shaped progress indicator (like in the image)
function drawCProgressIndicator(doc, x, y, radius, percentage, color, label) {
  const centerX = x + radius;
  const centerY = y + radius;
  
  // Draw C-shaped background
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(8);
  
  // Draw C shape (270 degrees, starting from top)
  const startAngle = -90;
  const endAngle = 180;
  const angleStep = 5;
  
  for (let angle = startAngle; angle <= endAngle; angle += angleStep) {
    const x1 = centerX + radius * Math.cos(angle * Math.PI / 180);
    const y1 = centerY + radius * Math.sin(angle * Math.PI / 180);
    const x2 = centerX + radius * Math.cos((angle + angleStep) * Math.PI / 180);
    const y2 = centerY + radius * Math.sin((angle + angleStep) * Math.PI / 180);
    doc.line(x1, y1, x2, y2);
  }
  
  // Draw progress arc
  const progressAngle = (percentage / 100) * 270; // 270 degrees total
  doc.setDrawColor(...color);
  doc.setLineWidth(8);
  
  for (let angle = startAngle; angle <= startAngle + progressAngle; angle += angleStep) {
    const x1 = centerX + radius * Math.cos(angle * Math.PI / 180);
    const y1 = centerY + radius * Math.sin(angle * Math.PI / 180);
    const x2 = centerX + radius * Math.cos((angle + angleStep) * Math.PI / 180);
    const y2 = centerY + radius * Math.sin((angle + angleStep) * Math.PI / 180);
    doc.line(x1, y1, x2, y2);
  }
  
  // Draw percentage text
  doc.setTextColor(...color);
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(`${percentage}%`, centerX, centerY + 5, { align: "center" });
  
  // Draw label
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  const labelLines = doc.splitTextToSize(label, radius * 1.5);
  doc.text(labelLines, centerX, centerY + 25, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

// Helper: Draw line chart with upward trend
function drawLineChart(doc, x, y, width, height, data, label) {
  const pointCount = data.length;
  const stepX = width / (pointCount - 1);
  
  // Draw line
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(2);
  
  for (let i = 0; i < pointCount - 1; i++) {
    const x1 = x + i * stepX;
    const y1 = y + height - (data[i] / 100) * height;
    const x2 = x + (i + 1) * stepX;
    const y2 = y + height - (data[i + 1] / 100) * height;
    doc.line(x1, y1, x2, y2);
  }
  
  // Draw points
  doc.setFillColor(30, 58, 138);
  for (let i = 0; i < pointCount; i++) {
    const pointX = x + i * stepX;
    const pointY = y + height - (data[i] / 100) * height;
    doc.circle(pointX, pointY, 2, "F");
  }
  
  // Draw label
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(label, x + width/2, y - 10, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

// Main export function
export async function exportAllAssessmentsPDF(
  reports: AssessmentReport[], // Keep original reports for tabular data and radar chart if still needed
  organizationActionPlans: OrganizationActionPlan[], // New parameter for Kanban data
) {
  const doc = new jsPDF({ orientation: "landscape" });
  let y = 20;

  // Add sustainability logo to the first page
  try {
    console.log("Loading sustainability logo...");
    
    // Try different possible paths for the image
    const possiblePaths = [
      '/sustainability.png',
      './sustainability.png',
      'sustainability.png',
      '/public/sustainability.png'
    ];
    
    let imageLoaded = false;
    
    for (const path of possiblePaths) {
      try {
        console.log("Trying to load image from:", path);
        
        // Create an image element to load the logo
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        // Wait for the image to load before continuing
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            console.log("Sustainability logo loaded successfully from:", path);
            try {
              // Create a canvas to convert the image to base64
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);
              
              const base64 = canvas.toDataURL('image/png');
              console.log("Adding sustainability logo to PDF at position (10,", y, ")");
              doc.addImage(base64, "PNG", 10, y, 50, 50);
              y += 60; // Space after logo
              imageLoaded = true;
              resolve();
            } catch (error) {
              console.error("Could not add sustainability logo to PDF:", error);
              reject(error);
            }
          };
          
          img.onerror = (error) => {
            console.warn("Could not load sustainability logo from:", path, error);
            resolve();
          };
          
          // Set the source to trigger loading
          img.src = path;
        });
        
        if (imageLoaded) {
          console.log("Logo processing completed, y position is now:", y);
          break; // Exit the loop if image was loaded successfully
        }
      } catch (error) {
        console.warn("Failed to load image from:", path, error);
        continue; // Try next path
      }
    }
    
    if (!imageLoaded) {
      console.error("Could not load sustainability logo from any path, trying fallback...");
      
      // Fallback: Create a simple placeholder logo
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50;
        canvas.height = 50;
        
        // Draw a simple placeholder logo
        if (ctx) {
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(0, 0, 50, 50);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('DGRV', 25, 25);
          ctx.font = '8px Arial';
          ctx.fillText('Sustainability', 25, 40);
        }
        
        const base64 = canvas.toDataURL('image/png');
        console.log("Adding fallback logo to PDF at position (10,", y, ")");
        doc.addImage(base64, "PNG", 10, y, 50, 50);
        y += 60; // Space after logo
        console.log("Fallback logo added successfully");
      } catch (fallbackError) {
        console.error("Could not create fallback logo:", fallbackError);
      }
    }
  } catch (error) {
    console.error("Error in logo processing:", error);
    // Continue without logo if it fails to load
  }

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
    for (const [category, rows] of Object.entries(grouped)) {
      if (y > doc.internal.pageSize.height - 40) { // Check if new page is needed for category header + table
        doc.addPage();
        y = 20;
      }
      // Category header
      doc.setFillColor(30, 58, 138); // blue
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, "bold");
      doc.rect(10, y - 4, 277, 8, "F");
      doc.text(`${category}`, 12, y + 2);
      doc.setFont(undefined, "normal");
      doc.setTextColor(0, 0, 0);
      y += 8;
      // Table header with outer border and vertical lines only
      doc.setFillColor(226, 232, 240); // light gray
      const colX = [10, 70, 100, 130, 190, 287];
      doc.rect(colX[0], y - 4, colX[colX.length - 1] - colX[0], 10, "F"); // header bg
      doc.setFont(undefined, "bold");
      doc.text("Question", colX[0] + 2, y + 2);
      doc.text("Yes/No", colX[1] + 2, y + 2);
      doc.text("%", colX[2] + 2, y + 2);
      doc.text("Text Response", colX[3] + 2, y + 2);
      doc.text("Recommendation", colX[4] + 2, y + 2);
      // Draw outer border and vertical lines
      doc.rect(
        colX[0],
        y - 4,
        colX[colX.length - 1] - colX[0],
        10 + rows.length * 10, // Approximate height for rows
      ); // outer border
      for (let i = 1; i < colX.length - 1; i++) {
        doc.line(colX[i], y - 4, colX[i], y - 4 + 10 + rows.length * 10);
      }
      doc.setFont(undefined, "normal");
      y += 10;
      // Table rows
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        let yesNo = "-",
          percent = "-",
          text = "-";
        if (typeof row.response === "object" && row.response !== null) {
          yesNo =
            typeof row.response.yesNo === "boolean"
              ? row.response.yesNo
                ? "Yes"
                : "No"
              : "-";
          percent =
            typeof row.response.percentage === "number"
              ? String(row.response.percentage)
              : "-";
          text = row.response.text ? String(row.response.text) : "-";
        } else if (typeof row.response === "string") {
          text = row.response;
        }
        // Wrap text for each cell
        const qLines = doc.splitTextToSize(
          row.question ? String(row.question) : "-",
          colX[1] - colX[0] - 4,
        );
        const yesNoLines = doc.splitTextToSize(yesNo, colX[2] - colX[1] - 4);
        const percentLines = doc.splitTextToSize(
          percent,
          colX[3] - colX[2] - 4,
        );
        const textLines = doc.splitTextToSize(text, colX[4] - colX[3] - 4);
        // Only show recommendation for the first row in the category
        const recLines =
          rowIdx === 0 && row.recommendation
            ? doc.splitTextToSize(
                row.recommendation ? String(row.recommendation) : "-",
                colX[5] - colX[4] - 4,
              )
            : [""];
        // Find max number of lines for this row
        const maxLines = Math.max(
          qLines.length,
          yesNoLines.length,
          percentLines.length,
          textLines.length,
          recLines.length,
        );
        const rowHeight = maxLines * 6 + 2;
        // Draw row border (rectangle)
        doc.rect(
          colX[0],
          y - 4,
          colX[colX.length - 1] - colX[0],
          rowHeight,
          "S",
        );
        // Draw vertical column lines
        for (let i = 1; i < colX.length - 1; i++) {
          doc.line(colX[i], y - 4, colX[i], y - 4 + rowHeight);
        }
        // Write text in each cell, vertically centered
        doc.text(qLines, colX[0] + 2, y + 2, {
          maxWidth: colX[1] - colX[0] - 4,
        });
        doc.text(yesNoLines, colX[1] + 2, y + 2, {
          maxWidth: colX[2] - colX[1] - 4,
        });
        doc.text(percentLines, colX[2] + 2, y + 2, {
          maxWidth: colX[3] - colX[2] - 4,
        });
        doc.text(textLines, colX[3] + 2, y + 2, {
          maxWidth: colX[4] - colX[3] - 4,
        });
        if (rowIdx === 0 && row.recommendation) {
          doc.text(recLines, colX[4] + 2, y + 2, {
            maxWidth: colX[5] - colX[4] - 4,
          });
        }
        y += rowHeight;
      }
      y += 4;
    }
    y += 4;
    if (y > doc.internal.pageSize.height - 20) {
      doc.addPage();
      y = 20;
    }
  }

  // Kanban Board Section (Recommendations from organizationActionPlans)
  if (organizationActionPlans && organizationActionPlans.length > 0) {
    for (const organizationPlan of organizationActionPlans) {
      if (y > doc.internal.pageSize.height - 60) { // Ensure space for title and chart
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(18);
      doc.text(`Kanban Board for ${organizationPlan.organization_name}`, 10, y);
      y += 10;
      doc.setFontSize(12);

      const allRecommendations = organizationPlan.recommendations;
      const kanbanProgress = calculateKanbanProgress(allRecommendations);
      const progressLabels = ["To Do", "In Progress", "Done", "Approved"];
      const progressDataValues = [
        kanbanProgress.todo,
        kanbanProgress.in_progress,
        kanbanProgress.done,
        kanbanProgress.approved,
      ];
      const progressColors = [
        "rgba(59, 130, 246, 0.6)", // blue
        "rgba(37, 99, 235, 0.6)", // darker blue
        "rgba(16, 185, 129, 0.6)", // green
        "rgba(34, 197, 94, 0.6)", // emerald
      ];
      const borderColors = [
        "rgb(59, 130, 246)",
        "rgb(37, 99, 235)",
        "rgb(16, 185, 129)",
        "rgb(34, 197, 94)",
      ];

      const kanbanChartData = {
        labels: progressLabels,
        datasets: [
          {
            label: "Progress",
            data: progressDataValues,
            backgroundColor: progressColors,
            borderColor: borderColors,
            borderWidth: 1,
          },
        ],
      };

      const kanbanChartImg = await renderKanbanProgressChartToImage(kanbanChartData);
      doc.addImage(kanbanChartImg, "PNG", 10, y, 150, 100);
      y += 110;

      // Display individual recommendations (simple list)
      doc.setFontSize(14);
      doc.text("Recommendations:", 10, y);
      y += 7;
      doc.setFontSize(10);
      for (const rec of allRecommendations) {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(`- Category: ${rec.category}, Status: ${rec.status}, Recommendation: ${rec.recommendation}`, 15, y);
        y += 7;
      }
      y += 10; // Space between organizations
    }
  }


  // 3. Radar Chart Section (unchanged, still uses 'reports' parameter)
  // This section assumes 'reports' still contains the data for the radar chart.
  // If the radar chart should also use OrganizationActionPlan data, further adjustments are needed.
  if (reports && reports.length > 0) {
    if (y > doc.internal.pageSize.height - 120) { // Ensure space for radar chart
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(18);
    doc.text("Radar Chart (Sustainability Scores)", 10, y);
    y += 10;
    const radarData = extractRadarData(reports);
    const radarImg = await renderRadarChartToImage(radarData);
    doc.addImage(radarImg, "PNG", 10, y, 120, 90);
  }

  // Save the PDF
  doc.save("assessment-report.pdf");
}

// NOTE: You must have <canvas id="radar-canvas" width="500" height="400" style={{display:'none'}} />
// and <canvas id="kanban-progress-canvas" width="600" height="400" style={{display:'none'}} /> in your DOM for this to work!