const getTimeField = (person, primaryKey, fallbackKey) => {
    if (person == null || typeof person !== 'object') return '';
    if (person[primaryKey] != null) return person[primaryKey];
    if (person[fallbackKey] != null) return person[fallbackKey];
    return '';
};

const getHour = (timeValue) => {
    if (!timeValue || typeof timeValue !== 'string' || !timeValue.includes(':')) return null;
    const hour = parseInt(timeValue.split(':')[0], 10);
    return Number.isFinite(hour) ? hour : null;
};

export const calculateStaffByHour = (staffList, minHour, maxHour) => {
    const result = {};
    if (!Array.isArray(staffList) || staffList.length === 0) return result;

    let localMinHour = Number.isFinite(minHour) ? Number(minHour) : null;
    let localMaxHour = Number.isFinite(maxHour) ? Number(maxHour) : null;

    if (localMinHour == null || localMaxHour == null) {
        const hours = [];
        staffList.forEach((person) => {
            const entrada = getHour(getTimeField(person, 'entrada', 'ENTRADA'));
            const saida = getHour(getTimeField(person, 'saida', 'SAIDA'));
            if (entrada == null || saida == null) return;
            hours.push(entrada, saida);
        });
        localMinHour = localMinHour == null ? (hours.length ? Math.min(...hours) : 0) : localMinHour;
        localMaxHour = localMaxHour == null ? (hours.length ? Math.max(...hours) : 23) : localMaxHour;
    }

    for (let hour = localMinHour; hour <= localMaxHour; hour++) {
        result[hour] = 0;
    }

    staffList.forEach((person) => {
        const entradaValue = getTimeField(person, 'entrada', 'ENTRADA');
        const saidaValue = getTimeField(person, 'saida', 'SAIDA');

        if (!entradaValue || !saidaValue || String(entradaValue).toUpperCase() === 'FOLGA') return;

        const entradaHour = getHour(String(entradaValue));
        let saidaHour = getHour(String(saidaValue));
        if (entradaHour == null || saidaHour == null) return;
        if (saidaHour < entradaHour) saidaHour += 24;

        const intervaloValue = getTimeField(person, 'intervalo', 'INTER');
        const intervaloHour = intervaloValue ? getHour(String(intervaloValue)) : null;

        for (let hour = entradaHour; hour < saidaHour; hour++) {
            const normalizedHour = hour >= 24 ? hour - 24 : hour;
            if (normalizedHour < localMinHour || normalizedHour > localMaxHour) continue;
            if (intervaloHour != null && normalizedHour === intervaloHour) continue;
            result[normalizedHour] = (result[normalizedHour] || 0) + 1;
        }
    });

    return result;
};

export default calculateStaffByHour;
