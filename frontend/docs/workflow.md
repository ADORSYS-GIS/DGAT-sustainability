# CI/CD Workflow Documentation

This document provides a detailed explanation of the Continuous Integration (CI) workflow for this project, as defined in the `.github/workflows/analyses.yml` file.

## Workflow Trigger

The workflow is automatically triggered on:

- A `push` to the `main` branch.
- A `pull_request` targeting the `main` branch.

## Jobs

The workflow consists of several jobs that run in a specific order to ensure code quality and stability.

### 1. `install`

This is the foundational job that all other jobs depend on.

- **Purpose**: To install all project dependencies and cache them for subsequent jobs.
- **Runner**: `ubuntu-latest`
- **Steps**:
  1.  **Checkout Code**: The `actions/checkout@v4` action checks out the repository's code.
  2.  **Install Dependencies**: `npm ci` is used to perform a clean and deterministic installation of all dependencies listed in `package-lock.json`.
  3.  **Cache `node_modules`**: The `actions/cache@v4` action caches the `node_modules` directory. This significantly speeds up subsequent jobs by allowing them to reuse the installed dependencies instead of re-installing them. The cache is keyed by the Git commit SHA (`${{ github.sha }}`), ensuring that each commit has a unique cache.

### 2. `build`

This job verifies that the project can be successfully built for production.

- **Dependencies**: `install`
- **Runner**: `ubuntu-latest`
- **Steps**:
  1.  **Checkout Code**
  2.  **Restore Cached `node_modules`**: Retrieves the cached dependencies from the `install` job.
  3.  **Run Build**: Executes `npm run build`, which uses Vite to compile the TypeScript and React code into static assets ready for deployment.

### 3. `lint`

This job checks the code for stylistic and programmatic errors using ESLint.

- **Dependencies**: `install`
- **Runner**: `ubuntu-latest`
- **Steps**:
  1.  **Checkout Code**
  2.  **Restore Cached `node_modules`**
  3.  **Run ESLint**: Executes `npm run lint:check` (`eslint . --max-warnings 0`), which scans the entire codebase for linting issues and fails if any warnings are found.

### 4. `prettier`

This job ensures that all code adheres to the defined formatting standards using Prettier.

- **Dependencies**: `install`
- **Runner**: `ubuntu-latest`
- **Steps**:
  1.  **Checkout Code**
  2.  **Restore Cached `node_modules`**
  3.  **Run Prettier**: Executes `npm run prettier:check` (`prettier --check .`), which checks if all files are correctly formatted. If any file needs reformatting, the job will fail.

### 5. `typescript`

This job performs a static type check on the entire codebase using the TypeScript compiler.

- **Dependencies**: `install`
- **Runner**: `ubuntu-latest`
- **Steps**:
  1.  **Checkout Code**
  2.  **Restore Cached `node_modules`**
  3.  **Run TypeScript Check**: Executes `npm run ts:check` (`tsc --noEmit`), which type-checks the project without generating any JavaScript files. This helps catch type-related errors before they make it into production.

### 6. `unit_tests`

This job runs all unit tests and generates a code coverage report.

- **Dependencies**: `install`
- **Runner**: `ubuntu-latest`
- **Steps**:
  1.  **Checkout Code**
  2.  **Restore Cached `node_modules`**
  3.  **Add Env Variables**: Sets up any necessary environment variables for the tests.
  4.  **Run Unit Tests**: Executes `npm run test:unit` (`vitest`) to run all unit tests.
  5.  **Generate Coverage Report**: Runs `npm run coverage` (`vitest run --coverage`) to generate a code coverage report.
  6.  **Upload Coverage Report**: The `actions/upload-artifact@v4` action uploads the generated `coverage` directory as a build artifact named `coverage-report`. This allows the report to be downloaded and inspected later.

### 7. `sonarqube`

This job is currently disabled but is configured to perform a SonarQube analysis.

- **Purpose**: To analyze the code for bugs, vulnerabilities, and code smells, and then send the report to a SonarQube server for detailed inspection.
- **Dependencies**: `build`, `unit_tests`
- **Steps**:
  1.  **Checkout Code**: Fetches the full commit history (`fetch-depth: 0`) which is required for SonarQube analysis.
  2.  **Download Coverage Report**: Downloads the `coverage-report` artifact created by the `unit_tests` job.
  3.  **Run SonarQube Analysis**: Uses the `sonarsource/sonarqube-scan-action@v3` to run the analysis, using the downloaded coverage report and secrets for authentication.
  4.  **Check Quality Gate**: The `sonarsource/sonarqube-quality-gate-action@master` action can be used to fail the CI pipeline if the code does not meet the defined quality standards in SonarQube.
