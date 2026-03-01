// Constantes configuráveis
const CONFIG = {
    pMin: 0.05,           // conversão mínima (5%)
    pMax: 0.35,           // conversão máxima (35%)
    k: 4.0,               // inclinação da sigmoid
    rhoLimit: 1.05,       // limite de pressão crítica
    defaultTicket: 45.00  // fallback
};

const sigmoid = (rho, rho0) => {
    return CONFIG.pMin + (CONFIG.pMax - CONFIG.pMin) / (1 + Math.exp(CONFIG.k * (rho - rho0)));
};

export const calculateRevenueImpact = ({
    baseCoverage,        // { [hour]: N_base }
    currentCoverage,     // { [hour]: N_current }
    flowData,            // { entrantes, cupons, convReal } por hora
    salesData,           // venda por hora (opcional)
    dayKey,              // 'SABADO', etc
    mode,                // 'accumulated' | 'average'
    weekdayCounts        // { counts, daysMap }
}) => {
    const hours = Object.keys(flowData).map(Number).sort((a, b) => a - b);
    const results = [];

    let totalDeltaRevenue = 0;
    let totalDeltaCoupons = 0;
    let criticalHoursBefore = 0;
    let criticalHoursAfter = 0;
    let maxRhoBefore = 0;
    let maxRhoAfter = 0;

    // Normalizar fator
    const dayIndex = weekdayCounts?.daysMap?.[dayKey];
    const countFactor = (mode === 'average' && dayIndex !== undefined) ? weekdayCounts.counts[dayIndex] : 1;

    // Guard clause if countFactor is 0 (should not happen if day exists in range)
    if (countFactor === 0) {
        // Return zeroed result or handle gracefully
        return {
            deltaRevenue: 0,
            deltaCoupons: 0,
            deltaConversionPP: 0,
            criticalHoursBefore: 0,
            criticalHoursAfter: 0,
            maxRhoBefore: 0,
            maxRhoAfter: 0,
            breakdown: [],
            rho0: 0
        };
    }

    // Calcular conversão média real do dia (para calibrar rho0)
    let totalEntrantes = 0;
    let totalCupons = 0;
    hours.forEach(h => {
        const f = flowData[h].entrantes / countFactor;
        const c = flowData[h].cupons / countFactor;
        totalEntrantes += f;
        totalCupons += c;
    });
    const avgConvReal = totalEntrantes > 0 ? totalCupons / totalEntrantes : 0;

    // Calculate Avg Rho Base properly
    const totalBaseStaff = Object.values(baseCoverage).reduce((a, b) => a + b, 0);
    const avgRhoBase = totalBaseStaff > 0 ? totalEntrantes / totalBaseStaff : 1;

    // Calibrar rho0 (solução fechada)
    let rho0 = 0;
    if (avgConvReal > CONFIG.pMin && avgConvReal < CONFIG.pMax) {
        rho0 = avgRhoBase - (1 / CONFIG.k) * Math.log((CONFIG.pMax - avgConvReal) / (avgConvReal - CONFIG.pMin));
    } else {
        rho0 = avgRhoBase; // fallback neutro
    }

    hours.forEach(hour => {
        const F = flowData[hour].entrantes / countFactor; // fluxo normalizado
        const C_real = flowData[hour].cupons / countFactor;
        const N_base = baseCoverage[hour] || 0;
        const N_cur = currentCoverage[hour] || 0;

        // Pressões
        const rho_base = N_base > 0 ? F / N_base : 0; // Use 0 instead of 999 to avoid massive skew? Or keep 999 for critical check?
        // User spec used 999. I will use 999 but be careful.
        // Spec: "const rho_base = N_base > 0 ? F / N_base : 999;"
        // Wait, if N_base is 0, pressure is infinite. 

        const rho_base_val = N_base > 0 ? F / N_base : 999;
        const rho_cur_val = N_cur > 0 ? F / N_cur : 999;

        // Ticket médio
        let TM = CONFIG.defaultTicket;
        if (salesData && salesData[hour] > 0 && C_real > 0) {
            TM = (salesData[hour] / countFactor) / C_real;
        } else if (salesData) {
            // Fallback: ticket médio do dia
            const totalVenda = Object.values(salesData).reduce((a, b) => a + b, 0) / countFactor;
            TM = totalCupons > 0 ? totalVenda / totalCupons : CONFIG.defaultTicket;
        }

        // Projeções
        const p_real = F > 0 ? C_real / F : 0;
        const p_new = sigmoid(rho_cur_val, rho0);
        const C_new = F * p_new;
        const deltaC = C_new - C_real;

        // Horas críticas
        const isCriticalBase = rho_base_val > CONFIG.rhoLimit;
        const isCriticalCur = rho_cur_val > CONFIG.rhoLimit;
        if (isCriticalBase) criticalHoursBefore++;
        if (isCriticalCur) criticalHoursAfter++;

        // Receita (só recupera se era crítica no base e melhorou)
        // Spec: "Receita (só recupera se era crítica no base e melhorou)" -> Logic: if (isCriticalBase && deltaC > 0)
        // Wait, "e melhorou" technically means "and improved". 
        // If deltaC > 0, we have more coupons, so we improved conversion.
        // The previous implementation constraint: "Recuperada... apenas para horas críticas no cenário base."
        // So if it WAS critical, any improvement counts as recovered revenue.

        let deltaR = 0;
        if (isCriticalBase && deltaC > 0) {
            deltaR = deltaC * TM;
            totalDeltaRevenue += deltaR;
            totalDeltaCoupons += deltaC;
        }

        // Máximos (avoid 999 if it's just a placeholder for "infinite")
        // If 999, it skews "Max Pressure". Let's suppress 999 for max calculation if possible, or just accept it as "Infinite".
        // I will log it as is.
        maxRhoBefore = Math.max(maxRhoBefore, rho_base_val === 999 ? 0 : rho_base_val);
        maxRhoAfter = Math.max(maxRhoAfter, rho_cur_val === 999 ? 0 : rho_cur_val);

        results.push({
            hour,
            entrantes: F,
            N_base,
            N_cur,
            rho_base: rho_base_val,
            rho_cur: rho_cur_val,
            p_real,
            p_new,
            deltaC,
            ticketMedio: TM,
            deltaR,
            isCriticalBase
        });
    });

    // Delta de conversão em pontos percentuais
    const avgConvNew = totalEntrantes > 0 ?
        (totalCupons + totalDeltaCoupons) / totalEntrantes : 0;
    const deltaConversionPP = (avgConvNew - avgConvReal) * 100;

    return {
        deltaRevenue: totalDeltaRevenue,
        deltaCoupons: totalDeltaCoupons,
        deltaConversionPP,
        criticalHoursBefore,
        criticalHoursAfter,
        maxRhoBefore,
        maxRhoAfter,
        breakdown: results,
        rho0 // para debug
    };
};
