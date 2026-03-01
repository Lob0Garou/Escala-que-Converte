/**
 * revenueModel.js
 * Core logic for Revenue Vision: Sigmoid calibration and financial projections.
 */

// Calibrates the Sigmoid curve based on the day's actual performance
export function calibrateSigmoid(currentPressure, currentConversion, minProb, maxProb) {
    // Formula: rho_0 = rho_avg - (1/k) * ln( (C_real - p_min) / (p_max - C_real) )

    // Guards to prevent Math domain errors
    if (currentConversion <= minProb) currentConversion = minProb + 0.001;
    if (currentConversion >= maxProb) currentConversion = maxProb - 0.001;

    // k represents the steepness. Normalized to roughly 2.0-3.0 for this domain.
    const k = 2.5;

    const term = Math.log((currentConversion - minProb) / (maxProb - currentConversion));
    const midpoint = currentPressure - (1 / k) * term;

    return { k, midpoint, minProb, maxProb };
}

// Projects new conversion rate for a given new pressure
export function predictConversion(newPressure, params) {
    const { k, midpoint, minProb, maxProb } = params;
    const exponent = -k * (newPressure - midpoint);
    const sigmoidValue = 1 / (1 + Math.exp(exponent));
    return minProb + (maxProb - minProb) * sigmoidValue;
}

// Calculates financial impact metrics
export function calculateRevenueImpact(
    hourlyData, // [{ pressure, conversion, flow, sales, ... }]
    criticalPressureThreshold = 1.05,
    defaultTicket = 0
) {
    let totalRecoveredRevenue = 0;
    let totalAdditionalCoupons = 0;
    let criticalHoursBefore = 0;
    let criticalHoursAfter = 0;
    let maxPressureBefore = 0;
    let maxPressureAfter = 0;
    let riskValue = 0;

    hourlyData.forEach(hour => {
        // Current State (Real)
        const pReal = hour.pressureReal || 0;
        const cReal = hour.conversionReal / 100; // stored as percentage 0-100 usually
        const flow = hour.flow || 0;

        // Optimized State
        const pNew = hour.pressureOptimized || 0;

        // Track Metrics
        if (pReal > criticalPressureThreshold) criticalHoursBefore++;
        if (pNew > criticalPressureThreshold) criticalHoursAfter++;
        if (pReal > maxPressureBefore) maxPressureBefore = pReal;
        if (pNew > maxPressureAfter) maxPressureAfter = pNew;

        // Financial Calculation only for Critical Hours (as per requirement: "apenas para horas críticas")
        if (pReal > criticalPressureThreshold) {
            // Calibrate Curve for this hour's specific performance context? 
            // Usually better to calibrate on daily average or use the hour's own point if robust.
            // Let's assume we calibrate per hour to respect the "local" reality of that timeframe
            // OR we use a global daily calibration. The prompt says "calibrar curva na conversão média real do dia".
            // So we should pass the daily params.

            // However, if we pass daily params, we use them here.
            // Let's assume the caller passes the projected conversion.

            const cNew = hour.projectedConversion / 100;
            const deltaC = cNew - cReal; // Difference in probability

            // Calculate Gains
            if (deltaC > 0) {
                const additionalCoupons = flow * deltaC;
                const ticket = hour.ticket || defaultTicket;
                totalRecoveredRevenue += additionalCoupons * ticket;
                totalAdditionalCoupons += additionalCoupons;
            } else {
                // Risk Analysis (Piora)
                const lostCoupons = flow * deltaC; // negative
                const ticket = hour.ticket || defaultTicket;
                riskValue += lostCoupons * ticket;
            }
        }
    });

    return {
        recoveredRevenue: totalRecoveredRevenue,
        additionalCoupons: totalAdditionalCoupons,
        criticalHoursBefore,
        criticalHoursAfter,
        maxPressureBefore,
        maxPressureAfter,
        riskValue
    };
}

// Helper to extract weekday count from date range
export function calculateWeekdayCounts(dateStrings) {
    // dateStrings format: "DD/MM/YYYY" or Date objects
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Dom(0) to Sab(6) matches JS getDay()

    dateStrings.forEach(dateStr => {
        if (!dateStr) return;
        // Parse BR Date
        let date;
        if (typeof dateStr === 'string') {
            const [d, m, y] = dateStr.split(/[/.-]/);
            if (d && m && y) date = new Date(y, m - 1, d);
        } else {
            date = dateStr;
        }

        if (date && !isNaN(date)) {
            counts[date.getDay()]++;
        }
    });

    return counts;
}

export function parseDatePeriod(text) {
    const regex = /(\d{2}[/.-]\d{2}[/.-]\d{4})/g;
    const matches = [...text.matchAll(regex)];
    if (matches.length >= 2) {
        return {
            start: matches[0][0], // First date found
            end: matches[matches.length - 1][0] // Last date found
        };
    }
    return null;
}
