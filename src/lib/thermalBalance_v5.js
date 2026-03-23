// src/lib/thermalBalance_v5.js
/**
 * thermalBalance_v5.js
 * ENGINE: ANTIGRAVITY MOTOR V5.0
 *
 * 3 fases: Shift Suggestion → Coordinate Descent 15min → Opportunity Weighting
 *
 * Drop-in replacement para V4. Mesma interface pública.
 */

// Re-exportar computeThermalMetrics e thresholds do V4 (não mudam)
export { computeThermalMetrics, THERMAL_THRESHOLDS, formatThermalIndex, formatPressure } from './thermalBalance.js';

// Por agora, re-exportar otimização do V4 (será substituída nos próximos tasks)
export { optimizeScheduleRows, optimizeAllDays } from './thermalBalance.js';
