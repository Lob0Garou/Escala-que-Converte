export const fmtDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value),
      )
    : 'Sem registro';

export const fmtDate = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
        new Date(`${value}T00:00:00`),
      )
    : 'Sem periodo';

export const fmtMoney = (value) =>
  value === null || value === undefined
    ? 'N/A'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(Number(value));

export const fmtScore = (value) =>
  value === null || value === undefined ? 'N/A' : Number(value).toFixed(1);

export default {
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtScore,
};
