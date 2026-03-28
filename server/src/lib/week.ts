const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const getCurrentWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

export const resolveWeekStart = (weekStart?: string) => {
  if (!weekStart) return getCurrentWeekStart();
  if (!DATE_PATTERN.test(weekStart)) {
    throw new Error('weekStart deve seguir o formato YYYY-MM-DD.');
  }
  return weekStart;
};
