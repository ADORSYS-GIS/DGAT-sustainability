// /frontend/src/components/pages/admin/AssignCategories/CategorySelector.tsx
/**
 * @file Category selector component for the Assign Categories dialog.
 * @description This component displays a multi-select dropdown for choosing categories.
 */
import { Label } from '@/components/ui/label';
import React from 'react';
import Select, { MultiValue } from 'react-select';

interface OptionType {
  value: string;
  label: string;
}

interface CategorySelectorProps {
  options: OptionType[];
  value: MultiValue<OptionType>;
  onChange: (selectedOptions: MultiValue<OptionType>) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ options, value, onChange }) => {
  return (
    <div>
      <Label>Categories</Label>
      <Select
        isMulti
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default CategorySelector;