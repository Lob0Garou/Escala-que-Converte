import { ORDERED_WEEK_DAYS, SHORT_DAY_TO_FULL, WEEK_DAY_TO_EXCEL } from './dayUtils';

export const diasSemana = WEEK_DAY_TO_EXCEL;

export const diasAbreviados = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

export const fullDayNames = SHORT_DAY_TO_FULL;

export const allDays = ORDERED_WEEK_DAYS;

export const MIN_FLUXO = 10;
export const STABLE_FLUXO_PCT = 0.15;
export const ALERT_DROP_PP = 2.0;
export const OPP_RISE_PP = 1.5;
