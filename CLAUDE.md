# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Escala-que-Converte is a React + Vite dashboard for retail workforce scheduling analysis (Centauro context). It correlates hourly flow/coupon/sales data with staff schedules to identify coverage gaps and estimated revenue impact.

## Development Commands

### Core Development
- `npm run dev` - Start Vite development server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests (Node test runner)

### Package Management
- `npm install` - Install dependencies
- Package manager: npm (lockfile present)

## Tech Stack

- Frontend: React 19 + Vite
- Styling: Tailwind CSS + custom CSS variables
- Charts: Recharts
- Icons: Lucide React
- File processing: SheetJS (`xlsx` package)

## Current Architecture

### Entry Points
- `src/App.jsx` -> imports `src/features/dashboard/Dashboard.jsx`
- `src/features/dashboard/Dashboard.jsx` -> orchestrator component (state wiring only)

### Hooks
- `src/hooks/useFileProcessing.js`
- `src/hooks/useStaffData.js`
- `src/hooks/useChartData.js`
- `src/hooks/useThermalMetrics.js`
- `src/hooks/useRevenueCalculation.js`

### Lib / Domain Utilities
- `src/lib/parsers.js`
- `src/lib/staffUtils.js`
- `src/lib/insightEngine.js`
- `src/lib/thermalBalance.js`
- `src/lib/revenueEngine.js`
- `src/lib/dateUtils.js`
- `src/lib/constants.js`
- `src/lib/centauro_brand_assets.js`

### UI Component Structure
- `src/components/layout/`
- `src/components/upload/`
- `src/components/chart/`
- `src/components/insights/`
- `src/components/staff/`
- `src/components/weekly/`
- `src/components/ui/`
- `src/components/dashboard/MainContent.jsx`

## Data Flow (High Level)

1. User uploads files (flow, schedule, sales) via upload components.
2. `useFileProcessing` parses spreadsheets and emits normalized data.
3. `useStaffData` stores and edits schedule rows, including optimization toggles.
4. `useChartData` computes daily and chart-ready metrics.
5. `useThermalMetrics` computes thermal score/hotspot summaries.
6. `useRevenueCalculation` estimates financial impact from baseline vs current coverage.
7. Presentational components render charts, KPI cards, thermal panel, staff list, and weekly print view.

## Notes

- UI text is in Portuguese (Brazil).
- Day names are expected in Portuguese (`SEGUNDA`, `TERCA/TERCA`, `SABADO/SABADO`, etc.).
- Keep visual classes stable when refactoring to avoid regressions.
