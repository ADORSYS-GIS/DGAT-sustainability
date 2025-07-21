# Sustainability Assessment Tool

## Project Overview

This project is a Sustainability Assessment Tool built with Vite, TypeScript, Tailwind CSS, and shadcn-ui. It features a modern HomePage and tools for sustainability assessment, ready for further extension.

## Features

- Modern, responsive HomePage UI
- Built with React, Vite, and TypeScript
- Styled using Tailwind CSS and shadcn-ui components
- Minimal dependencies and codebase
- Ready for rapid customization and extension

## Tech Stack

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn-ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm (v9+ recommended)

### Installation

```sh
# Clone the repository
git clone <your-sustainability-tool-repo>
cd sustainability-tool/frontend

# Install dependencies
npm install
```

### Development

```sh
npm run dev
```

The app will be available at [http://localhost:8080](http://localhost:8080) by default.

### Build for Production

```sh
npm run build
```

The production-ready files will be in the `dist/` directory.

### Preview Production Build

```sh
npm run preview
```

### Linting & Formatting

```sh
npm run lint        # Lint the codebase
npm run prettier:check # Check code formatting
```

### Type Checking

```sh
npm run ts:check
```

### Testing

```sh
npm run test:unit
```

## Project Structure

```
frontendcopy/
├── src/
│   ├── components/         # Shared and UI components
│   ├── hooks/              # Custom hooks
│   ├── pages/              # HomePage and LoginPage
│   ├── services/           # Minimal services for auth
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   ├── assets/             # Static assets (images, icons, fonts)
│   ├── i18n/               # Internationalization (optional)
│   ├── styles/             # Global styles (if present)
│   └── App.tsx, main.tsx   # App entry points
├── public/                 # Static public files
├── package.json            # Project config
├── vite.config.ts          # Vite config
└── README.md               # This file
```

## License

This project is open source and available under the [MIT License](./LICENSE).
