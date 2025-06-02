# Time Tracker App

A full-stack time tracking application built with TanStack Start and Convex. Track time for different clients and projects with comprehensive reporting.

## Features

### ⏱️ Time Tracking

- **Start/Stop Timer**: Simple one-click time tracking with real-time counter
- **Client & Project Selection**: Organize time entries by client and project
- **Task Descriptions**: Add optional descriptions to time entries
- **Prevent Overlaps**: Automatically stops any running timer when starting a new one

### 📊 Real-time Reporting

- **Daily Summary**: View today's time broken down by client and project
- **Weekly Overview**: See total time tracked for the current week
- **Custom Date Ranges**: Generate reports for any date range
- **Detailed Breakdowns**: Drill down from client totals to individual time entries

### 🏢 Client & Project Management

- **Client Management**: Add, edit, and activate/deactivate clients
- **Project Organization**: Create projects under clients with descriptions
- **Active/Inactive Status**: Control which clients and projects appear in selectors

## Tech Stack

- **Frontend**: TanStack Start (React + TypeScript)
- **Backend**: Convex (serverless database + real-time sync)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query with Convex integration

## Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up Convex**:

   ```bash
   npx convex dev
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser** to `http://localhost:3000`

## Database Schema

### Tables

- **clients**: Client information with active status
- **projects**: Projects linked to clients with descriptions
- **timeEntries**: Time tracking records with start/end times and durations

### Key Features

- **Real-time sync**: All data updates immediately across browser tabs
- **Automatic seeding**: Sample data created on first run
- **Optimistic updates**: UI responds instantly to user actions

## Usage

### Tracking Time

1. Select a client from the dropdown
2. Choose a project for that client
3. Optionally add a description
4. Click **Start** to begin tracking
5. Click **Stop** when finished

### Viewing Reports

- **Tracker Tab**: See today's and this week's totals
- **Reports Tab**: Generate custom date range reports with filtering
- **Manage Tab**: Add new clients and projects

### Managing Data

- Add new clients with descriptions
- Create projects under existing clients
- Activate/deactivate clients and projects as needed

## Development

The application uses modern development practices:

- **Type Safety**: Full TypeScript coverage
- **Real-time Updates**: Convex provides automatic data synchronization
- **Component Architecture**: Modular React components with clear separation
- **Modern Styling**: Tailwind CSS for responsive design

## Architecture

```
src/
├── components/           # React components
│   ├── TimeTracker.tsx  # Main timer interface
│   ├── TimeReports.tsx  # Reporting interface
│   └── ClientProjectManager.tsx  # Admin interface
├── routes/              # File-based routing
└── convex/              # Backend logic
    ├── schema.ts        # Database schema
    └── timeTracking.ts  # Queries and mutations
```

The application follows a clean architecture with:

- **Real-time data flow** from Convex to React components
- **Optimistic updates** for instant UI feedback
- **Type-safe APIs** between frontend and backend
- **Responsive design** that works on all devices
