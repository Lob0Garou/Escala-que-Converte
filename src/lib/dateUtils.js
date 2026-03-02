export const countWeekdaysInRange = (startDate, endDate) => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Dom, Seg, Ter, Qua, Qui, Sex, Sab
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        const dayOfWeek = current.getDay(); // 0=Dom, 6=Sab
        counts[dayOfWeek]++;
        current.setDate(current.getDate() + 1);
    }

    return {
        counts,
        daysMap: {
            'DOMINGO': 0,
            'SEGUNDA': 1,
            'TERCA': 2,
            'QUARTA': 3,
            'QUINTA': 4,
            'SEXTA': 5,
            'SABADO': 6
        }
    };
};

export const countWeekdaysInMonth = (year, month, dayName) => {
    const normalizedDay = (dayName || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    const dayMap = {
        DOMINGO: 0,
        SEGUNDA: 1,
        TERCA: 2,
        QUARTA: 3,
        QUINTA: 4,
        SEXTA: 5,
        SABADO: 6,
    };

    const targetDay = dayMap[normalizedDay];
    if (targetDay == null) return 1;

    let count = 0;
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        if (date.getDay() === targetDay) count++;
        date.setDate(date.getDate() + 1);
    }

    return count || 1;
};
