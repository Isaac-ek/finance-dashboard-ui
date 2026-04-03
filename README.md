# Finance Dashboard UI

A polished finance dashboard built with React, Vite, Tailwind CSS, Zustand, and Recharts. The app focuses on frontend architecture, state-driven UI updates, responsive layout design, and role-aware interactions using mock financial data.

## Component Architecture

```text
App
|-- Header
|-- Summary Cards
|-- TrendChart
|-- InsightsPanel
|-- TransactionsTable
|-- CategoryChart
`-- TransactionModal
```

### Global State Shape

```ts
{
  transactions: Transaction[];
  role: "viewer" | "admin";
  theme: "light" | "dark";
  filters: {
    search: string;
    type: "all" | "income" | "expense";
    sortBy: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
  };
}
```

## Recommended Folder Structure

```text
finance-dashboard-ui/
|-- index.html
|-- package.json
|-- postcss.config.js
|-- tailwind.config.js
|-- tsconfig.app.json
|-- tsconfig.json
|-- tsconfig.node.json
|-- vite.config.ts
`-- src/
    |-- App.tsx
    |-- index.css
    |-- main.tsx
    |-- components/
    |   |-- CategoryChart.tsx
    |   |-- EmptyState.tsx
    |   |-- Header.tsx
    |   |-- InsightsPanel.tsx
    |   |-- SummaryCard.tsx
    |   |-- TransactionModal.tsx
    |   |-- TransactionsTable.tsx
    |   `-- TrendChart.tsx
    |-- data/
    |   `-- mockTransactions.json
    |-- lib/
    |   |-- analytics.ts
    |   `-- format.ts
    |-- store/
    |   `-- useFinanceStore.ts
    `-- types/
        `-- finance.ts
```

## Features

- Dashboard overview with summary cards for balance, income, and expenses
- Responsive area chart showing the last 6 months of income and expense trend
- Doughnut-style category chart for expense distribution
- Search, sort, and type filtering for the transactions table
- Graceful empty state when filters return no results
- Simulated RBAC with `Viewer` and `Admin` roles
- Admin-only add, edit, and delete transaction controls
- Insights panel with highest monthly spending category and month-over-month comparison
- Dark mode toggle
- `localStorage` persistence for transactions, role, theme, and filters
- Subtle entry and modal animations

## How This Meets the Assignment

### 1. Dashboard Overview

- The main dashboard includes summary cards for total balance, total income, and total expenses
- A time-based chart shows financial movement across the last 6 months
- A categorical chart shows how expenses are distributed across spending categories

### 2. Transactions Section

- The transactions table displays `Date`, `Amount`, `Category`, and `Type`
- Search, sorting, and filtering are supported for quick exploration
- A graceful empty state appears when no transactions match the active filters

### 3. Basic Role-Based UI

- A frontend-only role toggle allows switching between `Viewer` and `Admin`
- `Viewer` can inspect dashboard data and interact with filters
- `Admin` can add, edit, and delete transactions through the modal and table actions

### 4. Insights Section

- The insights panel highlights the highest spending category for the current month
- It also shows a month-over-month spending comparison based on the mock dataset

### 5. State Management

- Zustand is used to manage transactions, filters, role selection, and theme mode globally
- UI components update automatically from shared store state

### 6. UI and UX Expectations

- The dashboard is responsive across mobile, tablet, and desktop layouts
- The design emphasizes readability, whitespace, clear hierarchy, and smooth interactions
- Empty and filtered-no-result states are handled cleanly

### Optional Enhancements Included

- Dark mode
- Persistent data with `localStorage`
- Subtle animations and transitions

## Technical Choices

- **Vite + React + TypeScript:** Fast local development with a clean component structure and strong typing
- **Tailwind CSS:** Rapid styling with responsive utilities and reusable panel/input classes
- **Zustand:** Minimal global store for transactions, theme, role, and filters without excessive boilerplate
- **Recharts:** Clean React-native chart primitives for trend and category visualizations
- **Lucide React:** Lightweight icon set with good visual consistency

## Mock Data

The seed dataset lives in [src/data/mockTransactions.json](/Users/user/Documents/New project/src/data/mockTransactions.json) and includes salary, rent, groceries, transport, healthcare, entertainment, travel, and side-hustle transactions across several months.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## RBAC Behavior

- **Viewer:** Can search, sort, filter, and inspect charts
- **Admin:** Gains an `Add Transaction` button plus edit/delete controls in the transactions table

## Persistence Details

Zustand's `persist` middleware stores transactions, theme mode, the selected role, and active table filters in `localStorage`, so UI changes survive a page refresh.

## Notes

- The app uses mock data only; no backend or authentication is required
- The default currency formatter is set to USD for clarity, but it can be swapped easily in `src/lib/format.ts`

## Submission Summary

This project is a frontend-only finance dashboard built to demonstrate UI design, component structure, data handling, and state management. It uses mock transaction data and simulates role-based behavior entirely on the client side.

The submission includes a dashboard overview, transaction exploration tools, role-aware UI changes, calculated financial insights, responsive layouts, and polished UX touches such as dark mode, persistence, and transitions. The goal was to keep the implementation clean, modular, and easy to evaluate rather than overly complex.
