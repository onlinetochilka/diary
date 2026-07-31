/**
 * utils/plural.js
 * ────────────────────────────────────────────────────────────────────────────
 * Единственная в проекте утилита склонения существительных по числу.
 *
 * Поддерживает две сигнатуры:
 *   getPlural(5, ['урок', 'урока', 'уроков'])           → 'уроков'
 *   getPlural(5, 'урок', 'урока', 'уроков')             → 'уроков'
 */
export const getPlural = (num, one, few, many) => {
  // Если второй аргумент — массив, разворачиваем его
  if (Array.isArray(one)) {
    [one, few, many] = one;
  }
  const n  = Math.abs(num) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1  && n1 < 5) return few;
  if (n1 === 1)           return one;
  return many;
};
