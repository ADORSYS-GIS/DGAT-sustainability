# Codebase Documentation

This document provides a detailed overview of the codebase, including the purpose and content of each file.

## `src` Directory

The `src` directory is the main container for the application's source code.

### `src/main.tsx`

**Purpose:** This is the main entry point of the application.

**Content:**

- It imports the necessary libraries, including `React`, `ReactDOM`, and the main `App` component.
- It also imports the `AuthProvider` to provide authentication context to the entire application.
- The `ReactDOM.createRoot` method is used to render the `App` component into the DOM.

### `src/index.css`

**Purpose:** This file contains the global CSS styles for the application.

**Content:**

- It uses Tailwind CSS directives to include the base, components, and utilities layers.
- It also defines custom CSS variables for colors, border radius, and other themeable properties.

### `src/App.tsx`

**Purpose:** This is the root component of the application.

**Content:**

- It sets up the main routing for the application using `react-router-dom`.
- It defines the public and private routes, as well as the admin-only routes.
- It uses the `useAuth` hook to determine the user's authentication state and role, and redirects them accordingly.
- It also includes the `Toaster` component for displaying toast notifications.

## `src/services` Directory

This directory contains the services that handle the application's business logic and data management.

### `src/services/userService.ts`

**Purpose:** This service handles user-related operations.

**Content:**

- `authenticateUser`: Authenticates a user against the `indexedDB`.
- `createUser`: Creates a new user in the `indexedDB`.
- `updateUser`: Updates an existing user in the `indexedDB`.
- `deleteUser`: Deletes a user from the `indexedDB`.
- `getAllUsers`: Retrieves all users from the `indexedDB`.

### `src/services/templateService.ts`

**Purpose:** This service handles assessment template-related operations.

**Content:**

- `createTemplate`: Creates a new assessment template.
- `updateTemplate`: Updates an existing assessment template.
- `deleteTemplate`: Deletes an assessment template.
- `getAllTemplates`: Retrieves all assessment templates.
- `getTemplateById`: Retrieves a single assessment template by its ID.

### `src/services/taskService.ts`

**Purpose:** This service handles task-related operations for the action plan.

**Content:**

- `createTask`: Creates a new task.
- `updateTask`: Updates an existing task.
- `deleteTask`: Deletes a task.
- `getTasksByActionPlan`: Retrieves all tasks for a specific action plan.

### `src/services/syncService.ts`

**Purpose:** This service is responsible for synchronizing data with a remote server.

**Content:**

- It includes functions for checking for unsynced data, pushing data to the server, and pulling data from the server.
- This service is currently a placeholder and does not have a real implementation.

### `src/services/recommendationService.ts`

**Purpose:** This service handles standard recommendation-related operations.

**Content:**

- `createRecommendation`: Creates a new standard recommendation.
- `updateRecommendation`: Updates an existing standard recommendation.
- `deleteRecommendation`: Deletes a standard recommendation.
- `getAllRecommendations`: Retrieves all standard recommendations.

### `src/services/organizationService.ts`

**Purpose:** This service handles organization-related operations.

**Content:**

- `createOrganization`: Creates a new organization.
- `updateOrganization`: Updates an existing organization.
- `deleteOrganization`: Deletes an organization.
- `getAllOrganizations`: Retrieves all organizations.

### `src/services/indexedDB.ts`

**Purpose:** This is the core data service of the application. It handles all interactions with the local IndexedDB.

**Content:**

- It defines the database schema, including all the object stores (tables).
- It provides a set of generic functions for creating, reading, updating, and deleting records in the database.
- It also includes specific functions for more complex queries, such as retrieving all assessments for a user or all users in an organization.

### `src/services/demoDataService.ts`

**Purpose:** This service is used to populate the database with initial demo data for development and testing.

**Content:**

- It contains a large set of demo data for users, organizations, assessments, questions, and recommendations.
- The `initializeDemo` function checks if the database is empty and, if so, populates it with the demo data.

### `src/services/dataService.ts`

**Purpose:** This file acts as a barrel, re-exporting all the other services for easier importing elsewhere in the application.

**Content:**

- It exports all the functions from the other service files.

### `src/services/assessmentService.ts`

