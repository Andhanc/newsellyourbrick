/**
 * Merges class names. Filters out falsy values.
 * @param {...(string|undefined|null|boolean)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
