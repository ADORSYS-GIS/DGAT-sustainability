import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Global mocks
const mockNavigate = vi.fn();

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    },
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => 
      React.createElement('a', { href: to }, children),
    Navigate: ({ to }: { to: string }) => React.createElement('div', { 'data-testid': 'navigate', 'data-to': to }),
  };
});

// Mock zustand stores
vi.mock('@/stores/offlineStore', () => ({
  useOfflineStore: () => ({
    isOnline: true,
    pendingSubmissions: [],
    pendingReviews: [],
    setOnlineStatus: vi.fn(),
    addPendingSubmission: vi.fn(),
    removePendingSubmission: vi.fn(),
    addPendingReview: vi.fn(),
    removePendingReview: vi.fn(),
  }),
}));

// Mock useOfflineApi hooks
vi.mock('@/hooks/useOfflineApi', () => ({
  useOfflineQuestions: () => ({
    data: { questions: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfflineCategories: () => ({
    data: { categories: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfflineCategoriesMutation: () => ({
    isPending: false,
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  }),
  useOfflineAssessments: () => ({
    data: { assessments: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfflineAssessmentsMutation: () => ({
    isPending: false,
    createAssessment: vi.fn(),
    updateAssessment: vi.fn(),
    deleteAssessment: vi.fn(),
  }),
  useOfflineResponses: () => ({
    data: { responses: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfflineResponsesMutation: () => ({
    isPending: false,
    createResponse: vi.fn(),
    updateResponse: vi.fn(),
    deleteResponse: vi.fn(),
  }),
  useOfflineSubmissions: () => ({
    data: { submissions: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfflineSubmissionsMutation: () => ({
    isPending: false,
    createSubmission: vi.fn(),
    updateSubmission: vi.fn(),
    deleteSubmission: vi.fn(),
  }),
  useOfflineOrganizations: () => ({
    data: { organizations: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfflineOrganizationsMutation: () => ({
    isPending: false,
    createOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
  }),
}));

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.URL.createObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: vi.fn(() => 'mock-url'),
  writable: true,
});

// Mock window.URL.revokeObjectURL
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
});

// Test utilities
export const createMockSubmission = (overrides = {}) => ({
  submission_id: 'test-submission-1',
  org_name: 'Test Organization',
  submitted_at: '2024-01-01T00:00:00Z',
  review_status: 'under_review',
  content: {
    responses: []
  },
  ...overrides,
});

export const createMockCategory = (overrides = {}) => ({
  category_id: 'test-category-1',
  name: 'Test Category',
  weight: 25,
  order: 1,
  template_id: 'test-template-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockQuestion = (overrides = {}) => ({
  question_id: 'test-question-1',
  category: 'Test Category',
  created_at: '2024-01-01T00:00:00Z',
  latest_revision: {
    question_revision_id: 'test-revision-1',
    question_id: 'test-question-1',
    text: { en: 'Test question text' },
    weight: 5,
    created_at: '2024-01-01T00:00:00Z',
  },
  ...overrides,
});

export const createMockOrganization = (overrides = {}) => ({
  id: 'test-org-1',
  name: 'Test Organization',
  alias: 'test-org',
  enabled: true,
  description: 'Test organization description',
  redirectUrl: null,
  domains: [{ name: 'test.com' }],
  attributes: { categories: ['Test Category'] },
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@test.com',
  username: 'johndoe',
  emailVerified: true,
  ...overrides,
});

// Custom matchers
expect.extend({
  toHaveBeenCalledWithMatch(received, ...expected) {
    const pass = received.mock.calls.some(call => 
      expected.every((arg, index) => 
        call[index] && typeof call[index] === 'object' && 
        Object.keys(arg).every(key => call[index][key] === arg[key])
      )
    );
    
    return {
      pass,
      message: () => 
        `expected ${received.getMockName()} to have been called with arguments matching ${JSON.stringify(expected)}`,
    };
  },
}); 