**Purpose:** This service handles assessment-related operations.

**Content:**

- `createAssessment`: Creates a new assessment.
- `updateAssessment`: Updates an existing assessment.
- `deleteAssessment`: Deletes an assessment.
- `getAllAssessments`: Retrieves all assessments.
- `getAssessmentsByUser`: Retrieves all assessments for a specific user.
- `getAssessmentById`: Retrieves a single assessment by its ID.

## `src/types` Directory

This directory contains the TypeScript type definitions for the application's data models.

### `src/types/user.ts`

**Purpose:** Defines the types related to users and authentication.

**Content:**

- `User`: The main user interface.
- `AuthState`: The shape of the authentication state in the `useAuth` hook.

### `src/types/organization.ts`

**Purpose:** Defines the type for an organization.

**Content:**

- `Organization`: The organization interface.

### `src/types/assessment.ts`

**Purpose:** Defines the types related to assessments.

**Content:**

- `Assessment`, `Category`, `Question`, `Answer`, `Recommendation`, `ActionPlan`, `Task`, etc.

## `src/pages` Directory

This directory contains the main pages of the application.

### `src/pages/Welcome.tsx`

**Purpose:** The welcome page of the application, displayed to unauthenticated users.

**Content:**

- It displays a welcome message, a brief introduction to the application, and a set of feature cards.
- It also includes a call to action to either log in or sign up.

### `src/pages/NotFound.tsx`

**Purpose:** The 404 Not Found page.

**Content:**

- It displays a simple message indicating that the requested page could not be found, with a link to go back to the homepage.

### `src/pages/Login.tsx`

**Purpose:** The login and signup page.

**Content:**

- It provides two tabs: one for logging in and one for signing up.
- The login form takes a username and password and uses the `useAuth` hook to authenticate the user.
- The signup form is currently a mock implementation.

### `src/pages/Index.tsx`

**Purpose:** This file simply re-exports the `Welcome` component. This is likely the main entry point for the `/` route.

**Content:**

- `export { Welcome as default } from "./Welcome";`

### `src/pages/Dashboard.tsx`

**Purpose:** The main dashboard for authenticated users.

**Content:**

- It displays a welcome message to the user.
- It includes a set of quick actions, such as starting a new assessment or viewing the action plan.
- It also shows a summary of recent assessments and provides an option to export reports.

### `src/pages/Assessments.tsx`

**Purpose:** This page displays a list of all assessments for the current user.

**Content:**

- It shows a table of assessments with their status, score, and last updated date.
- It provides options to view, continue, or export each assessment.

### `src/pages/Assessment.tsx`

**Purpose:** This is the page for taking an assessment.

**Content:**

- It loads the questions for a specific assessment and displays them one category at a time.
- It allows the user to select answers, add comments, and upload evidence.
- It also provides functionality for saving drafts and submitting the assessment.

### `src/pages/AdminDashboard.tsx`

**Purpose:** The main dashboard for administrators.

**Content:**

- It displays system stats, such as the number of users, organizations, and assessments.
- It provides management actions for managing users, organizations, and assessment tools.
- It also includes a list of pending reviews and system health information.

### `src/pages/ActionPlan.tsx`

**Purpose:** This page displays the user's action plan in a Kanban-style board.

**Content:**

- It shows tasks in different columns based on their status (To Do, In Progress, Done).
- It allows users to drag and drop tasks between columns to update their status.

### `src/pages/admin/StandardRecommendations.tsx`

**Purpose:** This page allows administrators to manage standard recommendations.

**Content:**

- It displays a list of standard recommendations.
- It provides a form for creating and editing recommendations, including their title, description, and associated category.

### `src/pages/admin/ReviewAssessments.tsx`

**Purpose:** This is a very detailed page that allows administrators to review submitted assessments.

**Content:**

- It displays the submitted assessment, including all the answers, comments, and evidence.
- It allows the administrator to add their own recommendations and comments.
- It also has a workflow for marking the review as complete and notifying the user.

### `src/pages/admin/ManageUsers.tsx`

**Purpose:** This page is for managing user accounts.

**Content:**

- It displays a table of all users with their name, email, role, and organization.
- It provides a dialog for creating and editing users, including assigning them to an organization and role.

