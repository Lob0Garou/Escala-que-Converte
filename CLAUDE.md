# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Escala-que-Converte" is a React-based workforce scheduling analytics dashboard that correlates employee schedules with sales performance. The application helps optimize staffing levels by analyzing hourly sales data (cupons) against employee availability to identify peak periods and understaffed hours.

## Development Commands

### Core Development
- `npm run dev` - Start Vite development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint for code quality

### Package Management
- `npm install` - Install all dependencies
- Package manager: npm (uses package-lock.json)

## Architecture & Structure

### Tech Stack
- **Frontend**: React 19 with Vite bundler
- **Styling**: Tailwind CSS with dark mode support
- **Charts**: Recharts for data visualization  
- **Icons**: Lucide React
- **File Processing**: SheetJS (XLSX) loaded dynamically from CDN

### Main Application Structure
- **Single Page Application**: All functionality contained in Dashboard.jsx
- **Component Architecture**: Functional components with hooks
- **State Management**: React useState with useMemo for performance
- **Theme System**: Light/dark mode with localStorage persistence

### Core Components & Functionality

#### Data Processing Engine (`src/Dashboard.jsx`)
- **File Upload System**: Drag-drop and click upload for Excel files (.xlsx/.xls)
- **Excel Processing**: Converts various time formats and handles Brazilian locale numbers
- **Data Correlation**: Matches employee schedules with hourly sales data
- **Performance Calculations**: Real-time staff coverage analysis per hour

#### Key Data Structures
- **cuponsData**: Sales data with hourly breakdown by day of week
- **escalaData**: Employee schedule data (ENTRADA, INTER, SAIDA times)
- **chartData**: Processed correlation data for visualization

#### UI Layout System
- **Responsive Design**: Mobile-first approach with lg breakpoints
- **Two-Column Layout**: Schedule table (left) + Insights & Charts (right)
- **Collapsible Upload**: Upload section becomes retractable after data load
- **Theme Switcher**: Dark/light mode toggle with system integration

#### Business Logic Components
- **Peak Analysis**: Identifies highest sales volume hours
- **Staff Coverage**: Calculates employee count per hour considering breaks
- **Insights Generator**: Provides actionable recommendations for scheduling
- **Export Functionality**: Excel export with analysis data

### State Management Patterns
- **File Upload States**: Separate error states for each file type
- **Loading States**: Global loading overlay during file processing
- **Theme Persistence**: localStorage integration for user preferences
- **Day Selection**: Dynamic filtering with abbreviated day buttons

### Data Processing Flow
1. **File Upload** → Excel parsing via SheetJS
2. **Data Validation** → Time format conversion and number parsing  
3. **Correlation Analysis** → Match schedules to sales data by day/hour
4. **Visualization Preparation** → Format data for Recharts
5. **Insights Generation** → Calculate peaks, gaps, and recommendations

## Development Notes

### Key Features
- **Multi-format Excel Support**: Handles various time and number formats
- **Real-time Analysis**: Immediate recalculation when day selection changes
- **Performance Optimized**: Uses useMemo for expensive calculations
- **Accessibility**: Proper semantic HTML and keyboard navigation
- **Error Handling**: Comprehensive error states for file processing

### Portuguese UI Language
- All user-facing text is in Portuguese (Brazil)
- Day names use full Portuguese format (SEGUNDA, TERÇA, etc.)
- Business terminology follows Brazilian conventions

### External Dependencies
- **SheetJS**: Loaded dynamically from CDN for Excel processing
- **Chart Colors**: Custom color schemes for business data visualization
- **Icons**: Lucide React provides consistent iconography

### Browser Compatibility
- Modern browser requirements due to ES6+ features
- File API support required for drag-drop functionality
- Local storage for theme persistence

## Code Conventions

### React Patterns
- Functional components with hooks throughout
- Custom hooks for complex state logic
- Memoization for performance-critical calculations
- Event handler optimization with useCallback

### CSS Architecture  
- Tailwind utility classes with custom CSS for specific needs
- CSS-in-JS for dynamic styling (chart themes)
- Responsive design with mobile-first approach
- Custom scrollbar styling for data tables

### Data Handling
- Robust Excel parsing with fallback handling
- Number localization for Brazilian format (comma decimals)
- Time format standardization across different Excel formats
- Error boundaries for file processing failures