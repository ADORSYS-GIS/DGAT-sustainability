// /frontend/src/components/pages/admin/AssignCategories/WeightInput.tsx
/**
 * @file Weight input component for the Assign Categories dialog.
 * @description This component displays an input field for setting the weight of a category.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';

interface WeightInputProps {
  label: string;
  value: number;
  onChange: (value: string) => void;
}

const WeightInput: React.FC<WeightInputProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center gap-2 mt-2">
      <Label className="w-1/3">{label}</Label>
      <Input
        type="number"
        value={value ? value.toFixed(2) : ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default WeightInput;