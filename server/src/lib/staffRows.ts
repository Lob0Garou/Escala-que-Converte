const DAY_TO_DB: Record<string, string> = {
  SEGUNDA: 'SEGUNDA',
  TERCA: 'TERCA',
  ['TERÇA']: 'TERCA',
  QUARTA: 'QUARTA',
  QUINTA: 'QUINTA',
  SEXTA: 'SEXTA',
  SABADO: 'SABADO',
  ['SÁBADO']: 'SABADO',
  DOMINGO: 'DOMINGO',
};

const DAY_FROM_DB: Record<string, string> = {
  SEGUNDA: 'SEGUNDA',
  TERCA: 'TERÇA',
  QUARTA: 'QUARTA',
  QUINTA: 'QUINTA',
  SEXTA: 'SEXTA',
  SABADO: 'SÁBADO',
  DOMINGO: 'DOMINGO',
};

export type StaffRow = {
  id?: string;
  dia: string;
  nome?: string;
  entrada?: string | null;
  intervalo?: string | null;
  saida?: string | null;
  saidaDiaSeguinte?: boolean;
};

type ShiftRow = {
  id: string;
  employee_name: string | null;
  day_of_week: string;
  entrada: string | null;
  intervalo: string | null;
  saida: string | null;
  saida_dia_seguinte: boolean | null;
};

const normalizeDayName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase();

const normalizeTime = (value?: string | null) => value?.slice(0, 5) || null;

export const dbRowToStaffRow = (row: ShiftRow): StaffRow => ({
  id: row.id,
  dia: DAY_FROM_DB[row.day_of_week] || row.day_of_week,
  nome: row.employee_name || '',
  entrada: normalizeTime(row.entrada) || '',
  intervalo: normalizeTime(row.intervalo) || '',
  saida: normalizeTime(row.saida) || '',
  saidaDiaSeguinte: Boolean(row.saida_dia_seguinte),
});

export const staffRowToDbJson = (row: StaffRow, index: number) => ({
  employee_name: row.nome || '',
  day_of_week: DAY_TO_DB[normalizeDayName(row.dia)] || normalizeDayName(row.dia),
  entrada: normalizeTime(row.entrada),
  intervalo: normalizeTime(row.intervalo),
  saida: normalizeTime(row.saida),
  saida_dia_seguinte: Boolean(row.saidaDiaSeguinte),
  is_optimized: false,
  sort_order: index,
});
