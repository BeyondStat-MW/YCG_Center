# BeyondStat Web

Modern dashboard for sports performance analysis, built with Next.js 16 and Supabase.

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```

2.  Set up environment variables:
     Copy `.env.example` to `.env.local` and fill in your Supabase credentials.

3.  Run the development server:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🏗 Architecture

### Tech Stack
-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Database**: Supabase (PostgreSQL)
-   **Styling**: Tailwind CSS
-   **UI Components**: Shadcn UI, Tremor (Charts)
-   **State Management**: React Query, Server Actions

### Directory Structure
-   `/src/app`: App Router pages and layouts.
-   `/src/components`: Reusable UI components.
    -   `/ui`: Shadcn primitives.
    -   `/dashboard`: Domain-specific components.
-   `/src/lib`: Utility functions and types.
-   `/src/utils/supabase`: Database client configuration.
