import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with tailwind-merge for proper class conflict resolution
 * @param {...(string|undefined|null|boolean)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return twMerge(clsx(classes));
}
