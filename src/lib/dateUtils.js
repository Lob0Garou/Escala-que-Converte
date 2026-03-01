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
