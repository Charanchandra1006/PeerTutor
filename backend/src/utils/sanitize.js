const crypto = require('crypto');

/**
 * Escape user input for safe use in MongoDB $regex queries.
 * Prevents ReDoS by stripping all regex special characters.
 * @param {string} str - Raw user input
 * @returns {string} Escaped string safe for $regex
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip HTML tags from a string to prevent XSS.
 * For socket messages and user-generated text rendered in other users' browsers.
 * @param {string} str - Raw input
 * @returns {string} Sanitized string with all HTML tags removed
 */
function stripHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')       // Remove HTML tags
    .replace(/&lt;/gi, '<')         // Decode common entities for re-strip
    .replace(/<[^>]*>/g, '')       // Re-strip after decode
    .replace(/javascript:/gi, '')   // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')     // Remove inline event handlers (onclick=, etc.)
    .trim();
}

/**
 * Timing-safe string comparison for OTP and token verification.
 * Prevents timing attacks that leak character-by-character match info.
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt (CSPRNG) instead of Math.random (PRNG).
 * @returns {string} 6-digit OTP string
 */
function generateSecureOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

module.exports = { escapeRegex, stripHtml, timingSafeEqual, generateSecureOTP };
