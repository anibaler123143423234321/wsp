/**
 * Utilidades para manejo de fechas con zona horaria de Lima (UTC-5)
 */

/**
 * Obtiene la fecha actual en la zona horaria de Lima (Perú)
 * @returns Date object ajustado a la zona horaria de Lima
 */
export function getPeruDate() {
  const now = new Date();
  // Perú está en UTC-5 (no usa horario de verano)
  const peruOffset = -5 * 60 * 60 * 1000; // -5 horas en milisegundos
  return new Date(now.getTime() + peruOffset);
}

/**
 * Convierte una fecha UTC a la zona horaria de Lima
 * @param {Date|string} utcDate - Fecha en UTC
 * @returns {Date} Date object ajustado a la zona horaria de Lima
 */
export function utcToPeruDate(utcDate) {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  // Perú está en UTC-5
  const peruOffset = -5 * 60 * 60 * 1000; // -5 horas en milisegundos
  return new Date(date.getTime() + peruOffset);
}

/**
 * Formatea una fecha a string de hora en formato HH:mm (zona horaria de Lima)
 * @param {Date|string} date - Fecha a formatear (opcional, por defecto usa la fecha actual de Perú)
 * @returns {string} String con formato HH:mm
 */
export function formatPeruTime(date) {
  const peruDate = date ? utcToPeruDate(date) : getPeruDate();
  
  const hours = peruDate.getUTCHours().toString().padStart(2, '0');
  const minutes = peruDate.getUTCMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Formatea una fecha a string de fecha en formato DD/MM/YYYY (zona horaria de Lima)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} String con formato DD/MM/YYYY
 */
export function formatPeruDate(date) {
  const peruDate = utcToPeruDate(date);
  
  const day = peruDate.getUTCDate().toString().padStart(2, '0');
  const month = (peruDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = peruDate.getUTCFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formatea una fecha a string de fecha y hora en formato DD/MM/YYYY HH:mm (zona horaria de Lima)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} String con formato DD/MM/YYYY HH:mm
 */
export function formatPeruDateTime(date) {
  return `${formatPeruDate(date)} ${formatPeruTime(date)}`;
}

