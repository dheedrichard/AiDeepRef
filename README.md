# DeepRef Project

## Overview
DeepRef is a professional reference verification platform with AI-powered context analysis. The platform serves two primary user types: **Seekers** (those requesting references) and **Referrers** (those providing references).

## Project Structure

```
AiDeepRef/
├── DeepRef/                    # Main Angular application (v20)
│   ├── src/                    # Application source code
│   ├── public/                 # Static assets
│   └── package.json            # Angular dependencies
│
├── DEVROOM/                    # Documentation & Specifications
│   ├── DeepRef-Architecture-Orchestration-Plan.md
│   ├── DeepRef-Design-System.md
│   ├── DeepRef-Frame-Specifications.md
│   ├── DeepRef-User-Flows.md
│   ├── DeepRef-Wireframes-Visual.md
│   └── Whimsical/             # Additional design documentation
│
├── frames_sep29/               # UI Design Mockups (PNG)
│   └── [24 design frames]      # Wireframes for all user flows
│
├── .claude/                    # Claude Code configuration
│   ├── knowledge/              # Knowledge base for AI assistant
│   └── ORCHESTRATOR_INSTRUCTIONS.md
│
└── package.json                # Playwright MCP dependencies
```

## Key Features

### Authentication Flow
- Welcome screen
- Sign up / Sign in
- Email verification
- Password creation

### Seeker Features
- Dashboard for managing reference requests
- Profile setup and management
- Contact management
- ID verification (upload, selfie, status tracking)
- AI-powered reference context creation
- Reference request review and sending

### Referrer Features
- Dashboard for managing reference responses
- Reference request handling

## Technology Stack

### Frontend (DeepRef/)
- **Framework:** Angular 20
- **UI Framework:** Tailwind CSS 4.1
- **Charts:** ApexCharts, amCharts5
- **Calendar:** FullCalendar
- **Additional:** Swiper, Flatpickr, PrismJS

### Development Tools
- **Testing:** Playwright (via MCP)
- **AI Assistant:** Claude Code with custom orchestrator
- **Package Manager:** npm

## Getting Started

### Prerequisites
- Node.js (compatible with Angular 20)
- npm

### Installation

1. Install DeepRef Angular application:
```bash
cd DeepRef
npm install
```

2. Install Playwright MCP (optional, for testing):
```bash
npm install
```

### Running the Application

```bash
cd DeepRef
npm start
```

The application will be available at `http://localhost:4200`

### Build for Production

```bash
cd DeepRef
npm run build
```

## Documentation

All project documentation is located in the `DEVROOM/` directory:

- **Architecture Plan:** Development workflow using git worktrees and AI agents
- **Design System:** Colors, typography, spacing, components
- **Frame Specifications:** Detailed specs for all 24+ UI frames
- **User Flows:** Complete user journey documentation
- **Wireframes:** Visual documentation of all screens

## Design Assets

Design mockups (PNG format) are available in `frames_sep29/` directory, including:
- Authentication screens
- Seeker dashboard and workflows
- Referrer dashboard
- ID verification flow
- Reference request creation and management

## Development Workflow

This project uses a specialized development workflow with:
- Git worktrees for parallel development
- Multiple AI agents for different swimlanes (AUTH, SEEKER, REFERRER)
- Orchestrator agents for quality control
- Playwright MCP for automated visual testing

See `DEVROOM/DeepRef-Architecture-Orchestration-Plan.md` for details.

## License

ISC
