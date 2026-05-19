const { z } = require('zod');

const createTutorProfileSchema = z.object({
  subjects: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid subject ID'))
    .min(1, 'At least one subject required')
    .max(10, 'Maximum 10 subjects allowed'),
  bio: z
    .string()
    .min(10, 'Bio must be at least 10 characters')
    .max(500, 'Bio must be at most 500 characters')
    .trim(),
  rate_per_hour: z
    .number()
    .int('Rate must be a whole number')
    .min(1, 'Rate must be at least 1 credit/hour')
    .max(500, 'Rate must be at most 500 credits/hour'),
  availability: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format'),
        end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format'),
      })
    )
    .min(1, 'At least one availability slot required'),
  languages: z.array(z.string().trim()).optional().default(['English']),
  calendly_link: z.string().url().optional().or(z.literal('')),
});

const updateTutorProfileSchema = createTutorProfileSchema.partial();

const updateAvailabilitySchema = z.object({
  availability: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      })
    )
    .min(1, 'At least one slot required'),
});

const searchTutorsSchema = z.object({
  subject: z.string().optional(),
  rating_min: z.coerce.number().min(0).max(5).optional(),
  credits_max: z.coerce.number().int().min(0).optional(),
  available_day: z.coerce.number().int().min(0).max(6).optional(),
  language: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['rating', 'rate', 'sessions', 'newest']).default('rating'),
});

const createSubjectSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  code: z.string().min(2).max(20).trim().toUpperCase(),
  department: z.string().min(2).max(50).trim(),
});

const uploadPortfolioSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  type: z.enum(['pdf', 'image', 'link']).default('pdf'),
});

const uploadResourceSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(500).optional(),
  subject_id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  credit_cost: z.number().int().min(0).max(10).default(0),
});

module.exports = {
  createTutorProfileSchema,
  updateTutorProfileSchema,
  updateAvailabilitySchema,
  searchTutorsSchema,
  createSubjectSchema,
  uploadPortfolioSchema,
  uploadResourceSchema,
};
