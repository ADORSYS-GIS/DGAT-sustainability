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
            const question =
              item.question ||
              Object.keys(item).find(
                (k) => k !== "answer" && k !== "recommendation",
              );
            const response =
              item.answer || (question ? item[question] : undefined);
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
        for (const [category, arrOrObj] of Object.entries(
          catObj as Record<string, unknown>,
        )) {
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

// Helper: Extract radar chart data from actual report data
function extractRadarData(reports) {
  const categoryStats = {};
  
  for (const report of reports) {
    if (!Array.isArray(report.data)) continue;
    for (const catObj of report.data) {
      if (catObj && typeof catObj === "object") {
        for (const [category, value] of Object.entries(catObj)) {
          if (!categoryStats[category]) {
            categoryStats[category] = { total: 0, count: 0 };
          }
          
          if (value && typeof value === "object" && "questions" in value) {
            const questions = Array.isArray(value.questions) ? value.questions : [];
            for (const question of questions) {
              if (question.answer && typeof question.answer.percentage === "number") {
                categoryStats[category].total += question.answer.percentage;
                categoryStats[category].count++;
              }
            }
          }
        }
      }
    }
  }
  
  // Calculate averages and prepare radar data
  const axes = Object.keys(categoryStats);
  const values = axes.map(category => {
    const stats = categoryStats[category];
    return stats.count > 0 ? Math.round(stats.total / stats.count) : 0;
  });
  const maxValues = axes.map(() => 100);
  
  return { axes, values, maxValues };
}

// Helper: Render radar chart to a hidden canvas and return image data
async function renderRadarChartToImage({ axes, values, maxValues }) {
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

// Helper: Group questions/answers/recommendations by category for tabular display
function extractCategoryTables(report) {
  const grouped = {};
  if (!Array.isArray(report.data)) return grouped;
  for (const catObj of report.data) {
    if (catObj && typeof catObj === "object") {
      for (const [category, value] of Object.entries(catObj)) {
        if (!value || typeof value !== "object") continue;
        const catVal = value as {
          questions?: PDFQuestion[];
          recommendation?: string;
        };
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
function extractKanbanTasksOnePerCategory(reports) {
  let idx = 0;
  const tasks = [];
  const seen = new Set();
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

// Helper: Calculate overall progress percentage from actual report data
function calculateOverallProgress(reports) {
  let totalPercentage = 0;
  let count = 0;
  
  for (const report of reports) {
    if (!Array.isArray(report.data)) continue;
    for (const catObj of report.data) {
      if (catObj && typeof catObj === "object") {
        for (const [category, value] of Object.entries(catObj)) {
          if (value && typeof value === "object" && "questions" in value) {
            const questions = Array.isArray(value.questions) ? value.questions : [];
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
function extractCategoryStats(reports) {
  const stats = {};
  
  for (const report of reports) {
    if (!Array.isArray(report.data)) continue;
    for (const catObj of report.data) {
      if (catObj && typeof catObj === "object") {
        for (const [category, value] of Object.entries(catObj)) {
          if (!stats[category]) {
            stats[category] = { total: 0, count: 0, yesCount: 0, noCount: 0 };
          }
          
          if (value && typeof value === "object" && "questions" in value) {
            const questions = Array.isArray(value.questions) ? value.questions : [];
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
export async function exportAllAssessmentsPDF(reports) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Page 1: Cover Page with Sustainability Image
  drawGradientBackground(doc, 0, 0, pageWidth, pageHeight, [240, 248, 255], [255, 240, 245]);
  
  // Add sustainability image
  try {
    const img = new Image();
    img.src = '/sustainability.png';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    doc.addImage(img, 'PNG', 20, 20, pageWidth - 40, 60);
  } catch (error) {
    console.warn('Could not load sustainability image:', error);
  }
  
  // Title
  doc.setFontSize(32);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("SUSTAINABILITY REPORT 2024", pageWidth/2, 100, { align: "center" });
  
  // Subtitle
  doc.setFontSize(16);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("DGRV Cooperative Assessment Platform", pageWidth/2, 115, { align: "center" });
  
  // Decorative circle
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(2);
  doc.circle(pageWidth/2, 160, 40, "S");
  
  // Icons in circle (simplified as text)
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138);
  doc.text("🌱", pageWidth/2 - 15, 155, { align: "center" });
  doc.text("👥", pageWidth/2 + 15, 155, { align: "center" });
  doc.text("🏢", pageWidth/2, 170, { align: "center" });
  
  // Footer
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("Generated on: " + new Date().toLocaleDateString(), pageWidth/2, pageHeight - 20, { align: "center" });
  
  // Page 2: Executive Summary (like the image)
  doc.addPage();
  let y = 20;
  
  // Header
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("SUSTAINABILITY REPORT 2024", 20, y);
  y += 15;
  
  // Introduction
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 0);
  const introText = "This report provides an overview of our sustainability initiatives across three pillars: environmental protection, social responsibility, and economic development. We aim for transparency as we track progress and set future goals:";
  const introLines = doc.splitTextToSize(introText, pageWidth - 40);
  doc.text(introLines, 20, y);
  y += introLines.length * 6 + 20;
  
  // Calculate overall progress
  const overallProgress = calculateOverallProgress(reports);
  const categoryStats = extractCategoryStats(reports);
  const categories = Object.keys(categoryStats);
  
  // Overall Progress Section
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Overall Progress", 20, y);
  y += 15;
  
  // Progress circle
  drawCircularProgress(doc, 20, y, 25, overallProgress, [30, 58, 138]);
  y += 60;
  
  // Three Pillars Section (like the image)
  if (categories.length > 0) {
    // ENVIRONMENT Section
    const envCategory = categories.find(cat => cat.toLowerCase().includes('environment')) || categories[0];
    const envStats = categoryStats[envCategory] || { average: 0, yesCount: 0, noCount: 0 };
    
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("ENVIRONMENT", 20, y);
    y += 10;
    
    // Environment metrics
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`• ${envStats.average}% average sustainability score`, 25, y);
    y += 6;
    doc.text(`• ${envStats.yesCount} positive responses`, 25, y);
    y += 6;
    doc.text(`• ${envStats.noCount} areas for improvement`, 25, y);
    y += 15;
    
    // Environment progress indicator
    drawCProgressIndicator(doc, pageWidth - 80, y - 30, 30, envStats.average, [30, 58, 138], "REDUCTION IN WATER USAGE");
    y += 50;
    
    // SOCIAL Section
    const socialCategory = categories.find(cat => cat.toLowerCase().includes('social')) || categories[1] || categories[0];
    const socialStats = categoryStats[socialCategory] || { average: 0, yesCount: 0, noCount: 0 };
    
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("SOCIAL", 20, y);
    y += 10;
    
    // Social metrics
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`• ${socialStats.average}% average sustainability score`, 25, y);
    y += 6;
    doc.text(`• ${socialStats.yesCount} positive responses`, 25, y);
    y += 6;
    doc.text(`• ${socialStats.noCount} areas for improvement`, 25, y);
    y += 15;
    
    // Social bar chart
    const socialData = [socialStats.average, 85, 92, 78, 88];
    drawBarChart(doc, pageWidth - 80, y - 30, 60, 40, socialData, ["Score", "Goal", "Target", "Current", "Future"]);
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("92% EMPLOYEE SATISFACTION", pageWidth - 80, y - 35);
    y += 50;
    
    // ECONOMIC Section
    const economicCategory = categories.find(cat => cat.toLowerCase().includes('economic')) || categories[2] || categories[0];
    const economicStats = categoryStats[economicCategory] || { average: 0, yesCount: 0, noCount: 0 };
    
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("ECONOMIC", 20, y);
    y += 10;
    
    // Economic metrics
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`• ${economicStats.average}% average sustainability score`, 25, y);
    y += 6;
    doc.text(`• ${economicStats.yesCount} positive responses`, 25, y);
    y += 6;
    doc.text(`• ${economicStats.noCount} areas for improvement`, 25, y);
    y += 15;
    
    // Economic line chart
    const economicData = [60, 65, 70, 75, 80, 85, 90];
    drawLineChart(doc, pageWidth - 80, y - 30, 60, 40, economicData, "$120M NET PROFIT");
    y += 50;
  }
  
  // Goal Progress sidebar
  doc.setFillColor(50, 50, 50);
  doc.rect(pageWidth - 20, 20, 20, pageHeight - 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("GOAL", pageWidth - 15, 40, { angle: 90 });
  doc.text("PROGRESS", pageWidth - 15, 60, { angle: 90 });
  doc.setFontSize(16);
  doc.text(`${overallProgress}%`, pageWidth - 15, pageHeight/2, { angle: 90, align: "center" });
  
  // Page 3: Detailed Assessment Results (Structured Table)
  doc.addPage();
  y = 20;
  
  // Header
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Detailed Assessment Results", 20, y);
  y += 15;
  
  // Process each report
  for (const report of reports) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
    
    // Report header
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.setTextColor(30, 58, 138);
    doc.text(`Report ID: ${report.report_id}`, 20, y);
    y += 10;
    
    const grouped = extractCategoryTables(report);
    
    for (const [category, rowsUnknown] of Object.entries(grouped)) {
      const rows = Array.isArray(rowsUnknown) ? rowsUnknown : [];
      
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }
      
      // Category header with background
      doc.setFillColor(30, 58, 138);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, "bold");
      doc.rect(20, y - 5, pageWidth - 40, 10, "F");
      doc.text(category, 25, y + 2);
      doc.setFont(undefined, "normal");
      doc.setTextColor(0, 0, 0);
      y += 15;
      
      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y - 5, pageWidth - 40, 10, "F");
      doc.setFont(undefined, "bold");
      doc.text("Question", 25, y + 2);
      doc.text("Yes/No", 80, y + 2);
      doc.text("%", 110, y + 2);
      doc.text("Text Response", 130, y + 2);
      doc.text("Recommendation", 200, y + 2);
      doc.setFont(undefined, "normal");
      y += 10;
      
      // Table rows
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        
        // Question
        doc.setFontSize(10);
        const questionText = row.question ? String(row.question).substring(0, 50) + "..." : "Question";
        doc.text(questionText, 25, y + 2);
        
        // Yes/No
        let yesNo = "-";
        if (typeof row.response === "object" && row.response !== null && typeof row.response.yesNo === "boolean") {
          yesNo = row.response.yesNo ? "Yes" : "No";
        }
        doc.text(yesNo, 80, y + 2);
        
        // Percentage
        let percentage = "-";
        if (typeof row.response === "object" && row.response !== null && typeof row.response.percentage === "number") {
          percentage = `${row.response.percentage}%`;
        }
        doc.text(percentage, 110, y + 2);
        
        // Text Response
        let textResponse = "-";
        if (typeof row.response === "object" && row.response !== null && row.response.text) {
          textResponse = String(row.response.text).substring(0, 60) + "...";
        } else if (typeof row.response === "string") {
          textResponse = row.response.substring(0, 60) + "...";
        }
        doc.text(textResponse, 130, y + 2);
        
        // Recommendation (only for first row)
        if (rowIdx === 0 && row.recommendation) {
          const recText = String(row.recommendation).substring(0, 60) + "...";
          doc.text(recText, 200, y + 2);
        }
        
        y += 8;
      }
      
      y += 10;
    }
    
    y += 10;
  }
  
  // Page 4: Action Plan (Kanban Board)
  doc.addPage();
  y = 20;
  
  // Header
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Action Plan & Recommendations", 20, y);
  y += 15;
  
  const kanbanTasks = extractKanbanTasksOnePerCategory(reports);
  const statuses = ["todo", "in_progress", "done", "approved"];
  const statusLabels = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
    approved: "Approved",
  };
  const statusColors = {
    todo: [59, 130, 246] as [number, number, number],
    in_progress: [37, 99, 235] as [number, number, number],
    done: [16, 185, 129] as [number, number, number],
    approved: [34, 197, 94] as [number, number, number],
  };
  
  const colWidth = (pageWidth - 40) / statuses.length;
  const boardX = 20;
  
  // Draw Kanban headers
  statuses.forEach((status, i) => {
    doc.setFillColor(...(statusColors[status] as [number, number, number]));
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.rect(boardX + i * colWidth, y, colWidth - 2, 12, "F");
    doc.text(statusLabels[status], boardX + 4 + i * colWidth, y + 8);
    doc.setFont(undefined, "normal");
  });
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  // Group tasks by status
  const groupedTasks = {};
  statuses.forEach(s => groupedTasks[s] = kanbanTasks.filter(t => t.status === s));
  const maxRows = Math.max(...statuses.map(s => groupedTasks[s].length));
  
  for (let row = 0; row < maxRows; row++) {
    statuses.forEach((status, i) => {
      const task = groupedTasks[status][row];
      if (task) {
        // Draw card
        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(boardX + i * colWidth + 2, y, colWidth - 6, 25, 3, 3, "FD");
        
        // Category name
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.setTextColor(30, 58, 138);
        doc.text(task.category, boardX + i * colWidth + 6, y + 8, { maxWidth: colWidth - 12 });
        
        // Recommendation
        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.setTextColor(0, 0, 0);
        const recLines = doc.splitTextToSize(task.recommendation.substring(0, 80) + "...", colWidth - 12);
        doc.text(recLines, boardX + i * colWidth + 6, y + 15, { maxWidth: colWidth - 12 });
      }
    });
    y += 30;
    
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
  }
  
  // Page 5: Radar Chart
  doc.addPage();
  y = 20;
  
  // Header
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Sustainability Performance Overview", 20, y);
  y += 15;
  
  // Description
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 0);
  const descText = "The radar chart below shows the sustainability performance across different categories. Each axis represents a different aspect of sustainability, with scores ranging from 0 to 100.";
  const descLines = doc.splitTextToSize(descText, pageWidth - 40);
  doc.text(descLines, 20, y);
  y += descLines.length * 6 + 15;
  
  // Radar chart
  const radarData = extractRadarData(reports);
  const radarImg = await renderRadarChartToImage(radarData);
  doc.addImage(radarImg, "PNG", 20, y, pageWidth - 40, (pageWidth - 40) * 0.75);
  
  // Save the PDF
  doc.save("sustainability-report-2024.pdf");
}

// NOTE: You must have a <canvas id="radar-canvas" width="500" height="400" style={{display:'none'}} /> in your DOM for this to work!