# Project Structure

This document outlines the directory structure for this project, providing an overview of the purpose of each major file and folder.

## Root Directory

- `.github/workflows/`: Contains GitHub Actions workflow files.
  - `analyses.yml`: Defines the CI/CD pipeline for linting, testing, and building the project.
- `docs/`: Contains all project documentation.
  - `CI_WORKFLOW.md`: Detailed explanation of the CI/CD pipeline.
  - `PROJECT_STRUCTURE.md`: This file.
- `public/`: Contains static assets that are directly served to the browser without being processed by Vite, such as `favicon.ico` and `robots.txt`.
- `src/`: The main application source code.
  - `components/`: Reusable React components used throughout the application.
    - `ui/`: UI components built with `shadcn/ui`, such as buttons, cards, and forms.
    - `AuthProvider.tsx`: Manages user authentication state.
    - `Navbar.tsx`: The main navigation bar component.
  - `hooks/`: Custom React hooks for shared logic.
    - `useAuth.ts`: Hook for accessing authentication status and user information.
  - `lib/`: Utility functions and helper modules.
    - `utils.ts`: General utility functions.
  - `pages/`: Top-level page components that correspond to specific routes.
    - `admin/`: Components for the admin dashboard, such as managing users, organizations, and questions.
    - `Dashboard.tsx`: The main dashboard for authenticated users.
    - `Assessment.tsx`: The page where users take sustainability assessments.
    - `Login.tsx`: The user login page.
    - `Welcome.tsx`: The public landing page.
  - `services/`: Modules for interacting with data sources, such as IndexedDB and backend APIs.
    - `indexedDB.ts`: Schema and utility functions for the local IndexedDB database.
    - `dataService.ts`: A centralized service for fetching and manipulating application data.
  - `types/`: TypeScript type definitions and interfaces used across the project.
  - `App.tsx`: The root component of the application, which sets up routing.
  - `main.tsx`: The entry point of the React application.
  - `index.css`: Global CSS styles.
- `package.json`: Defines project metadata, dependencies, and npm scripts.
- `vite.config.ts`: Configuration file for Vite, the build tool.
- `tsconfig.json`: Configuration file for the TypeScript compiler.
- `tailwind.config.js`: Configuration file for Tailwind CSS.
- `postcss.config.js`: Configuration file for PostCSS.
