const CANONICAL_WEEK_DAYS = [
  'SEGUNDA',
  'TER\u00c7A',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'S\u00c1BADO',
  'DOMINGO',
];

const RAW_DAY_ALIASES = {
  SEGUNDA: 'SEGUNDA',
  'TER\u00c7A': 'TER\u00c7A',
  TERCA: 'TER\u00c7A',
  'TERÃ‡A': 'TER\u00c7A',
  'TERÃƒâ€¡A': 'TER\u00c7A',
  QUARTA: 'QUARTA',
  QUINTA: 'QUINTA',
  SEXTA: 'SEXTA',
  'S\u00c1BADO': 'S\u00c1BADO',
  SABADO: 'S\u00c1BADO',
  'SÃBADO': 'S\u00c1BADO',
  'SÃƒÂBADO': 'S\u00c1BADO',
  DOMINGO: 'DOMINGO',
};

export const ORDERED_WEEK_DAYS = CANONICAL_WEEK_DAYS;

export const WEEK_DAY_TO_EXCEL = {
  SEGUNDA: '1. Seg',
  ['TER\u00c7A']: '2. Ter',
  QUARTA: '3. Qua',
  QUINTA: '4. Qui',
  SEXTA: '5. Sex',
  ['S\u00c1BADO']: '6. Sab',
  DOMINGO: '7. Dom',
};

export const SHORT_DAY_TO_FULL = {
  SEG: 'SEGUNDA',
  TER: 'TER\u00c7A',
  QUA: 'QUARTA',
  QUI: 'QUINTA',
  SEX: 'SEXTA',
  SAB: 'S\u00c1BADO',
  DOM: 'DOMINGO',
};

export const normalizeDayName = (value) => {
  if (!value) return '';

  const raw = String(value).trim().toUpperCase();
  if (!raw) return '';

  if (RAW_DAY_ALIASES[raw]) {
    return RAW_DAY_ALIASES[raw];
  }

  const ascii = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return RAW_DAY_ALIASES[ascii] || ascii;
};

export const isSameDayName = (left, right) => normalizeDayName(left) === normalizeDayName(right);
