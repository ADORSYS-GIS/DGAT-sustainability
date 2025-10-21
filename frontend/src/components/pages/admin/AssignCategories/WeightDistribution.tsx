// /frontend/src/components/pages/admin/AssignCategories/WeightDistribution.tsx
/**
 * @file Weight distribution component for the Assign Categories dialog.
 * @description This component displays the weight inputs for selected categories and the total weight.
 */
import { Label } from '@/components/ui/label';
import React from 'react';
import WeightInput from './WeightInput';

interface OptionType {
  value: string;
  label: string;
}

interface WeightDistributionProps {
  selectedCategories: readonly OptionType[];
  weights: { [key: string]: number };
  onWeightChange: (categoryId: string, value: string) => void;
}

const WeightDistribution: React.FC<WeightDistributionProps> = ({
  selectedCategories,
  weights,
  onWeightChange,
}) => {
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);

  return (
    <div>
      <Label>Weights</Label>
      {selectedCategories.map((cat) => (
        <WeightInput
          key={cat.value}
          label={cat.label}
          value={weights[cat.value]}
          onChange={(value) => onWeightChange(cat.value, value)}
        />
      ))}
      <div>
        Total: {totalWeight.toFixed(2)}
      </div>
    </div>
  );
};

export default WeightDistribution;