import jsPDF from "jspdf";
import type { RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";

// --- Constants based on ActionPlan.tsx styling ---
const PAGE_MARGIN = 14;
const COLUMN_MARGIN = 10;
const CARD_MARGIN = 6;
const COLUMN_COUNT = 4;
const COLUMN_WIDTH =
  (297 - 2 * PAGE_MARGIN - (COLUMN_COUNT - 1) * COLUMN_MARGIN) / COLUMN_COUNT; // A4 landscape
const CARD_PADDING = 4;
const CARD_WIDTH = COLUMN_WIDTH - CARD_PADDING * 2;
const HEADER_TOP_PADDING = 8;
const HEADER_BOTTOM_PADDING = 3;

const FONT_SIZES = {
  mainTitle: 18,
  columnTitle: 12,
  badge: 8,
  cardCategory: 9,
  cardText: 8,
};

const COLORS = {
  dgrvBlue: [30, 58, 138], // Equivalent to text-dgrv-blue
  textDark: [17, 24, 39], // text-gray-900
  columnContainer: { bg: [249, 250, 251], border: [229, 231, 235] },
  column: {
    todo: [107, 114, 128],
    in_progress: [37, 99, 235],
    done: [22, 163, 74],
    approved: [5, 150, 105],
  },
  cardStatus: {
    todo: { bg: [243, 244, 246], border: [209, 213, 219] },
    in_progress: { bg: [239, 246, 255], border: [147, 197, 253] },
    done: { bg: [240, 253, 244], border: [134, 239, 172] },
    approved: { bg: [236, 253, 245], border: [110, 231, 183] },
  },
};

interface Column {
  id: "todo" | "in_progress" | "done" | "approved";
  title: string;
}

const getStatusColors = (status: RecommendationWithStatus["status"]) => {
  return COLORS.cardStatus[status] || COLORS.cardStatus.todo;
};

const drawCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  recommendation: RecommendationWithStatus,
): number => {
  const { bg, border } = getStatusColors(recommendation.status);

  doc.setFontSize(FONT_SIZES.cardText);
  doc.setFont("helvetica", "normal");
  const splitText = doc.splitTextToSize(
    recommendation.recommendation,
    width - 2 * CARD_PADDING,
  );
  const textHeight = doc.getTextDimensions(splitText).h;

  const categoryHeight = FONT_SIZES.cardCategory * 0.35 * 2; // Line height for category
  const cardHeight = categoryHeight + textHeight + 3 * CARD_PADDING;

  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setFillColor(bg[0], bg[1], bg[2]);
  doc.roundedRect(x, y, width, cardHeight, 3, 3, "FD"); // FD = Fill and Stroke

  // Category
  doc.setFontSize(FONT_SIZES.cardCategory);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.dgrvBlue[0], COLORS.dgrvBlue[1], COLORS.dgrvBlue[2]);
  doc.text(recommendation.category, x + CARD_PADDING, y + CARD_PADDING + 2);

  // Recommendation Text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZES.cardText);
  doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
  doc.text(splitText, x + CARD_PADDING, y + CARD_PADDING + categoryHeight);

  return cardHeight;
};

const drawColumns = (
  doc: jsPDF,
  startY: number,
  columns: Column[],
  tasksByColumn: Map<string, RecommendationWithStatus[]>,
) => {
  let currentX = PAGE_MARGIN;
  const maxPageHeight = doc.internal.pageSize.height;
  const columnHeight = maxPageHeight - startY - PAGE_MARGIN;

  columns.forEach((column) => {
    // Draw column container
    doc.setDrawColor(
      COLORS.columnContainer.border[0],
      COLORS.columnContainer.border[1],
      COLORS.columnContainer.border[2],
    );
    doc.setFillColor(
      COLORS.columnContainer.bg[0],
      COLORS.columnContainer.bg[1],
      COLORS.columnContainer.bg[2],
    );
    doc.roundedRect(currentX, startY, COLUMN_WIDTH, columnHeight, 3, 3, "FD");

    // Draw Header inside container
    const headerX = currentX + CARD_PADDING;
    const headerY = startY + HEADER_TOP_PADDING;
    const titleColor = COLORS.column[column.id] || COLORS.column.todo;
    doc.setFontSize(FONT_SIZES.columnTitle);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.text(column.title, headerX, headerY);

    // Draw Badge
    const taskCount = tasksByColumn.get(column.id)?.length.toString() || "0";
    const titleWidth = doc.getTextWidth(column.title);
    const badgeX = headerX + titleWidth + 5;
    const badgeWidth = doc.getTextWidth(taskCount) + 4;
    doc.setDrawColor(209, 213, 219); // border-gray-300
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(badgeX, headerY - 3, badgeWidth, 5, 2, 2, "FD");
    doc.setFontSize(FONT_SIZES.badge);
    doc.setTextColor(0, 0, 0);
    doc.text(taskCount, badgeX + 2, headerY);

    currentX += COLUMN_WIDTH + COLUMN_MARGIN;
  });
};

export const drawKanbanBoard = (
  doc: jsPDF,
  recommendations: RecommendationWithStatus[],
  addNewPage: () => void,
) => {
  if (!recommendations || recommendations.length === 0) return;

  // The initial page is now created by the caller
  const startY = 45; // Adjusted startY to be below the new section headers

  const columns: Column[] = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "done", title: "Done" },
    { id: "approved", title: "Approved" },
  ];

  const tasksByColumn = new Map<string, RecommendationWithStatus[]>();
  columns.forEach((col) => tasksByColumn.set(col.id, []));
  recommendations.forEach((rec) => tasksByColumn.get(rec.status)?.push(rec));

  drawColumns(doc, startY, columns, tasksByColumn);

  const cardStartY = startY + HEADER_TOP_PADDING + HEADER_BOTTOM_PADDING + 5;
  const cardYPositions = new Array(columns.length).fill(cardStartY);
  const maxPageHeight = doc.internal.pageSize.height - PAGE_MARGIN;
  const drawnTasks = new Set<string>();

  let tasksToDraw = recommendations.length;
  while (tasksToDraw > 0) {
    let pageHasContent = false;
    columns.forEach((column, index) => {
      const columnX = PAGE_MARGIN + index * (COLUMN_WIDTH + COLUMN_MARGIN);
      const tasks = tasksByColumn.get(column.id) || [];

      for (const task of tasks) {
        const taskId = `${task.category}-${task.recommendation}`;
        if (drawnTasks.has(taskId)) continue;

        const estCardHeight =
          doc.splitTextToSize(
            task.recommendation,
            COLUMN_WIDTH - 2 * CARD_PADDING,
          ).length *
            4 +
          20;

        if (cardYPositions[index] + estCardHeight > maxPageHeight) {
          continue; // Move to next column if this card won't fit
        }

        const cardX = columnX + CARD_PADDING;
        const cardHeight = drawCard(
          doc,
          cardX,
          cardYPositions[index],
          CARD_WIDTH,
          task,
        );
        cardYPositions[index] += cardHeight + CARD_MARGIN;
        drawnTasks.add(taskId);
        tasksToDraw--;
        pageHasContent = true;
      }
    });

    if (tasksToDraw > 0 && pageHasContent) {
      addNewPage(); // Use the callback to add a new page with headers
      drawColumns(doc, startY, columns, tasksByColumn);
      cardYPositions.fill(cardStartY); // Reset Y positions for new page
    } else if (tasksToDraw > 0 && !pageHasContent) {
      // Handle case where a single card is too large for a page
      console.error(
        "A card is too large to fit on a single page and was skipped.",
      );
      break;
    }
  }
};
