# CRM Support AI

A "All-in-One" web application for technical service management, live tracking, and AI-assisted report generation using Google Gemini.

## Features

- **Sales Dashboard**: Quick ticket creation and real-time tracking.
- **Technician Dashboard**: Ticket management and AI-powered report generation.
- **Admin Dashboard**: KPIs and metrics monitoring.
- **Role-based Access**: Separate views for Sales, Technicians, and Admins.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Lucide React.
- **Backend**: Supabase (PostgreSQL, Auth, Realtime).
- **AI**: Google Generative AI (Gemini 1.5 Flash).

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Google Cloud project with Gemini API enabled

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd crm-support-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory and add your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. Database Setup:
   Run the SQL script provided in `types/database.ts` (or the prompt) in your Supabase SQL Editor to create the necessary tables.

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Demo Mode

The application includes a "Dev Login" mode that allows you to test the different roles without setting up Supabase Auth users immediately. Just click the buttons on the landing page to enter as Sales, Technician, or Admin.

## Deployment

The easiest way to deploy is using [Vercel](https://vercel.com/new).
