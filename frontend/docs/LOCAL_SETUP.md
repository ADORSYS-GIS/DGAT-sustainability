# Local Development Setup

This guide provides instructions for setting up and running the project on your local machine for development and testing purposes.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher is recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Installation

1.  **Clone the Repository**

    Clone the project repository to your local machine:

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies**

    Install all the project dependencies using `npm`:

    ```bash
    npm install
    ```

    This will download all the necessary packages defined in `package.json` into the `node_modules` directory.

## Running the Application

Once the installation is complete, you can run the application in development mode:

```bash
npm run dev
```

This command starts the Vite development server. You can now view the application in your browser at the local URL provided (usually `http://localhost:5173`). The server supports Hot Module Replacement (HMR), so changes you make to the source code will be reflected in the browser instantly.

## Available Scripts

Here are the most important scripts defined in `package.json`:

- `npm run dev`: Starts the development server.
- `npm run build`: Compiles the application for production. The output is placed in the `dist/` directory.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run lint:check`: Runs ESLint and fails if any warnings or errors are found (used in CI).
- `npm run prettier:check`: Checks code formatting with Prettier.
- `npm run ts:check`: Performs a TypeScript type check without generating JavaScript files.
- `npm run test:unit`: Runs all unit tests using Vitest.
- `npm run coverage`: Runs unit tests and generates a code coverage report.
- `npm run preview`: Starts a local server to preview the production build from the `dist/` directory.
