# Coding Standards

To maintain code quality, consistency, and readability across the project, we use several tools to enforce a common set of standards. All developers are expected to adhere to these standards, which are automatically checked in our CI pipeline.

## Tools

### 1. [Prettier](https://prettier.io/)

- **Purpose**: Prettier is an opinionated code formatter that ensures a consistent code style across the entire codebase. It automatically reformats code to match a defined style guide, eliminating debates over formatting.
- **Configuration**: The formatting rules are defined in the `.prettierrc` file (or within `package.json`).
- **Usage**:
  - To check if all files are correctly formatted, run:
    ```bash
    npm run prettier:check
    ```
  - To automatically format all files, you can add a script like:
    ```json
    "scripts": {
      "prettier:fix": "prettier --write ."
    }
    ```

### 2. [ESLint](https://eslint.org/)

- **Purpose**: ESLint is a static analysis tool that identifies and reports on problematic patterns found in JavaScript and TypeScript code. It helps catch common errors, enforce best practices, and improve code quality.
- **Configuration**: The rules are configured in the `.eslintrc.*` file.
- **Usage**:
  - To run ESLint and check for issues, use:
    ```bash
    npm run lint
    ```
  - The CI pipeline runs `npm run lint:check`, which will fail if any warnings or errors are present.

### 3. [TypeScript](https://www.typescriptlang.org/)

- **Purpose**: TypeScript adds static typing to JavaScript, which helps catch type-related errors during development rather than at runtime.
- **Configuration**: The TypeScript compiler options are defined in `tsconfig.json`.
- **Usage**:
  - To perform a type-check on the entire project, run:
    ```bash
    npm run ts:check
    ```
    This command will report any type errors without creating any output files.
