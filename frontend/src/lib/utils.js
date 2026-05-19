import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx for conditional classes
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format credits with abbreviation
 */
export function formatCredits(amount) {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toString();
}

/**
 * Get initials from name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get star rating display
 */
export function getStarDisplay(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return { full, half, empty };
}
