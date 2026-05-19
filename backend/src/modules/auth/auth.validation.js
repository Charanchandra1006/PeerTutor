const { z } = require('zod');

/**
 * Password validation regex:
 * Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must include uppercase, lowercase, number and special character'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  role: z.enum(['student', 'tutor', 'both']).default('student'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(passwordRegex, 'Password must include uppercase, lowercase, number and special character'),
});

const resendOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(passwordRegex, 'Password must include uppercase, lowercase, number and special character'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  year: z.number().int().min(1).max(5).optional(),
  branch: z.string().trim().optional(),
  learning_style: z.enum(['visual', 'auditory', 'reading', 'kinesthetic', '']).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  changePasswordSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  paginationSchema,
  idParamSchema,
};
