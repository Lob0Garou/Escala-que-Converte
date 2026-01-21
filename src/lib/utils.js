import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// FORMATADORES DE DADOS
export const excelTimeToString = (serial) => {
  if (!serial) return "";
  if (typeof serial === 'string') return serial;
  // Excel time is fraction of day (e.g. 0.5 = 12:00)
  const totalSeconds = Math.round(serial * 24 * 60 * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const parseNumber = (value) => {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/,/g, '')) || 0;
  }
  return parseFloat(value) || 0;
};

export const findAndParseConversion = (cupom) => {
  const conversaoValue = cupom['% Conversão'];
  if (conversaoValue == null || conversaoValue === '') return 0;
  const numericValue = parseFloat(conversaoValue);
  if (isNaN(numericValue)) return 0;
  return numericValue < 1 ? numericValue * 100 : numericValue;
};

export const parseFluxValue = (value) => {
  if (typeof value === 'string') {
    return parseFloat(value.replace('.0%', '')) || 0;
  }
  return parseFloat(value) || 0;
};
