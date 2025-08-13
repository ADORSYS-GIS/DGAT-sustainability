import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '../NotFound';

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotFound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the 404 heading', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('should render the not found message', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    });

    it('should render the description text', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      expect(screen.getByText(/the page you are looking for does not exist/i)).toBeInTheDocument();
    });

    it('should render the go home button', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      expect(goHomeButton).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should navigate to home when go home button is clicked', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      fireEvent.click(goHomeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle multiple clicks on go home button', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      
      fireEvent.click(goHomeButton);
      fireEvent.click(goHomeButton);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check for main heading
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveTextContent('404');
    });

    it('should have proper button labels', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent(/go home/i);
    });

    it('should have proper semantic structure', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      // Check for main content area
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('styling and layout', () => {
    it('should apply correct container classes', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');
    });

    it('should apply correct text alignment', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const container = screen.getByText('404').closest('div');
      expect(container).toHaveClass('text-center');
    });

    it('should apply correct spacing classes', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const container = screen.getByText('404').closest('div');
      expect(container).toHaveClass('space-y-6');
    });
  });

  describe('responsive design', () => {
    it('should apply responsive classes', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const container = screen.getByText('404').closest('div');
      expect(container).toHaveClass('px-4');
    });

    it('should have proper max width constraints', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const container = screen.getByText('404').closest('div');
      expect(container).toHaveClass('max-w-md');
    });
  });

  describe('error handling', () => {
    it('should handle navigation errors gracefully', () => {
      // Mock navigate to throw an error
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      
      // Should not crash when navigation fails
      expect(() => fireEvent.click(goHomeButton)).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should render efficiently', () => {
      const startTime = performance.now();
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );
      const endTime = performance.now();

      // Should render in reasonable time (less than 50ms)
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('integration', () => {
    it('should integrate with router correctly', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      // Verify that navigation works
      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      fireEvent.click(goHomeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('content verification', () => {
    it('should display correct error message', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
      expect(screen.getByText(/the page you are looking for does not exist/i)).toBeInTheDocument();
    });

    it('should display correct 404 number', () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      expect(screen.getByText('404')).toBeInTheDocument();
    });
  });
}); 