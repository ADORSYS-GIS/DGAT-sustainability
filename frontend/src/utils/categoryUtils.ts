type CategoryBucket<T> = {
  questions?: T[];
  recommendations?: T[];
  [key: string]: unknown;
};

export const normalizeCategoryName = (category?: string | null): string => {
  const normalized = (category || "Uncategorized")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/:+$/g, "")
    .trim();

  return normalized || "Uncategorized";
};

export const mergeCategoryBuckets = <T extends CategoryBucket<unknown>>(
  categoryData: Record<string, T>
): Record<string, T> => {
  return Object.entries(categoryData).reduce<Record<string, T>>((merged, [category, value]) => {
    const normalizedCategory = normalizeCategoryName(category);
    const existing = merged[normalizedCategory];

    if (!existing) {
      merged[normalizedCategory] = { ...value };
      return merged;
    }

    merged[normalizedCategory] = {
      ...existing,
      ...value,
      questions: [
        ...((existing.questions as unknown[]) || []),
        ...((value.questions as unknown[]) || []),
      ],
      recommendations: [
        ...((existing.recommendations as unknown[]) || []),
        ...((value.recommendations as unknown[]) || []),
      ],
    };

    return merged;
  }, {});
};
