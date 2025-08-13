import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility function', () => {
  describe('basic functionality', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('should handle single class name', () => {
      const result = cn('text-red-500');
      expect(result).toBe('text-red-500');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle undefined and null values', () => {
      const result = cn(undefined, null, 'text-red-500');
      expect(result).toBe('text-red-500');
    });
  });

  describe('conditional classes', () => {
    it('should handle conditional classes with boolean', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toBe('base-class active-class');
    });

    it('should handle conditional classes with false condition', () => {
      const isActive = false;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toBe('base-class');
    });

    it('should handle multiple conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      );
      expect(result).toBe('base-class active-class');
    });
  });

  describe('object syntax', () => {
    it('should handle object syntax for conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', {
        'active-class': isActive,
        'inactive-class': !isActive,
      });
      expect(result).toBe('base-class active-class');
    });

    it('should handle object syntax with multiple conditions', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn('base-class', {
        'active-class': isActive,
        'disabled-class': isDisabled,
        'enabled-class': !isDisabled,
      });
      expect(result).toBe('base-class active-class enabled-class');
    });
  });

  describe('array syntax', () => {
    it('should handle array syntax', () => {
      const result = cn(['text-red-500', 'font-bold'], 'text-blue-500');
      expect(result).toBe('text-blue-500 font-bold');
    });

    it('should handle nested arrays', () => {
      const result = cn(['text-red-500', ['font-bold', 'text-lg']], 'text-blue-500');
      expect(result).toBe('text-blue-500 font-bold text-lg');
    });
  });

  describe('Tailwind CSS conflicts', () => {
    it('should resolve Tailwind CSS conflicts correctly', () => {
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
    });

    it('should handle multiple conflicting classes', () => {
      const result = cn('text-red-500 p-4 m-2', 'text-blue-500 p-8 m-4');
      expect(result).toBe('text-blue-500 p-8 m-4');
    });

    it('should preserve non-conflicting classes', () => {
      const result = cn('text-red-500 p-4', 'text-blue-500 m-2');
      expect(result).toBe('text-blue-500 p-4 m-2');
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed input types', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn(
        'base-class',
        ['text-red-500', 'font-bold'],
        {
          'active-class': isActive,
          'disabled-class': isDisabled,
        },
        isActive && 'conditional-class',
        undefined,
        null
      );
      expect(result).toBe('base-class text-red-500 font-bold active-class conditional-class');
    });

    it('should handle deeply nested structures', () => {
      const result = cn(
        'base-class',
        [
          'text-red-500',
          {
            'font-bold': true,
            'text-lg': false,
          },
          ['p-4', 'm-2'],
        ],
        'text-blue-500'
      );
      expect(result).toBe('base-class text-blue-500 font-bold p-4 m-2');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const result = cn('', 'text-red-500', '');
      expect(result).toBe('text-red-500');
    });

    it('should handle whitespace-only strings', () => {
      const result = cn('   ', 'text-red-500', '  ');
      expect(result).toBe('text-red-500');
    });

    it('should handle numbers', () => {
      const result = cn(123, 'text-red-500', 456);
      expect(result).toBe('123 text-red-500 456');
    });

    it('should handle functions', () => {
      const fn = () => 'function-class';
      const result = cn('base-class', fn);
      expect(result).toBe('base-class function-class');
    });
  });

  describe('performance', () => {
    it('should handle large numbers of classes efficiently', () => {
      const manyClasses = Array.from({ length: 1000 }, (_, i) => `class-${i}`);
      const startTime = performance.now();
      const result = cn(...manyClasses);
      const endTime = performance.now();

      // Should process 1000 classes in reasonable time (less than 10ms)
      expect(endTime - startTime).toBeLessThan(10);
      expect(result).toContain('class-0');
      expect(result).toContain('class-999');
    });

    it('should handle complex conditional logic efficiently', () => {
      const conditions = Array.from({ length: 100 }, (_, i) => ({
        [`class-${i}`]: i % 2 === 0,
      }));

      const startTime = performance.now();
      const result = cn('base-class', ...conditions);
      const endTime = performance.now();

      // Should process 100 conditions in reasonable time (less than 5ms)
      expect(endTime - startTime).toBeLessThan(5);
      expect(result).toContain('base-class');
      expect(result).toContain('class-0');
      expect(result).toContain('class-2');
      expect(result).not.toContain('class-1');
    });
  });

  describe('real-world examples', () => {
    it('should handle typical React component class scenarios', () => {
      const isActive = true;
      const isDisabled = false;
      const variant = 'primary';
      const size = 'large';

      const result = cn(
        'button',
        'px-4 py-2 rounded',
        {
          'bg-blue-500 text-white': variant === 'primary',
          'bg-gray-500 text-gray-800': variant === 'secondary',
          'opacity-50 cursor-not-allowed': isDisabled,
          'hover:bg-blue-600': variant === 'primary' && !isDisabled,
        },
        {
          'text-sm': size === 'small',
          'text-base': size === 'medium',
          'text-lg': size === 'large',
        },
        isActive && 'ring-2 ring-blue-300'
      );

      expect(result).toBe('button px-4 py-2 rounded bg-blue-500 text-white text-lg hover:bg-blue-600 ring-2 ring-blue-300');
    });

    it('should handle responsive design classes', () => {
      const isMobile = true;
      const isTablet = false;

      const result = cn(
        'base-layout',
        {
          'flex-col': isMobile,
          'flex-row': !isMobile,
          'p-4': isMobile,
          'p-8': isTablet,
          'p-12': !isMobile && !isTablet,
        }
      );

      expect(result).toBe('base-layout flex-col p-4');
    });
  });
}); 