### `src/pages/admin/ManageQuestions.tsx`

**Purpose:** This page is for managing the questions in the assessments.

**Content:**

- It allows administrators to select an assessment tool (template) and then manage the questions within each category of that tool.
- It provides a form for creating and editing questions, including the question text, type, and options.

### `src/pages/admin/ManageOrganizations.tsx`

**Purpose:** This page is for managing cooperative organizations.

**Content:**

- It displays a grid of all organizations with their name, location, and contact email.
- It provides a dialog for creating and editing organizations.

### `src/pages/admin/ManageCategories.tsx`

**Purpose:** This page is for managing the categories within the assessment tools.

**Content:**

- It allows administrators to select an assessment tool and then manage the categories within it, including their name, weight, and display order.

## `src/hooks` Directory

This directory contains custom React hooks used throughout the application.

### `src/hooks/useAuth.ts`

**Purpose:** This hook manages the application's authentication state.

**Content:**

- It provides the `AuthProvider` component, which uses the `AuthContext` to make the authentication state available to all its children.
- It also provides the `useAuth` hook, which can be used to access the authentication state and the `login`, `logout`, and `signup` functions.

### `src/hooks/use-toast.ts`

**Purpose:** This hook is for managing and displaying toast notifications.

**Content:**

- It uses a reducer to manage the state of the toasts.
- It provides a `toast` function for adding new toasts and a `dismiss` function for removing them.

### `src/hooks/use-mobile.tsx`

**Purpose:** This hook detects whether the user is on a mobile device.

**Content:**

- It uses `window.matchMedia` to check the screen width against a mobile breakpoint.

## `src/lib` Directory

This directory contains utility functions and other libraries.

### `src/lib/utils.ts`

**Purpose:** This file contains utility functions used throughout the application.

**Content:**

- It exports a `cn` function, which is a wrapper around `clsx` and `tailwind-merge` for merging Tailwind CSS classes.

## `src/components` Directory

This directory contains the reusable React components used in the application.

### `src/components/Navbar.tsx`

**Purpose:** The application's navigation bar.

**Content:**

- It displays the application logo, a language selector, and either a login button or a user menu, depending on the authentication state.

### `src/components/LoadingSpinner.tsx`

**Purpose:** A simple component for displaying a loading spinner.

**Content:**

- It can be customized with different sizes and optional text.

### `src/components/FeatureCard.tsx`

**Purpose:** A reusable card component for displaying features.

**Content:**

- It takes a title, description, icon, and color as props.

### `src/components/AuthProvider.tsx`

**Purpose:** This component provides the authentication context to the application.

**Content:**

- It wraps its children with the `AuthContext.Provider`, making the authentication state available throughout the application.

### `src/components/ui` Directory

This directory contains a large number of UI components, likely from a library like `shadcn/ui`. They are all well-structured and built on top of Radix UI primitives, providing a consistent and accessible set of building blocks for the application's UI.

The components include:

- `accordion.tsx`
- `alert-dialog.tsx`
- `alert.tsx`
- `avatar.tsx`
- `badge.tsx`
- `breadcrumb.tsx`
- `button.tsx`
- `calendar.tsx`
- `card.tsx`
- `carousel.tsx`
- `checkbox.tsx`
- `collapsible.tsx`
- `command.tsx`
- `context-menu.tsx`
- `dialog.tsx`
- `drawer.tsx`
- `dropdown-menu.tsx`
- `form.tsx`
- `hover-card.tsx`
- `input-otp.tsx`
- `input.tsx`
- `label.tsx`
- `menubar.tsx`
- `navigation-menu.tsx`
- `pagination.tsx`
- `popover.tsx`
- `progress.tsx`
- `radio-group.tsx`
- `resizable.tsx`
- `scroll-area.tsx`
- `select.tsx`
- `separator.tsx`
- `sheet.tsx`
- `sidebar.tsx`
- `skeleton.tsx`
- `slider.tsx`
- `sonner.tsx`
- `switch.tsx`
- `table.tsx`
- `tabs.tsx`
- `textarea.tsx`
- `toast.tsx`
- `toaster.tsx`
- `toggle-group.tsx`
- `toggle.tsx`
- `tooltip.tsx`
