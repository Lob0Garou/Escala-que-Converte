export const computeCriticalDrops = (data) => {
    if (!data || data.length < 2) return { criticalDrops: 0, horasCriticas: [] };
    const drops = [];

    for (let i = 1; i < data.length; i++) {
        const current = data[i];
        const prev = data[i - 1];
        const delta = (Number(current.conversao) || 0) - (Number(prev.conversao) || 0);
        if (delta < 0) drops.push({ hora: `${current.hora}h`, delta });
    }

    const topDrops = drops.sort((a, b) => a.delta - b.delta).slice(0, 2);
    return {
        criticalDrops: topDrops.length,
        horasCriticas: topDrops.map((drop) => drop.hora),
    };
};

export default computeCriticalDrops;
